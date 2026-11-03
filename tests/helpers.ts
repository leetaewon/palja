import { loadContent } from '../src/content/index';
import { advanceYearMut, createBirth, createLife, resolveChoiceMut, type Content, type LifeState } from '../src/engine/index';

export const content: Content = loadContent();

/** 첫 번째 선택지만 고르며 끝까지 산다 (같은 입력이면 같은 결과가 나와야 한다) */
export function liveFirstChoice(c: Content, s: LifeState, mindset = 'work'): LifeState {
  let guard = 0;
  while (!s.dead && guard++ < 5000) {
    if (s.pending) resolveChoiceMut(c, s, s.pending.choices[0].id);
    else advanceYearMut(c, s, s.age >= 10 ? mindset : undefined);
  }
  return s;
}

export function newLife(seed: string): LifeState {
  return createLife(content, createBirth(content, seed));
}
