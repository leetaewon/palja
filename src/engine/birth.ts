// 출생 결정 (PRD 4-1). 시점 → 연도 → 지역 → 신분 → 성별 → 가족·이름·능력치
// 출생은 시드에서 갈라진 전용 RNG(seed:birth)만 쓴다. 그래서 회귀해도 같은 출생이 나온다.
import { makeRng, pick, randInt, weighted, type RngHolder } from './rng';
import type { Birth, Content, EraDef, Sex, StatKey, Stats, StatusDef } from './types';
import { STAT_KEYS } from './types';

export interface BirthOptions {
  /** 시점을 고정 (같은 고을 사람들 시뮬레이션 등) */
  eraId?: string;
  regionId?: string;
  year?: number;
}

export function findEra(content: Content, eraId: string): EraDef {
  const era = content.eras.find((e) => e.id === eraId);
  if (!era) throw new Error(`알 수 없는 시점: ${eraId}`);
  return era;
}

function pickName(content: Content, rng: RngHolder, era: EraDef, status: StatusDef, sex: Sex): { surname: string; givenName: string } {
  const names = content.names[era.id];
  if (!names) throw new Error(`이름 풀이 없음: ${era.id}`);
  const group = names.groups[status.nameGroup];
  if (!group) throw new Error(`이름 묶음이 없음: ${era.id}/${status.nameGroup}`);
  const givenName = pick(rng, sex === 'male' ? group.male : group.female);
  let surname = '';
  if (names.fixedSurname?.[status.nameGroup]) surname = names.fixedSurname[status.nameGroup];
  else if (!names.noSurnameGroups.includes(status.nameGroup)) surname = weighted(rng, names.surnames, (s) => s.weight).name;
  return { surname, givenName };
}

function rollStats(rng: RngHolder, status: StatusDef): Stats {
  const stats = {} as Stats;
  for (const k of STAT_KEYS) {
    const [min, max] = status.start[k as StatKey];
    stats[k] = randInt(rng, min, max);
  }
  return stats;
}

export function wealthGradeOf(wealth: number): number {
  return Math.min(5, Math.max(1, Math.floor(wealth / 20) + 1));
}

export function createBirth(content: Content, seed: string, opts: BirthOptions = {}): Birth {
  const rng = makeRng(`${seed}:birth`);
  // 1. 시점: 균등 무작위
  const era = opts.eraId ? findEra(content, opts.eraId) : pick(rng, content.eras);
  // 2. 출생 연도: 구간에서 균등
  const year = opts.year ?? randInt(rng, era.birthYears[0], era.birthYears[1]);
  const month = randInt(rng, 1, 12);
  // 3·4. 신분을 먼저 뽑고(지역 제한이 있는 신분이 있어서), 지역은 신분이 허용하는 곳에서 가중 추첨
  const regionsAllowed = (st: StatusDef) => (opts.regionId ? !st.regions || st.regions.includes(opts.regionId) : true);
  const status = weighted(rng, era.statuses.filter(regionsAllowed), (s) => s.weight);
  const regionPool = era.regions.filter((r) => (opts.regionId ? r.id === opts.regionId : !status.regions || status.regions.includes(r.id)));
  const region = weighted(rng, regionPool, (r) => r.weight);
  // 5. 성별 50:50
  const sex: Sex = randInt(rng, 0, 1) === 0 ? 'male' : 'female';
  // 6. 가족·이름·능력치
  const stats = rollStats(rng, status);
  const siblings = randInt(rng, 0, 5);
  const { surname, givenName } = pickName(content, rng, era, status, sex);
  return {
    seed,
    eraId: era.id,
    year,
    month,
    regionId: region.id,
    statusId: status.id,
    sex,
    surname,
    givenName,
    family: { siblings, wealthGrade: wealthGradeOf(stats.wealth) },
    stats,
  };
}

/** 이 시점에서 이 신분으로 태어날 확률 (0~1). 출생 공개 화면용 */
export function statusProbability(content: Content, eraId: string, statusId: string): number {
  const era = findEra(content, eraId);
  const total = era.statuses.reduce((s, x) => s + x.weight, 0);
  const st = era.statuses.find((s) => s.id === statusId);
  return st ? st.weight / total : 0;
}
