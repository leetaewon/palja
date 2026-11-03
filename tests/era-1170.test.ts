// 시점 1170(무신정변) 콘텐츠 최소분과 보정 목표 (PRD 12장 Phase 3, 6-1)
import { describe, expect, it } from 'vitest';
import { simulate } from '../sim/sim-lives';
import { autoLive, createBirth, judgeRecord, type EventDef } from '../src/engine/index';
import { FILES } from '../src/content/index';
import { content } from './helpers';

const ERA = '1170';
const eraEvents = FILES['events/1170.json'] as EventDef[];
const royalEvents = FILES['events/royal-1170.json'] as EventDef[];
const commonEvents = FILES['events/common-1170.json'] as EventDef[];
const all = [...eraEvents, ...royalEvents, ...commonEvents];
const isFork = (e: EventDef) => !!e.choices && e.choices.length >= 2 && !e.pauseOnlySpecial;
const texts = (e: EventDef): string[] => [
  e.text,
  ...(e.outcomes ?? []).map((o) => o.text),
  ...(e.choices ?? []).flatMap((c) => [c.label, c.result ?? '', ...(c.outcomes ?? []).map((o) => o.text)]),
];

describe('1170 시점 콘텐츠 최소분 (PRD 12장 Phase 3)', () => {
  it('모든 사건이 이 시점에만 걸린다', () => {
    for (const e of all) expect(e.conditions.eras).toEqual([ERA]);
  });

  it('시점 사건 25개 이상, 갈림길 8개 이상', () => {
    expect(eraEvents.length).toBeGreaterThanOrEqual(25);
    expect(eraEvents.filter(isFork).length).toBeGreaterThanOrEqual(8);
  });

  it('회귀 대비(기억) 선택지 6개 이상', () => {
    const memoryChoices = all.flatMap((e) => (e.choices ?? []).filter((c) => (c.requires?.memory?.length ?? 0) > 0));
    expect(memoryChoices.length).toBeGreaterThanOrEqual(6);
  });

  it('이 시점용 공통 사건 20개 이상 (혼인·출산·두창·흉년·부역 포함)', () => {
    expect(commonEvents.length).toBeGreaterThanOrEqual(20);
    const ids = commonEvents.map((e) => e.id).join(' ');
    for (const k of ['marriage', 'childbirth', 'smallpox', 'bad-harvest', 'corvee']) expect(ids).toContain(k);
  });

  it('왕족 전용 콘텐츠 8개 이상', () => {
    const royal = royalEvents.filter((e) => e.conditions.statuses?.length === 1 && e.conditions.statuses[0] === 'royal');
    expect(royal.length).toBeGreaterThanOrEqual(8);
  });

  it('기록 템플릿이 호적·족보·문집·실록 등급마다 있다', () => {
    const levels = new Set(content.records.templates.filter((t) => t.eras.includes(ERA)).map((t) => t.level));
    for (const l of ['hojeok', 'jokbo', 'munjip', 'sillok']) expect(levels.has(l as never)).toBe(true);
  });

  it('연표 사건은 근거와 신뢰도가 있다', () => {
    const sourceIds = new Set(content.sources.map((s) => s.id));
    for (const e of all) {
      expect(e.sourceRefs.length).toBeGreaterThan(0);
      for (const r of e.sourceRefs) expect(sourceIds.has(r)).toBe(true);
      if (e.when?.year !== undefined) expect(['confirmed', 'estimated', 'adapted']).toContain(e.confidence);
    }
  });

  it('시대에 맞지 않는 말을 쓰지 않는다 (조선·임진왜란 용어, 한글이 있는 듯한 문장)', () => {
    for (const e of all) {
      for (const t of texts(e)) {
        for (const w of ['왜군', '언문', '양반', '서당', '한양', '임진']) expect(t, `${e.id}: ${t}`).not.toContain(w);
        if (t.includes('한글')) expect(t).toContain('한글은 아직 없는 시대');
      }
    }
  });

  it('한글·왜군 문장이 든 현대 지식 효과(teach-hangul, war-prep)를 직접 쓰지 않는다', () => {
    for (const e of all) {
      const effects = [...(e.effects ?? []), ...(e.choices ?? []).flatMap((c) => c.effects ?? [])];
      for (const ef of effects) if (ef.type === 'knowledge') expect(['teach-hangul', 'war-prep']).not.toContain(ef.id);
    }
  });
});

describe('1170 시점 출생 (PRD 4-1)', () => {
  const era = content.eras.find((e) => e.id === ERA)!;

  it('왕족 1, 나머지는 status-ratios 제안값을 비례로 줄인 값', () => {
    const w = Object.fromEntries(era.statuses.map((s) => [s.id, s.weight]));
    expect(w.royal).toBe(1);
    expect(w.yangban).toBeCloseTo(2 * 0.99, 6);
    expect(w.jungin + w.soldier).toBeCloseTo(6 * 0.99, 6);
    expect(w.commoner).toBeCloseTo(77 * 0.99, 6);
    expect(w.bugok).toBeCloseTo(7 * 0.99, 6);
    expect(w.slave).toBeCloseTo(8 * 0.99, 6);
  });

  it('출생 연도 1145~1165, 왕족은 개경에서 왕씨로 태어난다', () => {
    const births = Array.from({ length: 6000 }, (_, i) => createBirth(content, `b1170-${i}`, { eraId: ERA }));
    for (const b of births) {
      expect(b.year).toBeGreaterThanOrEqual(1145);
      expect(b.year).toBeLessThanOrEqual(1165);
      if (b.statusId === 'royal') {
        expect(b.regionId).toBe('gaegyeong');
        expect(b.surname).toBe('왕');
      }
      if (b.statusId === 'slave') expect(b.surname).toBe('');
    }
    const royal = births.filter((b) => b.statusId === 'royal').length / births.length;
    expect(royal).toBeGreaterThanOrEqual(0.006);
    expect(royal).toBeLessThanOrEqual(0.014);
  });

  it('기록 문장에 채워지지 않은 자리표시가 남지 않고, 왕족은 고려 종실 기록을 얻는다', () => {
    let royalSeen = 0;
    for (let i = 0; i < 1500; i++) {
      const life = autoLive(content, createBirth(content, `r1170-${i}`, { eraId: ERA }));
      const r = judgeRecord(content, life);
      if (r.text) expect(r.text).not.toMatch(/[{}]/);
      if (life.birth.statusId === 'royal') {
        royalSeen++;
        expect(r.text).not.toContain('선원록');
      }
    }
    expect(royalSeen).toBeGreaterThan(0);
  });
});

describe('1170 시점 sim:lives 보정 목표 (PRD 6-1, 표본 4000)', () => {
  const r = simulate(content, 4000, { eraId: ERA, seedPrefix: 'test1170', regression: true });
  for (const t of r.targets) {
    it(`${t.name} — ${t.value}`, () => expect(t.ok).toBe(true));
  }
  it('회귀해서 기억·지식을 쓰면 평균적으로 더 오래 산다', () => {
    expect(r.regression.smart.mean).toBeGreaterThan(r.regression.naive.mean);
  });
});
