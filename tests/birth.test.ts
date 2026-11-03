import { describe, expect, it } from 'vitest';
import { createBirth, statusProbability } from '../src/engine/index';
import { content } from './helpers';

describe('출생 결정 (PRD 4장)', () => {
  const N = 30000;
  const births = Array.from({ length: N }, (_, i) => createBirth(content, `birth-${i}`));
  // 시점이 여럿이라 1592 전용 검사는 1592 출생만 본다
  const births1592 = births.filter((b) => b.eraId === '1592');

  it('왕족 출생 확률 1% ±0.3%p', () => {
    const royal = births.filter((b) => b.statusId === 'royal').length / N;
    expect(royal).toBeGreaterThanOrEqual(0.007);
    expect(royal).toBeLessThanOrEqual(0.013);
  });

  it('신분 분포가 콘텐츠 가중치를 따른다', () => {
    const era = content.eras.find((e) => e.id === '1592')!;
    for (const st of era.statuses) {
      const got = births1592.filter((b) => b.statusId === st.id).length / births1592.length;
      expect(Math.abs(got - st.weight / 100)).toBeLessThan(0.012);
    }
  });

  it('성별 50:50, 출생 연도는 구간 안', () => {
    const male = births.filter((b) => b.sex === 'male').length / N;
    expect(Math.abs(male - 0.5)).toBeLessThan(0.015);
    for (const b of births1592.slice(0, 2000)) {
      expect(b.year).toBeGreaterThanOrEqual(1565);
      expect(b.year).toBeLessThanOrEqual(1580);
      expect(b.month).toBeGreaterThanOrEqual(1);
      expect(b.month).toBeLessThanOrEqual(12);
    }
  });

  it('왕족은 한양이 있는 경기도에서 태어난다', () => {
    for (const b of births1592.filter((x) => x.statusId === 'royal')) expect(b.regionId).toBe('gyeonggi');
  });

  it('노비는 성 없이, 왕족은 이씨로 이름이 붙는다', () => {
    for (const b of births1592.slice(0, 3000)) {
      expect(b.givenName.length).toBeGreaterThan(0);
      if (b.statusId === 'slave') expect(b.surname).toBe('');
      if (b.statusId === 'royal') expect(b.surname).toBe('이');
    }
  });

  it('같은 시드는 같은 출생', () => {
    expect(createBirth(content, 'same')).toEqual(createBirth(content, 'same'));
  });

  it('출생 확률 표시값', () => {
    expect(statusProbability(content, '1592', 'royal')).toBeCloseTo(0.01, 5);
    expect(statusProbability(content, '1592', 'slave')).toBeCloseTo(0.3465, 4);
  });
});
