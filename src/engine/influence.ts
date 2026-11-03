// 영향력 단계 (PRD 7-4) — "지식이 있어도 신분이 들어주지 않는다"
// 1 가족: 누구나
// 2 마을: 신뢰 또는 재산이 높음
// 3 고을: 양반·향리·관료(신분 기본값 2 이상 또는 관직 플래그) + 신뢰
// 4 나라: 왕족·고위 관료(신분 기본값 3 이상 또는 고위 관직 플래그) + 학식·신뢰
import type { Content, LifeState, StatusDef } from './types';

export const INFLUENCE_RULES = {
  villageTrust: 60,
  villageWealth: 60,
  countyTrust: 50,
  nationTrust: 60,
  nationLearning: 60,
  /** 관직을 얻으면 붙는 플래그 */
  officialFlag: 'official',
  highOfficialFlag: 'high-official',
} as const;

export function findStatus(content: Content, eraId: string, statusId: string): StatusDef {
  const era = content.eras.find((e) => e.id === eraId);
  const st = era?.statuses.find((s) => s.id === statusId);
  if (!st) throw new Error(`알 수 없는 신분: ${eraId}/${statusId}`);
  return st;
}

export function computeInfluence(content: Content, s: Pick<LifeState, 'birth' | 'statusId' | 'stats' | 'flags'>): number {
  const st = findStatus(content, s.birth.eraId, s.statusId);
  const r = INFLUENCE_RULES;
  const { trust, wealth, learning } = s.stats;
  const official = s.flags.includes(r.officialFlag);
  const highOfficial = s.flags.includes(r.highOfficialFlag);
  let level = 1;
  if (trust >= r.villageTrust || wealth >= r.villageWealth) level = 2;
  if ((st.influenceBase >= 2 || official || highOfficial) && trust >= r.countyTrust) level = 3;
  if ((st.influenceBase >= 3 || highOfficial) && learning >= r.nationLearning && trust >= r.nationTrust) level = 4;
  return level;
}

/**
 * 영향력 tier 범위에 지식을 퍼뜨리려 할 때 성공 확률.
 * 자기 영향력보다 높은 범위를 노리면 거의 실패한다.
 */
export function persuasionChance(content: Content, s: Pick<LifeState, 'birth' | 'statusId' | 'stats' | 'flags'>, tier: number): number {
  if (tier <= 1) return 1;
  const influence = computeInfluence(content, s);
  if (tier > influence) return 0.05;
  const st = findStatus(content, s.birth.eraId, s.statusId);
  const base = [1, 1, 0.8, 0.7, 0.6][tier] ?? 0.5;
  const p = (base + (s.stats.trust - 50) / 250) * st.persuasion;
  return Math.min(0.95, Math.max(0.05, p));
}
