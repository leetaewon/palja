// 콘텐츠 스키마 검증 (docs/03-design/content-schema.md)
// 구조 검사 + 서로 가리키는 id(근거, 기록 템플릿, 기억, 지식, 신분, 지역, 사인)가 실제로 있는지 검사한다.
import type { Conditions, Content, Effect, EventDef, KnowledgeDef, Outcome } from '../engine/types';
import { resolveKnowledge } from '../engine/life';
import { RECORD_LEVELS, STAT_KEYS } from '../engine/types';

type Obj = Record<string, unknown>;

class Checker {
  errors: string[] = [];
  err(path: string, msg: string) {
    this.errors.push(`${path}: ${msg}`);
  }
  obj(v: unknown, path: string): v is Obj {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      this.err(path, '객체여야 함');
      return false;
    }
    return true;
  }
  arr(v: unknown, path: string): v is unknown[] {
    if (!Array.isArray(v)) {
      this.err(path, '배열이어야 함');
      return false;
    }
    return true;
  }
  str(v: unknown, path: string, opts: { optional?: boolean; nonEmpty?: boolean } = {}): boolean {
    if (v === undefined && opts.optional) return true;
    if (typeof v !== 'string') {
      this.err(path, '문자열이어야 함');
      return false;
    }
    if (opts.nonEmpty !== false && v.trim() === '') {
      this.err(path, '빈 문자열');
      return false;
    }
    return true;
  }
  num(v: unknown, path: string, opts: { optional?: boolean; min?: number; max?: number } = {}): boolean {
    if (v === undefined && opts.optional) return true;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      this.err(path, '숫자여야 함');
      return false;
    }
    if (opts.min !== undefined && v < opts.min) this.err(path, `${opts.min} 이상이어야 함`);
    if (opts.max !== undefined && v > opts.max) this.err(path, `${opts.max} 이하여야 함`);
    return true;
  }
  strArr(v: unknown, path: string, optional = true): boolean {
    if (v === undefined && optional) return true;
    if (!this.arr(v, path)) return false;
    v.forEach((x, i) => this.str(x, `${path}[${i}]`));
    return true;
  }
  keys(o: Obj, allowed: string[], path: string) {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) this.err(path, `알 수 없는 필드 "${k}"`);
  }
}

const CONFIDENCE = ['confirmed', 'estimated', 'adapted'];
const SCOPES = ['family', 'village', 'county', 'nation'];
const FAMILY_EVENTS = ['married', 'child-born', 'child-died', 'spouse-died', 'parent-died', 'sibling-died'];
const CONDITION_KEYS = [
  'eras', 'statuses', 'notStatuses', 'regions', 'sex', 'ageMin', 'ageMax', 'yearMin', 'yearMax', 'flags', 'notFlags',
  'memory', 'regressed', 'statMin', 'statMax', 'married', 'childrenMin', 'knowledge', 'influenceMin',
];

/** 금지어: 문체 가이드 3장·5장 (자살·비하 호칭 등) */
const BANNED_WORDS = ['자살', '자결', '자해', '왜놈', '쪽바리', '왜구놈', '노예', '천연두', '콜레라'];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateContent(raw: unknown): ValidationResult {
  const c = new Checker();
  if (!c.obj(raw, 'content')) return { ok: false, errors: c.errors };
  const content = raw as unknown as Content;

  // ── 근거
  const sourceIds = new Set<string>();
  if (c.arr(content.sources, 'sources')) {
    content.sources.forEach((s, i) => {
      const p = `sources[${i}]`;
      if (!c.obj(s, p)) return;
      c.keys(s as unknown as Obj, ['id', 'title', 'summary', 'confidence', 'doc'], p);
      c.str(s.id, `${p}.id`);
      c.str(s.title, `${p}.title`);
      c.str(s.summary, `${p}.summary`);
      c.str(s.doc, `${p}.doc`);
      if (!CONFIDENCE.includes(s.confidence)) c.err(`${p}.confidence`, `confirmed/estimated/adapted 중 하나`);
      if (sourceIds.has(s.id)) c.err(p, `중복 id ${s.id}`);
      sourceIds.add(s.id);
    });
  }
  const checkSourceRefs = (refs: unknown, p: string) => {
    if (!c.strArr(refs, p, false)) return;
    for (const r of refs as string[]) if (!sourceIds.has(r)) c.err(p, `없는 근거 "${r}"`);
  };

  // ── 사망 모델
  const causeIds = new Set<string>();
  const m = content.mortality;
  if (c.obj(m, 'mortality')) {
    c.num(m.maxAge, 'mortality.maxAge', { min: 50 });
    if (c.arr(m.causes, 'mortality.causes')) {
      m.causes.forEach((x, i) => {
        c.str(x.id, `mortality.causes[${i}].id`);
        c.str(x.name, `mortality.causes[${i}].name`);
        causeIds.add(x.id);
      });
    }
    if (!causeIds.has('old-age')) c.err('mortality.causes', '"old-age" 사인이 필요함');
    if (c.arr(m.ageBands, 'mortality.ageBands')) {
      let expect = 0;
      m.ageBands.forEach((b, i) => {
        const p = `mortality.ageBands[${i}]`;
        c.num(b.min, `${p}.min`);
        c.num(b.max, `${p}.max`);
        c.num(b.hazard, `${p}.hazard`, { min: 0, max: 1 });
        if (b.min !== expect) c.err(p, `나이 구간이 이어지지 않음 (기대 ${expect})`);
        expect = b.max + 1;
        if (c.obj(b.causes, `${p}.causes`)) {
          for (const [k, w] of Object.entries(b.causes)) {
            if (!causeIds.has(k)) c.err(`${p}.causes`, `없는 사인 "${k}"`);
            c.num(w, `${p}.causes.${k}`, { min: 0 });
          }
        }
      });
      if (expect <= m.maxAge) c.err('mortality.ageBands', `maxAge(${m.maxAge})까지 덮어야 함`);
    }
    if (c.obj(m.health, 'mortality.health')) {
      c.num(m.health.low, 'mortality.health.low', { min: 1 });
      c.num(m.health.high, 'mortality.health.high', { min: 0, max: 1 });
    }
    if (c.obj(m.aging, 'mortality.aging')) {
      for (const k of ['baseline', 'recovery', 'from', 'perYear', 'from2', 'perYear2'] as const) c.num(m.aging[k], `mortality.aging.${k}`, { min: 0 });
    }
  }

  // ── 시점
  const eraIds = new Set<string>();
  const statusIds = new Set<string>();
  const regionIds = new Set<string>();
  const nameGroups = new Map<string, Set<string>>();
  if (c.arr(content.eras, 'eras')) {
    content.eras.forEach((e, i) => {
      const p = `eras[${i}]`;
      if (!c.obj(e, p)) return;
      c.keys(e as unknown as Obj, ['id', 'title', 'birthYears', 'regions', 'statuses', 'mortality', 'reigns', 'sourceRefs'], p);
      c.str(e.id, `${p}.id`);
      eraIds.add(e.id);
      c.str(e.title, `${p}.title`);
      if (!Array.isArray(e.birthYears) || e.birthYears.length !== 2 || e.birthYears[0] > e.birthYears[1]) c.err(`${p}.birthYears`, '[시작, 끝] 형식');
      checkSourceRefs(e.sourceRefs, `${p}.sourceRefs`);
      c.num(e.mortality?.eraModifier, `${p}.mortality.eraModifier`, { min: 0 });
      const eraRegions = new Set<string>();
      if (c.arr(e.regions, `${p}.regions`)) {
        e.regions.forEach((r, j) => {
          c.str(r.id, `${p}.regions[${j}].id`);
          c.str(r.name, `${p}.regions[${j}].name`);
          c.num(r.weight, `${p}.regions[${j}].weight`, { min: 0 });
          eraRegions.add(r.id);
          regionIds.add(r.id);
        });
      }
      if (c.arr(e.statuses, `${p}.statuses`)) {
        let total = 0;
        let royal = false;
        const groups = new Set<string>();
        e.statuses.forEach((s, j) => {
          const sp = `${p}.statuses[${j}]`;
          c.keys(s as unknown as Obj, ['id', 'name', 'weight', 'sourceRef', 'recordTerm', 'recordTermFemale', 'nameGroup', 'influenceBase', 'persuasion', 'mortality', 'start', 'regions'], sp);
          c.str(s.id, `${sp}.id`);
          c.str(s.name, `${sp}.name`);
          c.str(s.recordTerm, `${sp}.recordTerm`);
          c.str(s.recordTermFemale, `${sp}.recordTermFemale`, { optional: true });
          c.str(s.nameGroup, `${sp}.nameGroup`);
          groups.add(s.nameGroup);
          c.num(s.weight, `${sp}.weight`, { min: 0 });
          c.num(s.influenceBase, `${sp}.influenceBase`, { min: 1, max: 4 });
          c.num(s.persuasion, `${sp}.persuasion`, { min: 0, max: 2 });
          c.num(s.mortality, `${sp}.mortality`, { min: 0 });
          if (!sourceIds.has(s.sourceRef)) c.err(`${sp}.sourceRef`, `없는 근거 "${s.sourceRef}"`);
          if (c.obj(s.start, `${sp}.start`)) {
            for (const k of STAT_KEYS) {
              const r = s.start[k];
              if (!Array.isArray(r) || r.length !== 2 || r[0] > r[1] || r[0] < 0 || r[1] > 100) c.err(`${sp}.start.${k}`, '[min, max] 0~100');
            }
          }
          if (s.regions) for (const r of s.regions) if (!eraRegions.has(r)) c.err(`${sp}.regions`, `없는 지역 "${r}"`);
          total += s.weight;
          statusIds.add(s.id);
          if (s.id === 'royal') {
            royal = true;
            if (s.weight !== 1) c.err(sp, '왕족 weight는 항상 1 (PRD 4-1)');
          }
        });
        if (Math.abs(total - 100) > 1e-6) c.err(`${p}.statuses`, `weight 합이 100이어야 함 (현재 ${total})`);
        if (!royal) c.err(`${p}.statuses`, '왕족(royal)이 있어야 함');
        nameGroups.set(e.id, groups);
      }
      if (c.arr(e.reigns, `${p}.reigns`)) {
        e.reigns.forEach((r, j) => {
          c.str(r.name, `${p}.reigns[${j}].name`);
          c.num(r.accession, `${p}.reigns[${j}].accession`);
          c.num(r.firstYear, `${p}.reigns[${j}].firstYear`);
        });
      }
    });
  }

  // ── 이름
  if (c.obj(content.names, 'names')) {
    for (const eraId of eraIds) {
      const n = content.names[eraId];
      const p = `names.${eraId}`;
      if (!n) {
        c.err('names', `시점 ${eraId}의 이름 풀이 없음`);
        continue;
      }
      if (c.arr(n.surnames, `${p}.surnames`)) n.surnames.forEach((s, i) => {
        c.str(s.name, `${p}.surnames[${i}].name`);
        c.num(s.weight, `${p}.surnames[${i}].weight`, { min: 0 });
      });
      c.strArr(n.noSurnameGroups, `${p}.noSurnameGroups`, false);
      for (const g of nameGroups.get(eraId) ?? []) {
        const group = n.groups?.[g];
        if (!group) {
          c.err(`${p}.groups`, `이름 묶음 "${g}"이 없음`);
          continue;
        }
        for (const sex of ['male', 'female'] as const) {
          if (c.arr(group[sex], `${p}.groups.${g}.${sex}`) && group[sex].length < 5) c.err(`${p}.groups.${g}.${sex}`, '이름이 5개 이상 필요함');
          group[sex]?.forEach((x, i) => c.str(x, `${p}.groups.${g}.${sex}[${i}]`));
        }
      }
    }
  }

  // ── 마음가짐
  const mindsetIds = new Set<string>();
  if (c.arr(content.mindsets, 'mindsets')) {
    content.mindsets.forEach((x, i) => {
      const p = `mindsets[${i}]`;
      c.str(x.id, `${p}.id`);
      c.str(x.name, `${p}.name`);
      if (typeof x.selectable !== 'boolean') c.err(`${p}.selectable`, 'boolean');
      mindsetIds.add(x.id);
      if (c.obj(x.effects, `${p}.effects`)) for (const k of Object.keys(x.effects)) if (!STAT_KEYS.includes(k as never)) c.err(`${p}.effects`, `없는 능력치 ${k}`);
      if (x.eventDeath) for (const k of Object.keys(x.eventDeath)) if (!causeIds.has(k)) c.err(`${p}.eventDeath`, `없는 사인 ${k}`);
      if (x.byStatus) for (const k of Object.keys(x.byStatus)) if (!statusIds.has(k)) c.err(`${p}.byStatus`, `없는 신분 ${k}`);
    });
    for (const need of ['child', 'work', 'study', 'family', 'body', 'hide']) if (!mindsetIds.has(need)) c.err('mindsets', `"${need}"가 필요함`);
  }

  // ── 기록
  const templateIds = new Set<string>();
  if (c.obj(content.records, 'records')) {
    if (c.arr(content.records.templates, 'records.templates')) {
      content.records.templates.forEach((t, i) => {
        const p = `records.templates[${i}]`;
        c.str(t.id, `${p}.id`);
        c.str(t.template, `${p}.template`);
        if (!RECORD_LEVELS.includes(t.level) || (t.level as string) === 'none') c.err(`${p}.level`, 'hojeok/jokbo/munjip/sillok');
        if (templateIds.has(t.id)) c.err(p, `중복 id ${t.id}`);
        templateIds.add(t.id);
        if (c.arr(t.eras, `${p}.eras`)) for (const e of t.eras) if (e !== '*' && !eraIds.has(e)) c.err(`${p}.eras`, `없는 시점 ${e}`);
      });
    }
  }

  // ── 현대 지식 (id만 먼저 모은다)
  const knowledgeIds = new Set<string>();
  if (c.obj(content.knowledge, 'knowledge') && c.arr(content.knowledge.actions, 'knowledge.actions')) {
    content.knowledge.actions.forEach((k) => knowledgeIds.add(k.id));
  }

  // ── 사건 id·기억 키 먼저 모으기
  const eventIds = new Set<string>();
  const memoryKeys = new Set<string>();
  if (c.arr(content.events, 'events')) {
    for (const ev of content.events) {
      if (eventIds.has(ev.id)) c.err('events', `중복 사건 id ${ev.id}`);
      eventIds.add(ev.id);
      if (ev.memorable) memoryKeys.add(ev.memoryKey ?? ev.id);
    }
  }

  const checkText = (t: unknown, p: string) => {
    if (!c.str(t, p)) return;
    for (const w of BANNED_WORDS) if ((t as string).includes(w)) c.err(p, `쓰지 않는 말 "${w}" (writing-guide)`);
  };

  const checkConditions = (condIn: Conditions | undefined, p: string) => {
    if (condIn === undefined) return;
    if (!c.obj(condIn, p)) return;
    const cond = condIn as Conditions;
    c.keys(cond as unknown as Obj, CONDITION_KEYS, p);
    const listIn = (list: string[] | undefined, set: Set<string>, label: string, key: string) => {
      if (list === undefined) return;
      if (!c.strArr(list, `${p}.${key}`)) return;
      for (const x of list) if (x !== '*' && !set.has(x)) c.err(`${p}.${key}`, `없는 ${label} "${x}"`);
    };
    listIn(cond.eras, eraIds, '시점', 'eras');
    listIn(cond.statuses, statusIds, '신분', 'statuses');
    listIn(cond.notStatuses, statusIds, '신분', 'notStatuses');
    listIn(cond.regions, regionIds, '지역', 'regions');
    listIn(cond.memory, memoryKeys, '기억(memorable 사건)', 'memory');
    listIn(cond.knowledge, knowledgeIds, '현대 지식', 'knowledge');
    c.strArr(cond.flags, `${p}.flags`);
    c.strArr(cond.notFlags, `${p}.notFlags`);
    if (cond.sex !== undefined && !['male', 'female', '*'].includes(cond.sex)) c.err(`${p}.sex`, 'male/female/*');
    for (const k of ['ageMin', 'ageMax', 'yearMin', 'yearMax', 'childrenMin'] as const) c.num(cond[k], `${p}.${k}`, { optional: true });
    c.num(cond.influenceMin, `${p}.influenceMin`, { optional: true, min: 1, max: 4 });
    for (const k of ['statMin', 'statMax'] as const) {
      const sm = cond[k];
      if (sm !== undefined && c.obj(sm, `${p}.${k}`)) for (const sk of Object.keys(sm)) if (!STAT_KEYS.includes(sk as never)) c.err(`${p}.${k}`, `없는 능력치 ${sk}`);
    }
    for (const k of ['regressed', 'married'] as const) if (cond[k] !== undefined && typeof cond[k] !== 'boolean') c.err(`${p}.${k}`, 'boolean');
  };

  // 기록 문장의 시점 맞춤: 사건·규칙이 걸리는 시점마다 그 시점용 템플릿이어야 한다
  let effectEras: string[] = [];
  const allEras = () => [...eraIds];
  const expandEras = (eras: string[] | undefined) => (!eras || eras.length === 0 || eras.includes('*') ? allEras() : eras);
  const checkTemplateEras = (templateId: string, eras: string[], p: string) => {
    const tpl = content.records?.templates?.find((t) => t.id === templateId);
    if (!tpl || !Array.isArray(tpl.eras) || tpl.eras.includes('*')) return;
    const missing = eras.filter((e) => !tpl.eras.includes(e));
    if (missing.length > 0) c.err(p, `기록 템플릿 ${templateId}은 시점 ${missing.join(', ')}에 쓸 수 없음 (템플릿 eras: ${tpl.eras.join(', ')})`);
  };
  const checkKnowledgeEras = (id: string, eras: string[], p: string) => {
    for (const era of eras) {
      let k: KnowledgeDef;
      try {
        k = resolveKnowledge(content, id, era);
      } catch {
        return;
      }
      for (const [tier, def] of Object.entries(k.byInfluence)) {
        if (def?.record) checkTemplateEras(def.record.templateId, [era], `${p} → 현대 지식 ${id} ${tier}단계(${era})`);
      }
    }
  };

  const checkEffects = (effects: Effect[] | undefined, p: string) => {
    if (effects === undefined) return;
    if (!c.arr(effects, p)) return;
    effects.forEach((ef, i) => {
      const ep = `${p}[${i}]`;
      if (!c.obj(ef, ep)) return;
      c.num(ef.chance, `${ep}.chance`, { optional: true, min: 0, max: 1 });
      switch (ef.type) {
        case 'stat':
          if (!STAT_KEYS.includes(ef.stat)) c.err(`${ep}.stat`, `없는 능력치 ${ef.stat}`);
          c.num(ef.delta, `${ep}.delta`, { min: -100, max: 100 });
          break;
        case 'flag':
          if (!ef.set && !ef.unset) c.err(ep, 'set 또는 unset');
          break;
        case 'status':
          if (!statusIds.has(ef.to)) c.err(`${ep}.to`, `없는 신분 ${ef.to}`);
          break;
        case 'death':
          if (!causeIds.has(ef.cause)) c.err(`${ep}.cause`, `없는 사인 ${ef.cause}`);
          if (ef.cause === 'suicide') c.err(ep, '자살은 사망 원인에서 뺀다 (PRD 6-1)');
          break;
        case 'record':
          if (!RECORD_LEVELS.includes(ef.level) || (ef.level as string) === 'none') c.err(`${ep}.level`, 'hojeok/jokbo/munjip/sillok');
          if (!templateIds.has(ef.templateId)) c.err(`${ep}.templateId`, `없는 기록 템플릿 ${ef.templateId}`);
          else checkTemplateEras(ef.templateId, effectEras, ep);
          break;
        case 'family':
          if (!FAMILY_EVENTS.includes(ef.event)) c.err(`${ep}.event`, FAMILY_EVENTS.join('/'));
          break;
        case 'change':
          if (!SCOPES.includes(ef.scope)) c.err(`${ep}.scope`, SCOPES.join('/'));
          checkText(ef.text, `${ep}.text`);
          break;
        case 'protect':
          if (!causeIds.has(ef.cause)) c.err(`${ep}.cause`, `없는 사인 ${ef.cause}`);
          c.num(ef.factor, `${ep}.factor`, { min: 0, max: 1 });
          break;
        case 'knowledge':
          if (!knowledgeIds.has(ef.id)) c.err(`${ep}.id`, `없는 현대 지식 ${ef.id}`);
          else checkKnowledgeEras(ef.id, effectEras, ep);
          c.num(ef.attempt, `${ep}.attempt`, { optional: true, min: 1, max: 4 });
          break;
        case 'log':
          checkText(ef.text, `${ep}.text`);
          break;
        default:
          c.err(ep, `알 수 없는 효과 type "${(ef as { type: string }).type}"`);
      }
    });
  };

  const checkOutcomes = (outcomes: Outcome[] | undefined, p: string) => {
    if (outcomes === undefined) return;
    if (!c.arr(outcomes, p) || outcomes.length === 0) return c.err(p, '비어 있음');
    outcomes.forEach((o, i) => {
      c.num(o.weight, `${p}[${i}].weight`, { min: 0 });
      checkText(o.text, `${p}[${i}].text`);
      checkEffects(o.effects, `${p}[${i}].effects`);
    });
  };

  // ── 사건 본문
  if (Array.isArray(content.events)) {
    content.events.forEach((ev: EventDef, i) => {
      const p = `events[${i}](${ev.id})`;
      if (!c.obj(ev, p)) return;
      c.keys(ev as unknown as Obj, ['id', 'kind', 'when', 'conditions', 'chance', 'repeatable', 'text', 'effects', 'outcomes', 'choices', 'pauseOnlySpecial', 'memorable', 'memoryKey', 'sourceRefs', 'confidence'], p);
      c.str(ev.id, `${p}.id`);
      if (!['timeline', 'random', 'choice'].includes(ev.kind)) c.err(`${p}.kind`, 'timeline/random/choice');
      if (ev.kind === 'timeline' && ev.when?.year === undefined) c.err(`${p}.when.year`, 'timeline 사건은 연도가 필요함');
      if (ev.kind === 'random' && ev.chance === undefined) c.err(`${p}.chance`, 'random 사건은 chance가 필요함');
      if (ev.kind === 'choice' && (!ev.choices || ev.choices.length < 2)) c.err(`${p}.choices`, '갈림길은 선택지가 2개 이상 필요함');
      if (ev.when?.month !== undefined) c.num(ev.when.month, `${p}.when.month`, { min: 1, max: 12 });
      c.num(ev.chance, `${p}.chance`, { optional: true, min: 0, max: 1 });
      checkText(ev.text, `${p}.text`);
      checkConditions(ev.conditions, `${p}.conditions`);
      effectEras = expandEras(ev.conditions?.eras);
      if (!ev.conditions?.eras || ev.conditions.eras.length === 0) c.err(`${p}.conditions.eras`, '시점을 적어야 함');
      checkEffects(ev.effects, `${p}.effects`);
      checkOutcomes(ev.outcomes, `${p}.outcomes`);
      if (ev.memoryKey !== undefined && !ev.memorable) c.err(`${p}.memoryKey`, 'memorable 사건에만');
      checkSourceRefs(ev.sourceRefs, `${p}.sourceRefs`);
      if (!CONFIDENCE.includes(ev.confidence)) c.err(`${p}.confidence`, 'confirmed/estimated/adapted');
      if (ev.choices) {
        const ids = new Set<string>();
        let hasDefault = false;
        ev.choices.forEach((ch, j) => {
          const cp = `${p}.choices[${j}](${ch.id})`;
          c.keys(ch as unknown as Obj, ['id', 'label', 'requires', 'effects', 'result', 'outcomes'], cp);
          c.str(ch.id, `${cp}.id`);
          if (ids.has(ch.id)) c.err(cp, '중복 선택지 id');
          ids.add(ch.id);
          checkText(ch.label, `${cp}.label`);
          if (ch.result !== undefined) checkText(ch.result, `${cp}.result`);
          checkConditions(ch.requires, `${cp}.requires`);
          checkEffects(ch.effects, `${cp}.effects`);
          checkOutcomes(ch.outcomes, `${cp}.outcomes`);
          const logsKnowledge = (ch.effects ?? []).some((e) => e.type === 'knowledge');
          if (!ch.result && !ch.outcomes && !logsKnowledge) c.err(cp, 'result, outcomes, knowledge 효과 중 하나가 필요함');
          const r = ch.requires;
          if (!r || Object.keys(r).length === 0) hasDefault = true;
        });
        if (!hasDefault) c.err(`${p}.choices`, '조건 없는 기본 선택지가 하나 이상 필요함');
      }
    });
  }

  // ── 현대 지식 본문
  if (content.knowledge && Array.isArray(content.knowledge.actions)) {
    const d = content.knowledge.defaults;
    if (c.obj(d, 'knowledge.defaults')) {
      for (const t of ['2', '3', '4'] as const) checkText(d.failText?.[t], `knowledge.defaults.failText.${t}`);
      checkText(d.suspicionText, 'knowledge.defaults.suspicionText');
    }
    const seen = new Set<string>();
    content.knowledge.actions.forEach((k, i) => {
      const p = `knowledge.actions[${i}](${k.id})`;
      c.keys(k as unknown as Obj, ['id', 'name', 'category', 'intro', 'helpsAgainst', 'protectFactor', 'byInfluence', 'byEra'], p);
      c.str(k.id, `${p}.id`);
      if (seen.has(k.id)) c.err(p, '중복 id');
      seen.add(k.id);
      c.str(k.name, `${p}.name`);
      c.str(k.category, `${p}.category`);
      checkText(k.intro, `${p}.intro`);
      if (c.strArr(k.helpsAgainst, `${p}.helpsAgainst`, false)) for (const h of k.helpsAgainst) if (!causeIds.has(h)) c.err(`${p}.helpsAgainst`, `없는 사인 ${h}`);
      c.num(k.protectFactor, `${p}.protectFactor`, { optional: true, min: 0, max: 1 });
      if (!c.obj(k.byInfluence, `${p}.byInfluence`)) return;
      if (!k.byInfluence['1']) c.err(`${p}.byInfluence`, '1단계(가족)가 필요함');
      for (const [tier, def] of Object.entries(k.byInfluence)) {
        const tp = `${p}.byInfluence.${tier}`;
        if (!['1', '2', '3', '4'].includes(tier)) c.err(tp, '단계는 1~4');
        if (!def) continue;
        for (const key of ['text', 'successText', 'failText'] as const) if (def[key] !== undefined) checkText(def[key], `${tp}.${key}`);
        checkEffects(def.effects, `${tp}.effects`);
        if (def.record && !templateIds.has(def.record.templateId)) c.err(`${tp}.record`, `없는 기록 템플릿 ${def.record.templateId}`);
      }
      if (k.byEra !== undefined && c.obj(k.byEra, `${p}.byEra`)) {
        for (const [era, o] of Object.entries(k.byEra)) {
          const op = `${p}.byEra.${era}`;
          if (!eraIds.has(era)) c.err(op, `없는 시점 ${era}`);
          if (!c.obj(o, op)) continue;
          c.keys(o as unknown as Obj, ['name', 'intro', 'byInfluence'], op);
          if (o.name !== undefined) c.str(o.name, `${op}.name`);
          if (o.intro !== undefined) checkText(o.intro, `${op}.intro`);
          for (const [tier, def] of Object.entries(o.byInfluence ?? {})) {
            const tp = `${op}.byInfluence.${tier}`;
            if (!['1', '2', '3', '4'].includes(tier)) c.err(tp, '단계는 1~4');
            if (!def) continue;
            for (const key of ['text', 'successText', 'failText'] as const) if (def[key] !== undefined) checkText(def[key], `${tp}.${key}`);
            checkEffects(def.effects, `${tp}.effects`);
            if (def.record && !templateIds.has(def.record.templateId)) c.err(`${tp}.record`, `없는 기록 템플릿 ${def.record.templateId}`);
          }
        }
      }
    });
  }

  // ── 기록 규칙
  if (content.records && Array.isArray(content.records.rules)) {
    content.records.rules.forEach((r, i) => {
      const p = `records.rules[${i}](${r.id})`;
      c.str(r.id, `${p}.id`);
      if (!templateIds.has(r.templateId)) c.err(`${p}.templateId`, `없는 기록 템플릿 ${r.templateId}`);
      const tpl = content.records.templates.find((t) => t.id === r.templateId);
      if (tpl && tpl.level !== r.level) c.err(p, `템플릿 등급(${tpl.level})과 규칙 등급(${r.level})이 다름`);
      if (tpl) checkTemplateEras(r.templateId, expandEras(r.conditions?.eras), p);
      c.num(r.chance, `${p}.chance`, { min: 0, max: 1 });
      checkConditions(r.conditions, `${p}.conditions`);
    });
  }

  return { ok: c.errors.length === 0, errors: c.errors };
}
