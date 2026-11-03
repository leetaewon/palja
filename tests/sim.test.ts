import { describe, expect, it } from 'vitest';
import { simulate } from '../sim/sim-lives';
import { content } from './helpers';

describe('sim:lives 보정 목표 (PRD 6-1, 표본 4000)', () => {
  const r = simulate(content, 4000, { eraId: '1592', seedPrefix: 'test', regression: true });
  for (const t of r.targets) {
    it(`${t.name} — ${t.value}`, () => expect(t.ok).toBe(true));
  }
  it('회귀해서 기억·지식을 쓰면 평균적으로 더 오래 산다', () => {
    expect(r.regression.smart.mean).toBeGreaterThan(r.regression.naive.mean);
  });
});
