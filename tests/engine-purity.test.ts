import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ENGINE = join(__dirname, '..', 'src', 'engine');

describe('엔진 순수성 (CLAUDE.md 코드 규칙)', () => {
  for (const f of readdirSync(ENGINE).filter((x) => x.endsWith('.ts'))) {
    it(`${f}: React·DOM·window·localStorage·Math.random 없음`, () => {
      // 주석은 빼고 코드만 본다
      const src = readFileSync(join(ENGINE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(src).not.toMatch(/from ['"]react/);
      expect(src).not.toMatch(/\bwindow\./);
      expect(src).not.toMatch(/\bdocument\./);
      expect(src).not.toMatch(/localStorage/);
      expect(src).not.toMatch(/Math\.random/);
    });
  }
});
