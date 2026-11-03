import { describe, expect, it } from 'vitest';
import { autoLive, createBirth, judgeEnding, judgeRecord, neighbors, reignLabel } from '../src/engine/index';
import { content } from './helpers';

const reigns = content.eras.find((e) => e.id === '1592')!.reigns;

describe('기록 엔딩 (PRD 8장)', () => {
  it('재위 연도', () => {
    expect(reignLabel(reigns, 1592)).toBe('선조 25년');
    expect(reignLabel(reigns, 1567)).toBe('선조 즉위년');
    expect(reignLabel(reigns, 1568)).toBe('선조 1년');
    expect(reignLabel(reigns, 1623)).toBe('인조 1년');
    expect(reignLabel(reigns, 1565)).toBe('명종 20년');
  });

  it('어려서 죽은 상민·노비는 기록이 남지 않는다', () => {
    let checked = 0;
    for (let i = 0; i < 400 && checked < 30; i++) {
      const s = autoLive(content, createBirth(content, `rec-${i}`));
      if (s.dead!.age < 5 && ['commoner', 'slave'].includes(s.statusId)) {
        expect(judgeRecord(content, s).level).toBe('none');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('왕족은 선원록(족보) 이상이 남는다', () => {
    let checked = 0;
    for (let i = 0; i < 20000 && checked < 10; i++) {
      const b = createBirth(content, `royal-${i}`);
      if (b.statusId !== 'royal') continue;
      const e = judgeEnding(content, autoLive(content, b));
      expect(['jokbo', 'munjip', 'sillok']).toContain(e.record.level);
      expect(e.record.text).toBeTruthy();
      expect(e.record.text).not.toMatch(/\{\w+\}/);
      checked++;
    }
    expect(checked).toBe(10);
  });

  it('엔딩 정보: 사인 이름, 남은 회귀 횟수, 기록 문장에 자리표시가 남지 않음', () => {
    for (let i = 0; i < 300; i++) {
      const s = autoLive(content, createBirth(content, `end-${i}`));
      const e = judgeEnding(content, s);
      expect(e.causeName.length).toBeGreaterThan(0);
      expect(e.regressionsLeft).toBe(3);
      if (e.record.text) expect(e.record.text).not.toMatch(/\{\w+\}/);
    }
  });

  it('같은 해 같은 고을의 사람들 3명', () => {
    const b = createBirth(content, 'neighbors');
    const ns = neighbors(content, b);
    expect(ns).toHaveLength(3);
    expect(neighbors(content, b)).toEqual(ns);
    for (const n of ns) expect(n.ageAtDeath).toBeGreaterThanOrEqual(0);
  });
});
