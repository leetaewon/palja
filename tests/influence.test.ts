import { describe, expect, it } from 'vitest';
import { computeInfluence, createBirth, createLife, persuasionChance, useKnowledge, type LifeState } from '../src/engine/index';
import { content } from './helpers';

function life(statusId: string, stats: Partial<LifeState['stats']>, flags: string[] = []): LifeState {
  const s = createLife(content, createBirth(content, `inf-${statusId}`));
  return { ...s, statusId, stats: { health: 50, wealth: 10, learning: 10, trust: 30, ...stats }, flags, lifeIndex: 1 };
}

describe('영향력 단계 (PRD 7-4)', () => {
  it('1 가족: 누구나', () => {
    expect(computeInfluence(content, life('slave', {}))).toBe(1);
    expect(computeInfluence(content, life('yangban', { trust: 20 }))).toBe(1);
  });

  it('2 마을: 신뢰 또는 재산이 높으면', () => {
    expect(computeInfluence(content, life('slave', { trust: 60 }))).toBe(2);
    expect(computeInfluence(content, life('commoner', { wealth: 60 }))).toBe(2);
  });

  it('3 고을: 양반·향리·관료 + 신뢰', () => {
    expect(computeInfluence(content, life('yangban', { trust: 50 }))).toBe(3);
    expect(computeInfluence(content, life('jungin', { trust: 55 }))).toBe(3);
    // 신뢰가 같아도 상민·노비는 고을까지 닿지 않는다
    expect(computeInfluence(content, life('commoner', { trust: 90, wealth: 90 }))).toBe(2);
    expect(computeInfluence(content, life('slave', { trust: 90, learning: 90 }))).toBe(2);
    // 관직을 얻은 사람은 고을까지
    expect(computeInfluence(content, life('commoner', { trust: 55 }, ['official']))).toBe(3);
  });

  it('4 나라: 왕족·고위 관료 + 학식·신뢰', () => {
    expect(computeInfluence(content, life('royal', { trust: 60, learning: 60 }))).toBe(4);
    expect(computeInfluence(content, life('royal', { trust: 60, learning: 30 }))).toBe(3);
    expect(computeInfluence(content, life('yangban', { trust: 70, learning: 80 }))).toBe(3);
    expect(computeInfluence(content, life('yangban', { trust: 70, learning: 80 }, ['official', 'high-official']))).toBe(4);
  });

  it('영향력보다 높은 범위를 노리면 거의 실패한다', () => {
    const slave = life('slave', { trust: 30 });
    expect(persuasionChance(content, slave, 1)).toBe(1);
    expect(persuasionChance(content, slave, 3)).toBe(0.05);
    const royal = life('royal', { trust: 70, learning: 70 });
    expect(persuasionChance(content, royal, 4)).toBeGreaterThan(0.5);
  });

  it('낮은 신분은 같은 지식을 써도 더 자주 실패한다', () => {
    const slave = life('slave', { trust: 65 });
    const yangban = life('yangban', { trust: 65 });
    expect(persuasionChance(content, slave, 2)).toBeLessThan(persuasionChance(content, yangban, 2));
  });

  it('지식을 쓰면 범위만큼 바꾼 것이 남는다', () => {
    let village = 0;
    let suspicion = 0;
    for (let i = 0; i < 200; i++) {
      const s = { ...life('slave', { trust: 30 }), rng: i + 1 };
      useKnowledge(content, s, 'boil-water', 3, 1);
      expect(s.changes.some((c) => c.scope === 'family')).toBe(true);
      if (s.changes.some((c) => c.scope === 'county')) village++;
      if (s.log.some((l) => l.text.includes('이상한 소리'))) suspicion++;
      expect(s.protections['epidemic']).toBeLessThan(1);
    }
    expect(village).toBeLessThan(20);
    expect(suspicion).toBeGreaterThan(150);
  });

  it('나라 범위에 성공하면 가상 실록 기록 후보가 생긴다', () => {
    let sillok = 0;
    for (let i = 0; i < 100; i++) {
      const s = { ...life('royal', { trust: 80, learning: 80 }), rng: 1000 + i };
      useKnowledge(content, s, 'war-prep', 4, 1);
      if (s.recordCandidates.some((r) => r.level === 'sillok')) sillok++;
    }
    expect(sillok).toBeGreaterThan(20);
  });
});
