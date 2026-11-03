// 사건·선택지·기록 규칙의 조건 평가
import type { Conditions, Content, LifeState, StatKey } from './types';
import { computeInfluence } from './influence';

function matchList(list: string[] | undefined, value: string): boolean {
  if (!list || list.length === 0) return true;
  return list.includes('*') || list.includes(value);
}

export function checkConditions(content: Content, s: LifeState, c: Conditions | undefined): boolean {
  if (!c) return true;
  if (!matchList(c.eras, s.birth.eraId)) return false;
  if (!matchList(c.statuses, s.statusId)) return false;
  if (c.notStatuses && c.notStatuses.includes(s.statusId)) return false;
  if (!matchList(c.regions, s.birth.regionId)) return false;
  if (c.sex && c.sex !== '*' && c.sex !== s.birth.sex) return false;
  if (c.ageMin !== undefined && s.age < c.ageMin) return false;
  if (c.ageMax !== undefined && s.age > c.ageMax) return false;
  if (c.yearMin !== undefined && s.year < c.yearMin) return false;
  if (c.yearMax !== undefined && s.year > c.yearMax) return false;
  if (c.flags && !c.flags.every((f) => s.flags.includes(f))) return false;
  if (c.notFlags && c.notFlags.some((f) => s.flags.includes(f))) return false;
  if (c.memory && !c.memory.every((m) => s.memory.includes(m))) return false;
  if (c.regressed !== undefined && c.regressed !== s.lifeIndex > 0) return false;
  if (c.statMin) {
    for (const [k, v] of Object.entries(c.statMin)) if (s.stats[k as StatKey] < (v as number)) return false;
  }
  if (c.statMax) {
    for (const [k, v] of Object.entries(c.statMax)) if (s.stats[k as StatKey] > (v as number)) return false;
  }
  if (c.married !== undefined && c.married !== s.family.married) return false;
  if (c.childrenMin !== undefined && s.family.children < c.childrenMin) return false;
  // 현대 지식은 회귀한 인생에서만 열린다 (PRD 7-2)
  if (c.knowledge && c.knowledge.length > 0 && s.lifeIndex === 0) return false;
  if (c.influenceMin !== undefined && computeInfluence(content, s) < c.influenceMin) return false;
  return true;
}
