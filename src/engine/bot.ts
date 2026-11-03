// 자동 선택 봇. 시뮬레이터(sim:lives)와 "같은 해 같은 고을의 사람들"(PRD 8-5)에 쓴다.
// 봇의 선택은 인생 RNG와 따로 떨어진 봇 RNG로 정한다.
import { makeRng, pick, rand, type RngHolder } from './rng';
import { createBirth } from './birth';
import { advanceYearMut, CHILD_AGE, createLife, resolveChoiceMut, type LifeOptions } from './life';
import { causeName, judgeRecord } from './ending';
import { findStatus } from './influence';
import type { Birth, Content, LifeState, RecordLevel, Sex } from './types';

export type BotPolicy = 'random' | 'smart';

export interface AutoLiveOptions extends LifeOptions {
  policy?: BotPolicy;
  botSeed?: string;
}

function chooseMindset(content: Content, bot: RngHolder, s: LifeState): string | undefined {
  if (s.age < CHILD_AGE) return undefined;
  const selectable = content.mindsets.filter((m) => m.selectable);
  // 대체로 지난해 마음가짐을 유지하고, 가끔 바꾼다
  if (s.mindset !== 'child' && rand(bot) < 0.75) return s.mindset;
  return pick(bot, selectable).id;
}

function chooseOption(bot: RngHolder, s: LifeState, policy: BotPolicy): string {
  const choices = s.pending?.choices ?? [];
  if (policy === 'smart') {
    const memory = choices.filter((c) => c.tag === 'memory');
    if (memory.length > 0) return pick(bot, memory).id;
    const knowledge = choices.filter((c) => c.tag === 'knowledge');
    if (knowledge.length > 0) return pick(bot, knowledge).id;
  }
  const normal = choices.filter((c) => c.tag === 'normal');
  return pick(bot, normal.length > 0 ? normal : choices).id;
}

/** 태어나서 죽을 때까지 자동으로 산다 */
export function autoLive(content: Content, birth: Birth, opts: AutoLiveOptions = {}): LifeState {
  const s = createLife(content, birth, opts);
  return continueAuto(content, s, opts);
}

export function continueAuto(content: Content, s: LifeState, opts: AutoLiveOptions = {}): LifeState {
  const policy = opts.policy ?? 'random';
  const bot = makeRng(opts.botSeed ?? `${s.seed}:bot:${s.lifeIndex}`);
  let guard = 0;
  while (!s.dead) {
    if (++guard > 10000) throw new Error('autoLive: 끝나지 않는 인생');
    if (s.pending) resolveChoiceMut(content, s, chooseOption(bot, s, policy));
    else advanceYearMut(content, s, chooseMindset(content, bot, s));
  }
  return s;
}

export interface NeighborSummary {
  name: string;
  sex: Sex;
  statusId: string;
  statusName: string;
  ageAtDeath: number;
  deathYear: number;
  cause: string;
  causeName: string;
  recordLevel: RecordLevel;
}

/** 같은 해 같은 고을에 태어난 가상 인물들 (PRD 8-5) */
export function neighbors(content: Content, birth: Birth, count = 3): NeighborSummary[] {
  const out: NeighborSummary[] = [];
  for (let i = 0; i < count; i++) {
    const nb = createBirth(content, `${birth.seed}:neighbor:${i}`, {
      eraId: birth.eraId,
      regionId: birth.regionId,
      year: birth.year,
    });
    const s = autoLive(content, nb);
    const dead = s.dead as NonNullable<LifeState['dead']>;
    out.push({
      name: `${nb.surname}${nb.givenName}`,
      sex: nb.sex,
      statusId: s.statusId,
      statusName: findStatus(content, nb.eraId, s.statusId).name,
      ageAtDeath: dead.age,
      deathYear: dead.year,
      cause: dead.cause,
      causeName: causeName(content, dead.cause),
      recordLevel: judgeRecord(content, s).level,
    });
  }
  return out;
}
