// 엔딩 문장과 "결과 복사" 텍스트
import { findEra, findStatus, reignLabel, type Content, type Ending, type LifeState } from '../../engine';
import { SITE_URL } from '../../config';
import { eraLabelOf } from './eras';
import { fullName, josa, RECORD_LABEL, SCOPE_LABEL } from './text';

/** "1597년 8월, 전란으로 세상을 떠났습니다. 향년 25세." (PRD 8-1, 자연 사망 문장은 UI가 만든다) */
export function deathSentence(ending: Pick<Ending, 'death' | 'causeName'>): string {
  const d = ending.death;
  return `${d.year}년 ${d.month}월, ${josa(ending.causeName, '으로/로')} 세상을 떠났습니다. 향년 ${d.age}세.`;
}

/** "1572년, 경상도 땅의 상민 집안에 딸로 태어났습니다." (PRD 4-2) */
export function birthSentence(content: Content, life: LifeState): string {
  const b = life.birth;
  const era = findEra(content, b.eraId);
  const region = era.regions.find((r) => r.id === b.regionId)?.name ?? '';
  const status = findStatus(content, b.eraId, b.statusId).name;
  const child = b.sex === 'male' ? '아들' : '딸';
  return `${b.year}년, ${region} 땅의 ${status} 집안에 ${josa(child, '으로/로')} 태어났습니다.`;
}

export function reignOf(content: Content, life: LifeState, year: number): string {
  return reignLabel(findEra(content, life.birth.eraId).reigns, year);
}

export function regressionLabel(lifeIndex: number): string {
  return lifeIndex === 0 ? '첫 인생' : `팔자 고치기 ${lifeIndex}회째`;
}

export function resultText(content: Content, life: LifeState, ending: Ending, epitaph: string): string {
  const b = life.birth;
  const lines = [
    `「팔자」 ${eraLabelOf(content, b.eraId)} · ${regressionLabel(life.lifeIndex)}`,
    `${fullName(b)} — ${birthSentence(content, life)}`,
    deathSentence(ending),
    ending.record.text ? `남은 기록(${RECORD_LABEL[ending.record.level]}): ${ending.record.text}` : '남은 기록: 어디에도 기록되지 않았습니다.',
  ];
  if (ending.changes.length > 0) {
    lines.push(`이번 생에서 바꾼 것: ${ending.changes.map((c) => `[${SCOPE_LABEL[c.scope]}] ${c.text}`).join(' / ')}`);
  }
  if (epitaph.trim()) lines.push(`묘비: ${epitaph.trim()}`);
  lines.push(`시드 ${b.seed}`, SITE_URL);
  return lines.join('\n');
}
