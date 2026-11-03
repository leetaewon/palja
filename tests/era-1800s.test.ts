// 시점 1800s(세도정치) 콘텐츠 최소분과 보정 목표 (PRD 12장 Phase 3, 6-1)
import { describe, expect, it } from 'vitest';
import eraEvents from '../content/events/1800s.json';
import royalEvents from '../content/events/royal-1800s.json';
import commonEvents from '../content/events/common-1800s.json';
import { simulate } from '../sim/sim-lives';
import { autoLive, createBirth, judgeEnding, statusProbability, type EventDef } from '../src/engine/index';
import { content } from './helpers';

const ERA = '1800s';
const asEvents = (x: unknown) => x as EventDef[];
const era = asEvents(eraEvents);
const royal = asEvents(royalEvents);
const common = asEvents(commonEvents);
const all = [...era, ...royal, ...common];

const isFork = (e: EventDef) => !!e.choices && e.choices.length >= 2 && !e.pauseOnlySpecial;
const hasMemoryChoice = (e: EventDef) => (e.choices ?? []).some((c) => (c.requires?.memory ?? []).length > 0);

describe('1800s 콘텐츠 최소분 (PRD 12장 Phase 3)', () => {
  it('시점 파일의 모든 사건은 1800s 시점에만 걸린다', () => {
    for (const e of all) expect(e.conditions.eras).toEqual([ERA]);
  });

  it('사건 25개 이상, 갈림길 8개 이상', () => {
    expect(era.length).toBeGreaterThanOrEqual(25);
    expect([...era, ...royal].filter(isFork).length).toBeGreaterThanOrEqual(8);
  });

  it('회귀 대비(기억) 선택지가 있는 사건 6개 이상', () => {
    expect(all.filter(hasMemoryChoice).length).toBeGreaterThanOrEqual(6);
  });

  it('이 시점용 공통 사건 20개 이상 (혼인·출산·두창·흉년·부역 포함)', () => {
    expect(common.length).toBeGreaterThanOrEqual(20);
    for (const key of ['marriage', 'childbirth', 'smallpox', 'bad-harvest', 'corvee']) {
      expect(common.some((e) => e.id.includes(key))).toBe(true);
    }
  });

  it('왕족 전용 콘텐츠 8개 이상', () => {
    const royalOnly = royal.filter((e) => e.conditions.statuses?.length === 1 && e.conditions.statuses[0] === 'royal');
    expect(royalOnly.length).toBeGreaterThanOrEqual(8);
  });

  it('기록 템플릿: 호적·족보·문집·실록이 모두 있다', () => {
    const tpl = content.records.templates.filter((t) => t.eras.includes(ERA));
    for (const level of ['hojeok', 'jokbo', 'munjip', 'sillok'] as const) {
      expect(tpl.some((t) => t.level === level)).toBe(true);
    }
  });

  it('연표 사건은 근거와 신뢰도를 밝힌다', () => {
    for (const e of all.filter((x) => x.when?.year !== undefined)) {
      expect(e.sourceRefs.length).toBeGreaterThan(0);
      expect(['confirmed', 'estimated', 'adapted']).toContain(e.confidence);
    }
  });

  it('1592 전용 지식 행동(왜군 침입 대비)은 쓰지 않는다', () => {
    for (const e of all) {
      for (const c of e.choices ?? []) expect(c.requires?.knowledge ?? []).not.toContain('war-prep');
    }
  });
});

describe('1800s 출생 (PRD 4-1)', () => {
  const eraDef = content.eras.find((e) => e.id === ERA)!;
  const N = 20000;
  const births = Array.from({ length: N }, (_, i) => createBirth(content, `b1800-${i}`, { eraId: ERA }));

  it('출생 구간 1790~1815', () => {
    expect(eraDef.birthYears).toEqual([1790, 1815]);
    for (const b of births) {
      expect(b.year).toBeGreaterThanOrEqual(1790);
      expect(b.year).toBeLessThanOrEqual(1815);
    }
  });

  it('왕족 1%, 나머지는 status-ratios.md 게임 제안값을 비례로 줄인 값', () => {
    const expected: Record<string, number> = { royal: 1, yangban: 10, yuhak: 15, jungin: 4, commoner: 51, slave: 20 };
    for (const st of eraDef.statuses) {
      const want = st.id === 'royal' ? 1 : expected[st.id] * 0.99;
      expect(st.weight).toBeCloseTo(want, 6);
      expect(statusProbability(content, ERA, st.id)).toBeCloseTo(want / 100, 6);
    }
    const royalRate = births.filter((b) => b.statusId === 'royal').length / N;
    expect(royalRate).toBeGreaterThanOrEqual(0.007);
    expect(royalRate).toBeLessThanOrEqual(0.013);
  });

  it('시점을 고르지 않으면 1800s도 다른 시점과 같은 비율로 나온다', () => {
    const M = 8000;
    const n = content.eras.length;
    const got = Array.from({ length: M }, (_, i) => createBirth(content, `pick-${i}`)).filter((b) => b.eraId === ERA).length / M;
    expect(Math.abs(got - 1 / n)).toBeLessThan(0.03);
  });

  it('왕족은 경기도, 노비는 성 없이 태어난다', () => {
    for (const b of births) {
      if (b.statusId === 'royal') {
        expect(b.regionId).toBe('gyeonggi');
        expect(b.surname).toBe('이');
      }
      if (b.statusId === 'slave') expect(b.surname).toBe('');
    }
  });
});

describe('1800s 일생과 기록', () => {
  it('기록 문장에 자리표시가 남지 않고, 재위 연도가 이 시점의 임금으로 나온다', () => {
    let withRecord = 0;
    for (let i = 0; i < 400; i++) {
      const s = autoLive(content, createBirth(content, `r1800-${i}`, { eraId: ERA }));
      const e = judgeEnding(content, s);
      if (!e.record.text) continue;
      withRecord++;
      expect(e.record.text).not.toMatch(/\{\w+\}/);
      if (/[가-힣]+ (\d+|즉위)년/.test(e.record.text)) expect(e.record.text).toMatch(/정조|순조|헌종|철종|고종|순종/);
    }
    expect(withRecord).toBeGreaterThan(0);
  });

  it('상민이 족보·유학 칭호로 호적상 양반(몰락·신흥 양반)이 되는 길이 실제로 열린다', () => {
    let moved = 0;
    for (let i = 0; i < 3000 && moved === 0; i++) {
      const s = autoLive(content, createBirth(content, `up1800-${i}`, { eraId: ERA }));
      if (s.statusHistory.some((h) => h.from === 'commoner' && h.to === 'yuhak')) moved++;
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe('1800s sim:lives 보정 목표 (PRD 6-1, 표본 4000)', () => {
  const r = simulate(content, 4000, { eraId: ERA, seedPrefix: 'test', regression: true });
  for (const t of r.targets) {
    it(`${t.name} — ${t.value}`, () => expect(t.ok).toBe(true));
  }
  it('회귀해서 기억·지식을 쓰면 평균적으로 더 오래 산다', () => {
    expect(r.regression.smart.mean).toBeGreaterThan(r.regression.naive.mean);
  });
});
