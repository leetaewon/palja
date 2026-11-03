import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContent, FILES } from '../src/content/index';
import { validateContent } from '../src/content/validate';
import { content } from './helpers';

const CONTENT_DIR = join(__dirname, '..', 'content');

function listJson(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return listJson(p);
    return f.endsWith('.json') ? [relative(CONTENT_DIR, p).replaceAll('\\', '/')] : [];
  });
}

describe('콘텐츠 스키마 검증', () => {
  it('content/ 의 모든 파일이 등록되어 있고 JSON으로 읽힌다', () => {
    const onDisk = listJson(CONTENT_DIR).sort();
    expect(onDisk).toEqual(Object.keys(FILES).sort());
    for (const f of onDisk) expect(() => JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8'))).not.toThrow();
  });

  it('모든 파일이 스키마를 통과한다', () => {
    const r = validateContent(buildContent());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('1592 시점 최소분: 사건 25개 이상, 갈림길 8개 이상, 현대 지식 8개', () => {
    const era = content.events.filter((e) => e.conditions.eras?.includes('1592'));
    expect(era.length).toBeGreaterThanOrEqual(25);
    const forks = era.filter((e) => e.choices && e.choices.length >= 2 && !e.pauseOnlySpecial);
    expect(forks.length).toBeGreaterThanOrEqual(8);
    expect(content.knowledge.actions.length).toBeGreaterThanOrEqual(8);
  });

  it('잘못된 콘텐츠를 잡는다', () => {
    const bad = structuredClone(buildContent()) as ReturnType<typeof structuredClone> & Record<string, never>;
    const c = bad as unknown as { eras: { statuses: { id: string; weight: number }[] }[]; events: { id: string; sourceRefs: string[]; effects?: unknown[] }[] };
    c.eras[0].statuses.find((s) => s.id === 'royal')!.weight = 2;
    c.events[0].sourceRefs = ['없는-근거'];
    c.events[1].effects = [{ type: 'death', cause: 'suicide' }];
    const r = validateContent(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toMatch(/왕족 weight/);
    expect(r.errors.join('\n')).toMatch(/없는 근거/);
    expect(r.errors.join('\n')).toMatch(/없는 사인 suicide/);
  });

  it('쓰지 않는 말을 잡는다', () => {
    const bad = structuredClone(buildContent()) as { events: { text: string }[] };
    bad.events[0].text = '노예가 되었다.';
    expect(validateContent(bad).errors.join('\n')).toMatch(/쓰지 않는 말/);
  });
});
