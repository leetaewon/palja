// 660 백제 멸망 시점 콘텐츠 검사 (PRD 12장 Phase 3)
import { describe, expect, it } from 'vitest';
import { simulate } from '../sim/sim-lives';
import { autoLive, createBirth, judgeRecord, regress, resolveKnowledge, statusProbability } from '../src/engine/index';
import { content } from './helpers';

const ERA = '660';
const inEra = (eras: string[] | undefined) => !!eras?.includes(ERA);
const eraEvents = content.events.filter((e) => inEra(e.conditions.eras));
const isFork = (e: (typeof eraEvents)[number]) => !!e.choices && e.choices.length >= 2 && !e.pauseOnlySpecial;

describe('660 시점 콘텐츠 최소분 (PRD 12장 Phase 3)', () => {
  const timeline = eraEvents.filter((e) => !e.id.startsWith('c660-') && !e.id.startsWith('royal-660-'));
  const common = eraEvents.filter((e) => e.id.startsWith('c660-'));
  const royal = eraEvents.filter((e) => e.conditions.statuses?.length === 1 && e.conditions.statuses[0] === 'royal');

  it('시점 사건 25개 이상', () => expect(timeline.length).toBeGreaterThanOrEqual(25));

  it('갈림길 8개 이상', () => expect(eraEvents.filter(isFork).length).toBeGreaterThanOrEqual(8));

  it('회귀 대비(기억) 선택지 6개 이상', () => {
    const memoryChoices = eraEvents.flatMap((e) => (e.choices ?? []).filter((c) => (c.requires?.memory?.length ?? 0) > 0));
    expect(memoryChoices.length).toBeGreaterThanOrEqual(6);
  });

  it('이 시점용 공통 사건 20개 이상 (혼인·출산·두창·흉년·부역 포함)', () => {
    expect(common.length).toBeGreaterThanOrEqual(20);
    for (const id of ['c660-marriage-male', 'c660-childbirth', 'c660-smallpox-child', 'c660-bad-harvest', 'c660-corvee']) {
      expect(common.map((e) => e.id)).toContain(id);
    }
  });

  it('왕족 전용 콘텐츠 8개 이상', () => expect(royal.length).toBeGreaterThanOrEqual(8));

  it('기록 템플릿: 호적·족보·문집·실록이 모두 있다', () => {
    const levels = new Set(content.records.templates.filter((t) => t.eras.includes(ERA)).map((t) => t.level));
    expect([...levels].sort()).toEqual(['hojeok', 'jokbo', 'munjip', 'sillok']);
  });

  it('연표 사건은 모두 근거가 있고, 연도가 있는 사건은 확인·추정·각색이 표시된다', () => {
    for (const e of eraEvents.filter((x) => x.when?.year !== undefined)) {
      expect(e.sourceRefs.length, e.id).toBeGreaterThan(0);
      expect(['confirmed', 'estimated', 'adapted']).toContain(e.confidence);
    }
  });

  it('연표의 핵심 날짜가 근거 문서와 같다 (음력)', () => {
    const when = (id: string) => content.events.find((e) => e.id === id)?.when;
    expect(when('642-daeyaseong')?.year).toBe(642);
    expect(when('645-ansi')?.year).toBe(645);
    expect(when('660-sabi-falls')).toEqual({ year: 660, month: 7 });
    expect(when('660-hwangsan')).toEqual({ year: 660, month: 7 });
    expect(when('660-deportation')).toEqual({ year: 660, month: 9 });
    expect(when('663-baekgang')?.year).toBe(663);
    expect(when('668-goguryeo')?.year).toBe(668);
  });

  it('한글이 없던 시대라 "한글"을 쓰지 않는다', () => {
    const texts = JSON.stringify(eraEvents);
    expect(texts).not.toMatch(/한글|언문/);
    expect(JSON.stringify(eraEvents)).not.toMatch(/"teach-hangul"|"war-prep"/);
  });

  it('왕족·고위 관인의 지식 선택지는 나라(4단계)까지 노리고, 4단계 기록은 660 문장이다', () => {
    // 통합 전에는 조선 문장 누수 때문에 3단계로 막았다. byEra가 생겨 4단계를 연다 (Phase 4)
    let tier4 = 0;
    for (const e of eraEvents) {
      for (const c of e.choices ?? []) {
        const st = c.requires?.statuses ?? e.conditions.statuses ?? [];
        const flags = c.requires?.flags ?? [];
        for (const ef of c.effects ?? []) {
          if (ef.type !== 'knowledge') continue;
          if (st.includes('royal') || flags.includes('high-official')) {
            expect(ef.attempt ?? 4, `${e.id}/${c.id}`).toBeGreaterThanOrEqual(3);
            const k = resolveKnowledge(content, ef.id, ERA);
            const rec = (ef.attempt ?? 4) >= 4 ? k.byInfluence['4']?.record : undefined;
            if (rec) {
              tier4++;
              const tpl = content.records.templates.find((t) => t.id === rec.templateId);
              expect(tpl, `${e.id}/${c.id} → ${rec.templateId}`).toBeDefined();
              expect(!tpl?.eras || tpl.eras.includes(ERA), `${e.id}/${c.id} → ${rec.templateId}`).toBe(true);
            }
          } else {
            expect(c.requires?.notStatuses ?? [], `${e.id}/${c.id}`).toContain('royal');
            expect(c.requires?.notFlags ?? [], `${e.id}/${c.id}`).toContain('high-official');
          }
        }
      }
    }
    expect(tier4).toBeGreaterThan(0);
  });
});

describe('660 출생 (PRD 4-1)', () => {
  const births = Array.from({ length: 20000 }, (_, i) => createBirth(content, `b660-${i}`, { eraId: ERA }));

  it('출생 연도 630~650, 왕족은 사비에서 부여씨로', () => {
    for (const b of births) {
      expect(b.year).toBeGreaterThanOrEqual(630);
      expect(b.year).toBeLessThanOrEqual(650);
      if (b.statusId === 'royal') {
        expect(b.regionId).toBe('sabi');
        expect(b.surname).toBe('부여');
      }
      if (b.statusId === 'slave' || b.statusId === 'commoner') expect(b.surname).toBe('');
    }
  });

  it('왕족 1% ±0.3%p, 나머지는 status-ratios.md 제안값의 비례', () => {
    const rate = (id: string) => births.filter((b) => b.statusId === id).length / births.length;
    expect(rate('royal')).toBeGreaterThanOrEqual(0.007);
    expect(rate('royal')).toBeLessThanOrEqual(0.013);
    expect(statusProbability(content, ERA, 'royal')).toBeCloseTo(0.01, 5);
    expect(statusProbability(content, ERA, 'yangban')).toBeCloseTo(0.02 * 0.99, 5);
    expect(statusProbability(content, ERA, 'commoner')).toBeCloseTo(0.85 * 0.99, 5);
    expect(statusProbability(content, ERA, 'slave')).toBeCloseTo(0.13 * 0.99, 5);
  });
});

describe('660 기록 엔딩', () => {
  it('왕족·귀족의 기록은 이 시점 문장으로 남는다 (조선 선원록·족보 문장이 나오지 않는다)', () => {
    let checked = 0;
    for (let i = 0; i < 4000 && checked < 40; i++) {
      const b = createBirth(content, `rec660-${i}`, { eraId: ERA });
      if (b.statusId !== 'royal' && b.statusId !== 'yangban') continue;
      const s = autoLive(content, b);
      const r = judgeRecord(content, s);
      if (r.text) expect(r.text).not.toMatch(/선원록|씨 족보|조회를 사흘|각 도|언문/);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('회귀하면 660년의 기억을 가져간다', () => {
    for (let i = 0; i < 500; i++) {
      const b = createBirth(content, `mem660-${i}`, { eraId: ERA });
      const s = autoLive(content, b);
      if (!s.dead || s.dead.year <= 660) continue;
      expect(regress(content, s).memory).toContain('660-sabi-falls');
      return;
    }
    throw new Error('660년을 넘긴 인생을 찾지 못함');
  });
});

describe('660 sim:lives 보정 목표 (PRD 6-1, 표본 4000)', () => {
  const r = simulate(content, 4000, { eraId: ERA, seedPrefix: 'test660', regression: true });
  for (const t of r.targets) {
    it(`${t.name} — ${t.value}`, () => expect(t.ok).toBe(true));
  }
  it('회귀해서 기억·지식을 쓰면 평균적으로 더 오래 산다', () => {
    expect(r.regression.smart.mean).toBeGreaterThan(r.regression.naive.mean);
  });
  it('대부분의 삶은 어디에도 기록되지 않는다 (records-660)', () => {
    expect(r.recordDist.none).toBeGreaterThan(0.6);
  });
});
