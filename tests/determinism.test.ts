import { describe, expect, it } from 'vitest';
import { advanceYear, autoLive, createBirth, createLife, resolveChoice } from '../src/engine/index';
import { content, liveFirstChoice, newLife } from './helpers';

describe('결정론 (PRD 11장)', () => {
  it('같은 시드 + 같은 선택 → 같은 인생', () => {
    for (const seed of ['a', 'b', 'c', '임진', '1592-test']) {
      const x = liveFirstChoice(content, newLife(seed));
      const y = liveFirstChoice(content, newLife(seed));
      expect(x).toEqual(y);
    }
  });

  it('같은 시드라도 선택이 다르면 달라질 수 있다', () => {
    let differs = 0;
    for (let i = 0; i < 40; i++) {
      const a = liveFirstChoice(content, newLife(`d${i}`), 'work');
      const b = liveFirstChoice(content, newLife(`d${i}`), 'body');
      if (JSON.stringify(a.log) !== JSON.stringify(b.log)) differs++;
    }
    expect(differs).toBeGreaterThan(0);
  });

  it('공개 API는 입력 상태를 바꾸지 않는다', () => {
    const s = newLife('immutable');
    const before = JSON.stringify(s);
    let n = advanceYear(content, s);
    expect(JSON.stringify(s)).toBe(before);
    while (!n.dead) {
      if (n.pending) {
        const snap = JSON.stringify(n);
        const next = resolveChoice(content, n, n.pending.choices[0].id);
        expect(JSON.stringify(n)).toBe(snap);
        n = next;
      } else n = advanceYear(content, n, n.age >= 10 ? 'family' : undefined);
    }
    expect(n.dead).not.toBeNull();
  });

  it('상태를 JSON으로 저장했다 불러와도 이어서 같은 결과', () => {
    const s = createLife(content, createBirth(content, 'save-load'));
    for (let i = 0; i < 12 && !s.dead; i++) {
      if (s.pending) break;
      Object.assign(s, advanceYear(content, s, s.age >= 10 ? 'work' : undefined));
    }
    const restored = JSON.parse(JSON.stringify(s));
    expect(liveFirstChoice(content, restored)).toEqual(liveFirstChoice(content, s));
  });

  it('자동 봇도 결정적이다', () => {
    const b = createBirth(content, 'bot');
    expect(autoLive(content, b)).toEqual(autoLive(content, b));
  });

  it('모든 인생은 끝난다 (최대 나이 안에서)', () => {
    for (let i = 0; i < 300; i++) {
      const s = autoLive(content, createBirth(content, `end-${i}`));
      expect(s.dead).not.toBeNull();
      expect(s.dead!.age).toBeLessThanOrEqual(content.mortality.maxAge);
      expect(s.dead!.cause).not.toBe('suicide');
    }
  });
});
