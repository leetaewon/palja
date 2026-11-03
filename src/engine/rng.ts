// 시드 RNG. Math.random()은 쓰지 않는다.
// 상태는 32비트 정수 하나라 인생 상태(LifeState.rng)에 그대로 저장된다.

/** 문자열 시드를 32비트 정수로 바꾼다. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** RNG 상태를 가진 객체. LifeState도 이 모양을 만족한다. */
export interface RngHolder {
  rng: number;
}

export function makeRng(seed: string): RngHolder {
  return { rng: hashSeed(seed) };
}

/** [0, 1) 실수. mulberry32 */
export function rand(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) >>> 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** [min, max] 정수 */
export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(h) * (max - min + 1));
}

export function chance(h: RngHolder, p: number): boolean {
  if (p >= 1) return true;
  if (p <= 0) return false;
  return rand(h) < p;
}

export function pick<T>(h: RngHolder, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: 빈 목록');
  return items[Math.floor(rand(h) * items.length)];
}

export function weighted<T>(h: RngHolder, items: readonly T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, weightOf(it)), 0);
  if (items.length === 0 || total <= 0) throw new Error('weighted: 가중치 합이 0');
  let r = rand(h) * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

/** 제자리 섞기 (Fisher–Yates) */
export function shuffle<T>(h: RngHolder, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand(h) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
