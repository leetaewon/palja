// 시드 문자열 만들기. Math.random() 대신 crypto.getRandomValues (CLAUDE.md)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newSeed(length = 8): string {
  const bytes = new Uint8Array(length);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    // crypto가 없으면 시각 기반
    let t = Date.now() ^ Math.floor(performance.now() * 1000);
    for (let i = 0; i < length; i++) {
      t = (t * 1103515245 + 12345) >>> 0;
      bytes[i] = t >>> 24;
    }
  }
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** 사람이 입력한 시드를 다듬는다. 비면 null */
export function normalizeSeed(input: string): string | null {
  const s = input.trim().slice(0, 40);
  return s.length > 0 ? s : null;
}
