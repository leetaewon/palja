// 일생 진행 (PRD 5장), 사망 (6장), 회귀 (7장)
// 공개 함수는 상태를 복사해 새 상태를 돌려준다. *Mut 함수는 제자리에서 바꾼다(시뮬레이터용).
import { chance, hashSeed, randInt, rand, shuffle, weighted } from './rng';
import { checkConditions } from './conditions';
import { computeInfluence, findStatus, persuasionChance } from './influence';
import { findEra } from './birth';
import type {
  Birth,
  ChangeScope,
  ChoiceDef,
  ChoiceView,
  Content,
  Effect,
  EventDef,
  KnowledgeDef,
  LifeState,
  LogEntry,
  MindsetDef,
  Outcome,
  StatKey,
} from './types';
import { SCOPE_BY_TIER, STAT_KEYS } from './types';

export const MAX_REGRESSIONS = 3;
/** 이 나이 전에는 마음가짐 선택 없이 자동으로 흐른다 (PRD 5-2) */
export const CHILD_AGE = 10;
export const CHILD_MINDSET = 'child';
export const DEFAULT_MINDSET = 'work';
export const MAX_RANDOM_EVENTS_PER_YEAR = 2;

export interface LifeOptions {
  lifeIndex?: number;
  memory?: string[];
}

export function cloneState(s: LifeState): LifeState {
  return structuredClone(s);
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function createLife(content: Content, birth: Birth, opts: LifeOptions = {}): LifeState {
  const lifeIndex = opts.lifeIndex ?? 0;
  findEra(content, birth.eraId);
  return {
    seed: birth.seed,
    birth: structuredClone(birth),
    lifeIndex,
    memory: [...(opts.memory ?? [])],
    year: birth.year,
    age: 0,
    statusId: birth.statusId,
    stats: { ...birth.stats },
    flags: [],
    family: { married: false, children: 0, childrenDied: 0, siblings: birth.family.siblings, parentsAlive: 2 },
    protections: {},
    mindset: CHILD_MINDSET,
    done: [],
    experienced: [],
    knowledgeUsed: [],
    queue: [],
    phase: 'start',
    pending: null,
    log: [],
    changes: [],
    recordCandidates: [],
    statusHistory: [],
    dead: null,
    // 회귀마다 운의 흐름은 달라진다. 출생은 같다 (docs/04-decisions.md)
    rng: hashSeed(`${birth.seed}:life:${lifeIndex}`),
  };
}

// ───────────── 색인 (콘텐츠당 한 번) ─────────────

const eventIndex = new WeakMap<Content, Map<string, EventDef>>();
export function getEvent(content: Content, id: string): EventDef {
  let idx = eventIndex.get(content);
  if (!idx) {
    idx = new Map(content.events.map((e) => [e.id, e]));
    eventIndex.set(content, idx);
  }
  const ev = idx.get(id);
  if (!ev) throw new Error(`알 수 없는 사건: ${id}`);
  return ev;
}

function getMindset(content: Content, id: string): MindsetDef {
  const m = content.mindsets.find((x) => x.id === id);
  if (!m) throw new Error(`알 수 없는 마음가짐: ${id}`);
  return m;
}

// ───────────── 문장 ─────────────

export function renderText(content: Content, s: LifeState, text: string): string {
  const era = findEra(content, s.birth.eraId);
  const status = findStatus(content, s.birth.eraId, s.statusId);
  const region = era.regions.find((r) => r.id === s.birth.regionId);
  return text
    .replaceAll('{statusName}', status.name)
    .replaceAll('{regionName}', region?.name ?? '')
    .replaceAll('{name}', `${s.birth.surname}${s.birth.givenName}`);
}

function log(content: Content, s: LifeState, kind: LogEntry['kind'], text: string, month?: number, eventId?: string) {
  if (!text) return;
  s.log.push({ year: s.year, age: s.age, month, text: renderText(content, s, text), eventId, kind });
}

// ───────────── 효과 ─────────────

function addFlag(s: LifeState, f: string) {
  if (!s.flags.includes(f)) s.flags.push(f);
}

function eventDeathChance(content: Content, s: LifeState, cause: string, base: number): number {
  const protect = s.protections[cause] ?? 1;
  const mind = getMindset(content, s.mindset).eventDeath?.[cause] ?? 1;
  return base * protect * mind;
}

function die(s: LifeState, cause: string, month: number, eventId?: string) {
  s.dead = { year: s.year, month, age: s.age, cause, eventId };
  s.queue = [];
  s.pending = null;
}

export function applyEffects(content: Content, s: LifeState, effects: Effect[] | undefined, month: number, eventId?: string) {
  if (!effects) return;
  for (const ef of effects) {
    if (s.dead) return;
    if (ef.type === 'death') {
      if (chance(s, eventDeathChance(content, s, ef.cause, ef.chance ?? 1))) die(s, ef.cause, month, eventId);
      continue;
    }
    if (ef.chance !== undefined && !chance(s, ef.chance)) continue;
    switch (ef.type) {
      case 'stat':
        s.stats[ef.stat] = clamp(s.stats[ef.stat] + ef.delta);
        break;
      case 'flag':
        if (ef.set) addFlag(s, ef.set);
        if (ef.unset) s.flags = s.flags.filter((f) => f !== ef.unset);
        break;
      case 'status':
        if (ef.to !== s.statusId) {
          findStatus(content, s.birth.eraId, ef.to);
          s.statusHistory.push({ year: s.year, from: s.statusId, to: ef.to });
          s.statusId = ef.to;
        }
        break;
      case 'record':
        s.recordCandidates.push({ level: ef.level, templateId: ef.templateId, year: s.year });
        break;
      case 'family':
        applyFamily(s, ef.event);
        break;
      case 'change':
        addChange(content, s, ef.scope, ef.text);
        break;
      case 'protect':
        s.protections[ef.cause] = Math.min(s.protections[ef.cause] ?? 1, ef.factor);
        break;
      case 'knowledge':
        useKnowledge(content, s, ef.id, ef.attempt, month);
        break;
      case 'log':
        log(content, s, 'event', ef.text, month, eventId);
        break;
    }
  }
}

function applyFamily(s: LifeState, event: string) {
  const f = s.family;
  switch (event) {
    case 'married':
      f.married = true;
      break;
    case 'child-born':
      f.children += 1;
      break;
    case 'child-died':
      if (f.children > 0) {
        f.children -= 1;
        f.childrenDied += 1;
      }
      break;
    case 'spouse-died':
      f.married = false;
      addFlag(s, 'widowed');
      break;
    case 'parent-died':
      f.parentsAlive = Math.max(0, f.parentsAlive - 1);
      break;
    case 'sibling-died':
      f.siblings = Math.max(0, f.siblings - 1);
      break;
  }
}

/** 이번 생에서 바꾼 것. 같은 문장은 한 번만 남긴다 */
function addChange(content: Content, s: LifeState, scope: ChangeScope, text: string) {
  if (!text) return;
  const t = renderText(content, s, text);
  if (s.changes.some((c) => c.text === t)) return;
  s.changes.push({ year: s.year, scope, text: t });
}

function rollOutcome(content: Content, s: LifeState, outcomes: Outcome[] | undefined, month: number, eventId: string) {
  if (!outcomes || outcomes.length === 0) return;
  const o = weighted(s, outcomes, (x) => x.weight);
  log(content, s, 'event', o.text, month, eventId);
  applyEffects(content, s, o.effects, month, eventId);
}

// ───────────── 현대 지식 (PRD 7-3, 7-4) ─────────────

/** 이 시점에 맞춘 현대 지식 (byEra 덮어쓰기 적용) */
export function resolveKnowledge(content: Content, id: string, eraId: string): KnowledgeDef {
  const base = content.knowledge.actions.find((x) => x.id === id);
  if (!base) throw new Error(`알 수 없는 현대 지식: ${id}`);
  const o = base.byEra?.[eraId];
  if (!o) return base;
  const byInfluence: KnowledgeDef['byInfluence'] = { ...base.byInfluence };
  for (const [tier, def] of Object.entries(o.byInfluence ?? {})) {
    const t = tier as keyof KnowledgeDef['byInfluence'];
    byInfluence[t] = { ...base.byInfluence[t], ...def };
  }
  return { ...base, name: o.name ?? base.name, intro: o.intro ?? base.intro, byInfluence };
}

export function useKnowledge(content: Content, s: LifeState, id: string, attempt: number | undefined, month: number) {
  const k = resolveKnowledge(content, id, s.birth.eraId);
  const influence = computeInfluence(content, s);
  const target = Math.min(4, Math.max(1, attempt ?? influence));
  log(content, s, 'knowledge', k.intro, month);

  // 1단계(가족)는 누구나 된다
  const t1 = k.byInfluence['1'];
  if (t1) {
    log(content, s, 'knowledge', t1.text ?? t1.successText ?? '', month);
    applyEffects(content, s, t1.effects, month);
    addChange(content, s, 'family', t1.text ?? t1.successText ?? '');
  }
  for (const cause of k.helpsAgainst) {
    s.protections[cause] = Math.min(s.protections[cause] ?? 1, k.protectFactor ?? 0.5);
  }

  for (let tier = 2; tier <= target; tier++) {
    if (s.dead) break;
    const def = k.byInfluence[String(tier) as '2' | '3' | '4'];
    if (!def) continue;
    const p = persuasionChance(content, s, tier);
    if (chance(s, p)) {
      const text = def.successText ?? def.text ?? '';
      log(content, s, 'knowledge', text, month);
      applyEffects(content, s, def.effects, month);
      addChange(content, s, SCOPE_BY_TIER[tier - 1], text);
      if (def.record) s.recordCandidates.push({ level: def.record.level, templateId: def.record.templateId, year: s.year });
    } else {
      const fail = def.failText ?? content.knowledge.defaults.failText[String(tier) as '2' | '3' | '4'];
      log(content, s, 'knowledge', fail, month);
      if (tier > influence) {
        // 신분이 닿지 않는 범위를 시도하면 의심받는다
        log(content, s, 'knowledge', content.knowledge.defaults.suspicionText, month);
        s.stats.trust = clamp(s.stats.trust - 5);
      }
      break;
    }
  }
  if (!s.knowledgeUsed.includes(id)) s.knowledgeUsed.push(id);
}

// ───────────── 사건 ─────────────

function choiceTag(c: ChoiceDef): ChoiceView['tag'] {
  if (c.requires?.knowledge && c.requires.knowledge.length > 0) return 'knowledge';
  if (c.requires?.memory && c.requires.memory.length > 0) return 'memory';
  return 'normal';
}

export function availableChoices(content: Content, s: LifeState, ev: EventDef): ChoiceDef[] {
  return (ev.choices ?? []).filter((c) => checkConditions(content, s, c.requires));
}

function collectEvents(content: Content, s: LifeState): LifeState['queue'] {
  const picked: LifeState['queue'] = [];
  const randoms: EventDef[] = [];
  for (const ev of content.events) {
    if (!ev.repeatable && s.done.includes(ev.id)) continue;
    const fixedYear = ev.when?.year;
    if (fixedYear !== undefined) {
      if (fixedYear !== s.year) continue;
      if (checkConditions(content, s, ev.conditions)) {
        if (!chance(s, ev.chance ?? 1)) continue;
        picked.push({ id: ev.id, month: ev.when?.month ?? randInt(s, 1, 12) });
      } else if (eraMatches(ev, s)) {
        // 같은 해 앞선 사건이 플래그·신분을 바꾸면 조건이 맞을 수 있다.
        // 그 달에 조건을 다시 보고, 맞으면 그때 확률을 굴린다.
        picked.push({ id: ev.id, month: ev.when?.month ?? randInt(s, 1, 12), deferred: true });
      }
    } else if (checkConditions(content, s, ev.conditions)) {
      randoms.push(ev);
    }
  }
  let count = 0;
  for (const ev of shuffle(s, randoms)) {
    if (count >= MAX_RANDOM_EVENTS_PER_YEAR) break;
    if (chance(s, ev.chance ?? 0)) {
      picked.push({ id: ev.id, month: ev.when?.month ?? randInt(s, 1, 12) });
      count++;
    }
  }
  // 월 순으로. 같은 달이면 콘텐츠 순서
  const order = new Map(content.events.map((e, i) => [e.id, i]));
  picked.sort((a, b) => a.month - b.month || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return picked;
}

function eraMatches(ev: EventDef, s: LifeState): boolean {
  const eras = ev.conditions?.eras;
  return !eras || eras.length === 0 || eras.includes('*') || eras.includes(s.birth.eraId);
}

function runEvent(content: Content, s: LifeState, ev: EventDef, month: number) {
  s.done.push(ev.id);
  if (ev.memorable) {
    const key = ev.memoryKey ?? ev.id;
    if (!s.experienced.includes(key)) s.experienced.push(key);
  }
  log(content, s, 'event', ev.text, month, ev.id);
  applyEffects(content, s, ev.effects, month, ev.id);
  if (s.dead) return;
  rollOutcome(content, s, ev.outcomes, month, ev.id);
  if (s.dead) return;
  if (!ev.choices || ev.choices.length === 0) return;
  const avail = availableChoices(content, s, ev);
  if (avail.length === 0) return;
  const special = avail.some((c) => choiceTag(c) !== 'normal');
  if (ev.pauseOnlySpecial && !special) {
    applyChoice(content, s, ev, avail[0], month);
    return;
  }
  s.pending = {
    eventId: ev.id,
    text: renderText(content, s, ev.text),
    choices: avail.map((c) => ({ id: c.id, label: renderText(content, s, c.label), tag: choiceTag(c) })),
  };
  s.queue.unshift({ id: `@month:${month}`, month });
}

function applyChoice(content: Content, s: LifeState, ev: EventDef, c: ChoiceDef, month: number) {
  if (c.result) log(content, s, 'choice-result', c.result, month, ev.id);
  applyEffects(content, s, c.effects, month, ev.id);
  if (s.dead) return;
  rollOutcome(content, s, c.outcomes, month, ev.id);
}

// ───────────── 한 해 ─────────────

function applyMindset(content: Content, s: LifeState) {
  const m = getMindset(content, s.mindset);
  const mult = m.byStatus?.[s.statusId] ?? {};
  for (const k of STAT_KEYS) {
    const d = m.effects[k as StatKey];
    if (!d) continue;
    s.stats[k] = clamp(s.stats[k] + Math.round(d * (mult[k as StatKey] ?? 1)));
  }
}

/** 이 나이의 건강 기준선 */
export function healthBaseline(content: Content, age: number): number {
  const a = content.mortality.aging;
  const drop = Math.max(0, age - a.from) * a.perYear + Math.max(0, age - a.from2) * (a.perYear2 - a.perYear);
  return Math.max(0, a.baseline - drop);
}

function applyAging(content: Content, s: LifeState) {
  const a = content.mortality.aging;
  const target = healthBaseline(content, s.age);
  s.stats.health = clamp(Math.round(s.stats.health + (target - s.stats.health) * a.recovery));
}

/** 건강 보정 배수: 건강 50에서 1 */
export function healthModifier(content: Content, health: number): number {
  const { low, high } = content.mortality.health;
  if (health >= 50) return 1 + ((high - 1) * (health - 50)) / 50;
  return 1 + ((low - 1) * (50 - health)) / 50;
}

/** 이번 해 자연 사망 위험 (사건 사망 제외) */
export function naturalHazard(content: Content, s: LifeState): number {
  const m = content.mortality;
  const band = m.ageBands.find((b) => s.age >= b.min && s.age <= b.max) ?? m.ageBands[m.ageBands.length - 1];
  const status = findStatus(content, s.birth.eraId, s.statusId);
  const era = findEra(content, s.birth.eraId);
  const mind = getMindset(content, s.mindset).hazard ?? 1;
  return band.hazard * status.mortality * era.mortality.eraModifier * healthModifier(content, s.stats.health) * mind;
}

function naturalDeathCheck(content: Content, s: LifeState) {
  const m = content.mortality;
  const month = randInt(s, 1, 12);
  if (s.age >= m.maxAge) {
    die(s, 'old-age', month);
    return;
  }
  if (!chance(s, naturalHazard(content, s))) return;
  const band = m.ageBands.find((b) => s.age >= b.min && s.age <= b.max) ?? m.ageBands[m.ageBands.length - 1];
  const causes = Object.entries(band.causes);
  const [cause] = weighted(s, causes, ([, w]) => w);
  // 현대 지식·대비로 막은 사인이면 그 비율만큼 살아남는다
  const protect = s.protections[cause] ?? 1;
  if (protect < 1 && rand(s) >= protect) return;
  die(s, cause, month);
}

function continueYear(content: Content, s: LifeState) {
  while (s.queue.length > 0) {
    const item = s.queue.shift() as LifeState['queue'][number];
    if (item.id.startsWith('@')) continue; // 갈림길 자리표시
    const ev = getEvent(content, item.id);
    if (!ev.repeatable && s.done.includes(ev.id)) continue;
    // 같은 해 앞선 사건으로 상황이 바뀌었을 수 있어 다시 확인한다
    if (!checkConditions(content, s, ev.conditions)) continue;
    if (item.deferred && !chance(s, ev.chance ?? 1)) continue;
    runEvent(content, s, ev, item.month);
    if (s.dead || s.pending) return;
  }
  naturalDeathCheck(content, s);
  if (s.dead) {
    s.phase = 'start';
    return;
  }
  s.year += 1;
  s.age += 1;
  s.phase = 'start';
}

/** 다음 한 해를 진행한다. 갈림길이 나오면 pending을 채우고 멈춘다. */
export function advanceYearMut(content: Content, s: LifeState, mindset?: string): void {
  if (s.dead) throw new Error('이미 끝난 인생');
  if (s.pending) throw new Error('갈림길 선택이 먼저');
  if (s.age < CHILD_AGE) s.mindset = CHILD_MINDSET;
  else if (mindset) {
    const m = getMindset(content, mindset);
    if (!m.selectable) throw new Error(`고를 수 없는 마음가짐: ${mindset}`);
    s.mindset = mindset;
  } else if (s.mindset === CHILD_MINDSET) s.mindset = DEFAULT_MINDSET;
  applyMindset(content, s);
  applyAging(content, s);
  s.queue = collectEvents(content, s);
  s.phase = 'events';
  continueYear(content, s);
}

export function resolveChoiceMut(content: Content, s: LifeState, choiceId: string): void {
  const p = s.pending;
  if (!p) throw new Error('고를 갈림길이 없음');
  if (!p.choices.some((c) => c.id === choiceId)) throw new Error(`고를 수 없는 선택지: ${choiceId}`);
  const ev = getEvent(content, p.eventId);
  const c = (ev.choices ?? []).find((x) => x.id === choiceId) as ChoiceDef;
  const marker = s.queue[0];
  const month = marker?.id.startsWith('@') ? marker.month : 1;
  s.pending = null;
  applyChoice(content, s, ev, c, month);
  if (s.dead) return;
  continueYear(content, s);
}

export function advanceYear(content: Content, s: LifeState, mindset?: string): LifeState {
  const n = cloneState(s);
  advanceYearMut(content, n, mindset);
  return n;
}

export function resolveChoice(content: Content, s: LifeState, choiceId: string): LifeState {
  const n = cloneState(s);
  resolveChoiceMut(content, n, choiceId);
  return n;
}

// ───────────── 회귀 ─────────────

export function regressionsLeft(s: LifeState): number {
  return Math.max(0, MAX_REGRESSIONS - s.lifeIndex);
}

export function canRegress(s: LifeState): boolean {
  return s.dead !== null && regressionsLeft(s) > 0;
}

/** 팔자 고치기: 같은 출생으로 돌아가고, 겪은 사건을 기억으로 가져간다. */
export function regress(content: Content, s: LifeState): LifeState {
  if (!s.dead) throw new Error('아직 살아 있는 인생은 회귀할 수 없음');
  if (!canRegress(s)) throw new Error('팔자 고치기를 모두 썼음');
  const memory = [...s.memory];
  for (const m of s.experienced) if (!memory.includes(m)) memory.push(m);
  return createLife(content, s.birth, { lifeIndex: s.lifeIndex + 1, memory });
}
