// 기록 엔딩 판정 (PRD 8장)
import { chance, hashSeed } from './rng';
import { checkConditions } from './conditions';
import { findEra } from './birth';
import { findStatus } from './influence';
import { regressionsLeft } from './life';
import type { Content, Ending, LifeState, RecordLevel, RecordResult, RecordTemplate, ReignDef } from './types';
import { RECORD_LEVELS } from './types';

export function recordRank(level: RecordLevel): number {
  return RECORD_LEVELS.indexOf(level);
}

/** 연도를 왕의 재위 연도로 (예: 1592 → "선조 25년") */
export function reignLabel(reigns: ReignDef[], year: number): string {
  let cur: ReignDef | undefined;
  for (const r of reigns) if (r.accession <= year) cur = r;
  if (!cur) return `${year}년`;
  if (year < cur.firstYear) return `${cur.name} 즉위년`;
  return `${cur.name} ${year - cur.firstYear + 1}년`;
}

export function recordName(content: Content, s: LifeState): string {
  const { surname, givenName, sex } = s.birth;
  const st = findStatus(content, s.birth.eraId, s.statusId);
  // 양반·중인 집안 여성은 기록에 성씨로만 남는 경우가 많았다
  if (sex === 'female' && surname && st.nameGroup !== 'royal') return `${surname}씨`;
  return `${surname}${givenName}`;
}

export function renderRecord(content: Content, s: LifeState, template: string, eventYear: number): string {
  const era = findEra(content, s.birth.eraId);
  const st = findStatus(content, s.birth.eraId, s.statusId);
  const region = era.regions.find((r) => r.id === s.birth.regionId);
  const death = s.dead;
  const deathYear = death?.year ?? s.year;
  const term = s.birth.sex === 'female' && st.recordTermFemale ? st.recordTermFemale : st.recordTerm;
  return template
    .replaceAll('{name}', recordName(content, s))
    .replaceAll('{givenName}', s.birth.givenName)
    .replaceAll('{surname}', s.birth.surname)
    .replaceAll('{term}', term)
    .replaceAll('{region}', region?.name ?? '')
    .replaceAll('{birthReign}', reignLabel(era.reigns, s.birth.year))
    .replaceAll('{deathReign}', reignLabel(era.reigns, deathYear))
    .replaceAll('{eventReign}', reignLabel(era.reigns, eventYear))
    .replaceAll('{month}', String(death?.month ?? 1))
    .replaceAll('{age}', String(death?.age ?? s.age))
    .replaceAll('{children}', String(s.family.children));
}

/** 기록 템플릿이 이 시점에 쓸 수 있는 문장인가 */
export function templateFitsEra(tpl: RecordTemplate, eraId: string): boolean {
  return tpl.eras.includes('*') || tpl.eras.includes(eraId);
}

/** 남은 기록: 사건으로 얻은 후보 + 규칙 후보 중 가장 높은 것 하나 */
export function judgeRecord(content: Content, s: LifeState): RecordResult {
  const rng = { rng: hashSeed(`${s.seed}:record:${s.lifeIndex}:${s.rng}`) };
  const candidates = [...s.recordCandidates];
  for (const rule of content.records.rules) {
    if (!checkConditions(content, s, rule.conditions)) continue;
    if (!chance(rng, rule.chance)) continue;
    candidates.push({ level: rule.level, templateId: rule.templateId, year: s.dead?.year ?? s.year });
  }
  let best: (typeof candidates)[number] | undefined;
  let bestTpl: RecordTemplate | undefined;
  for (const c of candidates) {
    const tpl = content.records.templates.find((t) => t.id === c.templateId);
    if (!tpl) throw new Error(`기록 템플릿 없음: ${c.templateId}`);
    // 다른 시점의 기록 문장은 쓰지 않는다 (예: 고려 왕족에게 조선의 "선원록")
    if (!templateFitsEra(tpl, s.birth.eraId)) continue;
    if (!best || recordRank(c.level) > recordRank(best.level)) {
      best = c;
      bestTpl = tpl;
    }
  }
  if (!best || !bestTpl) return { level: 'none' };
  const tpl = bestTpl;
  return { level: best.level, templateId: tpl.id, text: renderRecord(content, s, tpl.template, best.year) };
}

export function causeName(content: Content, cause: string): string {
  return content.mortality.causes.find((c) => c.id === cause)?.name ?? cause;
}

export function judgeEnding(content: Content, s: LifeState): Ending {
  if (!s.dead) throw new Error('아직 끝나지 않은 인생');
  return {
    death: s.dead,
    causeName: causeName(content, s.dead.cause),
    record: judgeRecord(content, s),
    changes: [...s.changes],
    regressionsLeft: regressionsLeft(s),
  };
}
