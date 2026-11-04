// 명도 대비 (PRD 10-1: WCAG AA, 라이트·다크 모두). styles.css의 색 토큰을 읽어 글자색 × 바탕색 조합을 계산한다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2];
  return out;
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEXT = ['ink', 'ink-2', 'ink-3', 'seal', 'indigo', 'ochre'];
const BG = ['paper', 'paper-2', 'paper-3'];

describe('명도 대비 WCAG AA (본문 4.5:1)', () => {
  for (const [theme, sel] of [
    ['라이트', ":root,\n[data-theme='light']"],
    ['다크', "[data-theme='dark']"],
  ] as const) {
    const t = tokens(sel);
    it(`${theme} 토큰을 읽는다`, () => {
      for (const k of [...TEXT, ...BG]) expect(t[k], k).toMatch(/^#/);
    });
    for (const fg of TEXT) {
      for (const bg of BG) {
        it(`${theme} ${fg} / ${bg}`, () => {
          expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    it(`${theme} 도장 글자 / 도장 바탕`, () => {
      expect(contrast(t['seal-ink'], t['seal-body'])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('회귀 전환 화면 (테마와 상관없는 먹빛 바탕)', () => {
    const bg = '#110e0a';
    for (const fg of ['#f2ebdd', '#e8a596', '#d9cdb6', '#b9ac94']) expect(contrast(fg, bg), fg).toBeGreaterThanOrEqual(4.5);
  });
});
