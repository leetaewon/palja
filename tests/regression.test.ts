import { describe, expect, it } from 'vitest';
import {
  advanceYearMut,
  autoLive,
  availableChoices,
  canRegress,
  createBirth,
  createLife,
  getEvent,
  MAX_REGRESSIONS,
  regress,
  regressionsLeft,
  resolveChoiceMut,
  type LifeState,
} from '../src/engine/index';
import { content, liveFirstChoice } from './helpers';

function findBirth(pred: (s: LifeState) => boolean, prefix: string) {
  for (let i = 0; i < 5000; i++) {
    const b = createBirth(content, `${prefix}-${i}`);
    const s = autoLive(content, b);
    if (pred(s)) return s;
  }
  throw new Error('조건에 맞는 인생을 못 찾음');
}

describe('팔자 고치기 (PRD 7장)', () => {
  it('회귀하면 같은 출생으로 돌아간다', () => {
    const first = autoLive(content, createBirth(content, 'regress-1'));
    const second = regress(content, first);
    expect(second.birth).toEqual(first.birth);
    expect(second.year).toBe(first.birth.year);
    expect(second.age).toBe(0);
    expect(second.statusId).toBe(first.birth.statusId);
    expect(second.stats).toEqual(first.birth.stats);
    expect(second.lifeIndex).toBe(1);
    expect(second.dead).toBeNull();
    expect(second.log).toEqual([]);
  });

  it('한 인생당 3회까지', () => {
    let s = autoLive(content, createBirth(content, 'regress-3'));
    for (let i = 0; i < MAX_REGRESSIONS; i++) {
      expect(canRegress(s)).toBe(true);
      s = liveFirstChoice(content, regress(content, s));
    }
    expect(s.lifeIndex).toBe(3);
    expect(regressionsLeft(s)).toBe(0);
    expect(canRegress(s)).toBe(false);
    expect(() => regress(content, s)).toThrow();
  });

  it('살아 있는 인생은 회귀할 수 없다', () => {
    expect(() => regress(content, createLife(content, createBirth(content, 'alive')))).toThrow();
  });

  it('겪은 memorable 사건을 기억으로 가져가고, 기억은 쌓인다', () => {
    const lived = findBirth((s) => s.experienced.includes('1592-busan-landing'), 'mem');
    const r1 = regress(content, lived);
    expect(r1.memory).toContain('1592-busan-landing');
    const lived2 = liveFirstChoice(content, r1);
    const r2 = regress(content, lived2);
    for (const m of r1.memory) expect(r2.memory).toContain(m);
  });

  it('기억이 있어야 대비 선택지가 열린다', () => {
    const ev = getEvent(content, '1592-busan-landing');
    const base = createLife(content, createBirth(content, 'memory-choice'));
    const s = { ...base, year: 1592, age: 20, memory: [] as string[] };
    expect(availableChoices(content, s, ev).some((c) => c.requires?.memory)).toBe(false);
    const withMemory = { ...s, memory: ['1592-busan-landing'] };
    expect(availableChoices(content, withMemory, ev).some((c) => c.requires?.memory)).toBe(true);
  });

  it('현대 지식은 회귀한 인생에서만 열린다', () => {
    const ev = getEvent(content, 'common-epidemic');
    const first = { ...createLife(content, createBirth(content, 'knowledge')), age: 30 };
    expect(availableChoices(content, first, ev).some((c) => c.requires?.knowledge)).toBe(false);
    const again = { ...first, lifeIndex: 1 };
    expect(availableChoices(content, again, ev).some((c) => c.requires?.knowledge)).toBe(true);
  });

  it('첫 인생에서는 지식 선택지가 화면에 나오지 않는다', () => {
    for (let i = 0; i < 200; i++) {
      let s = createLife(content, createBirth(content, `nok-${i}`));
      let guard = 0;
      while (!s.dead && guard++ < 300) {
        const pending = s.pending;
        if (pending) {
          expect(pending.choices.every((c) => c.tag !== 'knowledge')).toBe(true);
          s = liveStep(s, pending.choices[0].id);
        } else s = liveStep(s);
      }
    }
  });
});

function liveStep(s: LifeState, choice?: string): LifeState {
  if (choice) resolveChoiceMut(content, s, choice);
  else advanceYearMut(content, s, s.age >= 10 ? 'work' : undefined);
  return s;
}
