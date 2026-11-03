// 시점 슬롯: 콘텐츠가 있는 시점(content.eras)은 자동으로 열리고,
// PRD 4-1의 계획된 시점 중 아직 콘텐츠가 없는 것만 "준비 중"으로 보인다.
// 아래 목록은 "계획"일 뿐, 실제로 열리는 시점은 항상 content.eras에서 읽는다.
import type { Content, EraDef } from '../../engine';

interface PlannedEra {
  label: string;
  title: string;
  birthYears: [number, number];
}

/** PRD 4-1 표. 콘텐츠 시점과는 출생 구간이 겹치는지로 짝짓는다 (id 형식에 기대지 않는다) */
const PLANNED: PlannedEra[] = [
  { label: '660', title: '백제 멸망', birthYears: [630, 650] },
  { label: '1170', title: '무신정변', birthYears: [1145, 1165] },
  { label: '1592', title: '임진왜란', birthYears: [1565, 1580] },
  { label: '1800년대', title: '세도정치', birthYears: [1790, 1815] },
];

export interface EraSlot {
  key: string;
  /** 짧은 이름표 (예: 1592) */
  label: string;
  title: string;
  birthYears: [number, number];
  era: EraDef | null;
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] <= b[1] && b[0] <= a[1];

/** 시점 이름표: 콘텐츠 id가 연도꼴이면 그대로, 아니면 출생 구간 끝 무렵 */
function eraLabel(era: EraDef, planned?: PlannedEra): string {
  if (planned) return planned.label;
  return /^\d+s?$/.test(era.id) ? era.id.replace(/s$/, '년대') : String(era.birthYears[1]);
}

export function eraSlots(content: Content): EraSlot[] {
  const slots: EraSlot[] = [];
  const used = new Set<EraDef>();
  for (const p of PLANNED) {
    const era = content.eras.find((e) => !used.has(e) && overlaps(e.birthYears, p.birthYears)) ?? null;
    if (era) used.add(era);
    slots.push({
      key: era?.id ?? `planned-${p.label}`,
      label: era ? eraLabel(era, p) : p.label,
      title: era?.title ?? p.title,
      birthYears: era?.birthYears ?? p.birthYears,
      era,
    });
  }
  // 계획에 없던 시점도 콘텐츠가 있으면 연다
  for (const era of content.eras) {
    if (used.has(era)) continue;
    slots.push({ key: era.id, label: eraLabel(era), title: era.title, birthYears: era.birthYears, era });
  }
  return slots.sort((a, b) => a.birthYears[0] - b.birthYears[0]);
}

export function eraLabelOf(content: Content, eraId: string): string {
  const slot = eraSlots(content).find((s) => s.era?.id === eraId);
  return slot ? `${slot.label} ${slot.title}` : eraId;
}
