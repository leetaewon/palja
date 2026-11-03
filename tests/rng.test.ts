import { describe, expect, it } from 'vitest';
import { hashSeed, makeRng, rand, randInt, shuffle, weighted } from '../src/engine/index';

describe('시드 RNG', () => {
  it('같은 시드는 같은 수열을 낸다', () => {
    const a = makeRng('palja');
    const b = makeRng('palja');
    const xs = Array.from({ length: 50 }, () => rand(a));
    const ys = Array.from({ length: 50 }, () => rand(b));
    expect(xs).toEqual(ys);
  });

  it('다른 시드는 다른 수열을 낸다', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(rand(makeRng('a'))).not.toBe(rand(makeRng('b')));
  });

  it('[0,1) 범위와 대략 균등한 분포', () => {
    const h = makeRng('uniform');
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const x = rand(h);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 20000).toBeCloseTo(0.5, 1);
  });

  it('randInt는 양 끝을 포함한다', () => {
    const h = makeRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randInt(h, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('weighted와 shuffle', () => {
    const h = makeRng('w');
    let heavy = 0;
    for (let i = 0; i < 5000; i++) if (weighted(h, ['a', 'b'], (x) => (x === 'a' ? 9 : 1)) === 'a') heavy++;
    expect(heavy / 5000).toBeGreaterThan(0.85);
    expect(shuffle(h, [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
