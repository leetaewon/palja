// 시점 통합 검사 (Phase 3 통합)
// A. 기록 문장은 그 시점용 템플릿만 쓴다
// B. 같은 해 앞 사건이 세운 플래그로 열리는 연표 사건도 그해에 일어난다
import { describe, expect, it } from 'vitest';
import {
  advanceYearMut,
  autoLive,
  checkConditions,
  createBirth,
  createLife,
  judgeRecord,
  resolveChoiceMut,
  resolveKnowledge,
  templateFitsEra,
  type LifeState,
} from '../src/engine/index';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { content } from './helpers';

const ERAS = content.eras.map((e) => e.id);
const templateById = new Map(content.records.templates.map((t) => [t.id, t]));

function rulesEras(conds: { eras?: string[] } | undefined): string[] {
  const e = conds?.eras;
  return !e || e.length === 0 || e.includes('*') ? ERAS : e;
}

describe('A. 기록 템플릿의 시점', () => {
  it('4개 시점이 모두 있다', () => {
    expect([...ERAS].sort()).toEqual(['1170', '1592', '1800s', '660']);
  });

  it('모든 시점에 왕족(royal)과 상위 신분(yangban) id가 있다 (sim 보정 목표가 이 id로 판정한다)', () => {
    for (const era of content.eras) {
      const ids = era.statuses.map((s) => s.id);
      expect(ids, era.id).toContain('royal');
      expect(ids, era.id).toContain('yangban');
    }
  });

  it('마음가짐 신분 배수는 모든 시점의 노비·평민 계층 신분을 다룬다', () => {
    const study = content.mindsets.find((m) => m.id === 'study')!;
    for (const id of ['slave', 'commoner', 'bugok', 'soldier']) expect(study.byStatus?.[id], id).toBeDefined();
  });

  it('모든 기록 규칙은 걸리는 시점마다 그 시점용 템플릿을 쓴다', () => {
    for (const r of content.records.rules) {
      const tpl = templateById.get(r.templateId)!;
      for (const era of rulesEras(r.conditions)) {
        expect(templateFitsEra(tpl, era), `${r.id} → ${r.templateId} (${era})`).toBe(true);
      }
    }
  });

  it('사건의 기록 효과와 현대 지식의 기록도 그 사건의 시점용 템플릿이다', () => {
    const walk = (o: unknown, eras: string[], where: string) => {
      if (Array.isArray(o)) return o.forEach((x) => walk(x, eras, where));
      if (!o || typeof o !== 'object') return;
      const ef = o as { type?: string; templateId?: string; id?: string };
      if (ef.type === 'record' && ef.templateId) {
        for (const era of eras) expect(templateFitsEra(templateById.get(ef.templateId)!, era), `${where} → ${ef.templateId} (${era})`).toBe(true);
      }
      if (ef.type === 'knowledge' && ef.id) {
        for (const era of eras) {
          const k = resolveKnowledge(content, ef.id, era);
          for (const def of Object.values(k.byInfluence)) {
            if (def?.record) expect(templateFitsEra(templateById.get(def.record.templateId)!, era), `${where} → ${ef.id} ${def.record.templateId} (${era})`).toBe(true);
          }
        }
      }
      for (const v of Object.values(o)) walk(v, eras, where);
    };
    for (const ev of content.events) walk([ev.effects, ev.outcomes, ev.choices], rulesEras(ev.conditions), ev.id);
  });

  it('1800s는 1592와 함께 쓰는 조선 기록 문장(족보·호적·선원록)을 그대로 쓴다', () => {
    for (const id of ['hojeok-generic', 'jokbo-yangban-male', 'jokbo-yangban-female', 'jokbo-jungin', 'jokbo-royal', 'sillok-royal-death']) {
      expect(templateFitsEra(templateById.get(id)!, '1800s'), id).toBe(true);
      expect(templateFitsEra(templateById.get(id)!, '1592'), id).toBe(true);
    }
  });

  it('judgeRecord는 다른 시점 템플릿 후보를 건너뛴다', () => {
    const b = createBirth(content, 'leak-guard', { eraId: '1170' });
    const s = createLife(content, b);
    s.dead = { year: s.year + 40, month: 3, age: 40, cause: 'illness' };
    s.age = 40;
    s.recordCandidates.push({ level: 'sillok', templateId: 'sillok-royal-death', year: s.year });
    const r = judgeRecord(content, s);
    expect(r.templateId).not.toBe('sillok-royal-death');
  });

  for (const eraId of ['660', '1170', '1592', '1800s']) {
    it(`${eraId}: 인생 1200개(첫 인생·회귀)의 기록이 모두 이 시점 템플릿이다`, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 600; i++) {
        const b = createBirth(content, `era-rec-${eraId}-${i}`, { eraId });
        const first = autoLive(content, b, { policy: 'random' });
        const second = autoLive(content, b, { policy: 'smart', lifeIndex: 1, memory: first.experienced });
        for (const s of [first, second]) {
          // 판정 전 후보에도 다른 시점 문장이 없어야 한다 (엔진의 거르기에 기대지 않는다)
          for (const c of s.recordCandidates) {
            expect(templateFitsEra(templateById.get(c.templateId)!, eraId), `${c.templateId} 후보 (${eraId})`).toBe(true);
          }
          const r = judgeRecord(content, s);
          if (r.level === 'none') continue;
          expect(templateFitsEra(templateById.get(r.templateId!)!, eraId), `${r.templateId} (${eraId})`).toBe(true);
          expect(r.text).not.toMatch(/\{\w+\}/);
          seen.add(r.level);
        }
      }
      // 기록이 실제로 남는다 (규칙을 막아 기록이 사라지지 않았는지)
      expect(seen.has('hojeok')).toBe(true);
    });
  }

  it('660·1170 왕족에게 조선 문장(선원록·조회 정지)이 나오지 않고 그 시점 왕실 기록이 남는다', () => {
    for (const eraId of ['660', '1170']) {
      let checked = 0;
      for (let i = 0; i < 8000 && checked < 12; i++) {
        const b = createBirth(content, `royal-leak-${eraId}-${i}`, { eraId });
        if (b.statusId !== 'royal') continue;
        const r = judgeRecord(content, autoLive(content, b));
        expect(['jokbo', 'munjip', 'sillok']).toContain(r.level);
        expect(r.text).not.toMatch(/선원록|조회를 사흘|각 도|언문/);
        checked++;
      }
      expect(checked).toBe(12);
    }
  });
});

/** 정해진 선택지를 고르며 산다. 없으면 첫 번째 */
function liveChoosing(s: LifeState, prefer: Record<string, string>): LifeState {
  let guard = 0;
  while (!s.dead && guard++ < 5000) {
    if (s.pending) {
      const want = prefer[s.pending.eventId];
      const id = s.pending.choices.some((c) => c.id === want) ? want : s.pending.choices[0].id;
      resolveChoiceMut(content, s, id);
    } else advanceYearMut(content, s, s.age >= 10 ? 'work' : undefined);
  }
  return s;
}

describe('B. 같은 해 연쇄 사건', () => {
  it('1593년 5월 진주성에 들어가면 6월 진주성 함락을 겪는다', () => {
    let found = 0;
    for (let i = 0; i < 4000 && found < 5; i++) {
      const b = createBirth(content, `jinju-${i}`, { eraId: '1592' });
      if (b.regionId !== 'gyeongsang' || b.statusId === 'royal') continue;
      const s = liveChoosing(createLife(content, b), { '1593-jinju-gathering': 'enter', '1592-busan-landing': 'stay' });
      if (!s.done.includes('1593-jinju-gathering') || !s.flags.includes('in-jinju-castle') && !s.done.includes('1593-jinju-fall')) continue;
      // 성에 들어간 사람은 6월 함락을 반드시 겪는다 (그 사이에 죽지 않았다면)
      if (s.dead && s.dead.year === 1593 && s.dead.month < 6) continue;
      expect(s.done).toContain('1593-jinju-fall');
      found++;
    }
    expect(found).toBe(5);
  });

  it('연표 사건 1592-refugee-road·1593-jinju-fall이 실제 인생에서 일어난다', () => {
    const count: Record<string, number> = { '1592-refugee-road': 0, '1593-jinju-fall': 0 };
    for (let i = 0; i < 3000; i++) {
      const s = autoLive(content, createBirth(content, `chain-${i}`, { eraId: '1592' }));
      for (const id of Object.keys(count)) if (s.done.includes(id)) count[id]++;
    }
    expect(count['1592-refugee-road']).toBeGreaterThan(100);
    expect(count['1593-jinju-fall']).toBeGreaterThan(5);
  });

  it('연초에 조건이 안 맞아 미뤄 둔 사건도 조건이 끝내 안 맞으면 일어나지 않는다', () => {
    for (let i = 0; i < 300; i++) {
      const s = autoLive(content, createBirth(content, `chain-guard-${i}`, { eraId: '1592' }));
      if (s.done.includes('1593-jinju-fall')) expect(s.done).toContain('1593-jinju-gathering');
      if (s.done.includes('1592-refugee-road')) {
        const ev = content.events.find((e) => e.id === '1592-refugee-road')!;
        expect(ev.conditions?.flags).toContain('fled-1592');
      }
    }
    // 조건 검사는 그대로다
    const ev = content.events.find((e) => e.id === '1593-jinju-fall')!;
    const s = createLife(content, createBirth(content, 'cond', { eraId: '1592' }));
    expect(checkConditions(content, s, ev.conditions)).toBe(false);
  });
});

describe('근거 보기 연결 (4개 시점)', () => {
  const sourceIds = new Set(content.sources.map((s) => s.id));

  it('시점마다 연표·기록 근거가 있고, 신분·시점 근거가 모두 실제 자료를 가리킨다', () => {
    for (const era of content.eras) {
      for (const id of [`era-${era.id}`, `records-${era.id}`, `status-${era.id}`]) expect(sourceIds.has(id), `${era.id}: ${id}`).toBe(true);
      for (const st of era.statuses) expect(sourceIds.has(st.sourceRef), `${era.id}/${st.id}`).toBe(true);
      for (const id of era.sourceRefs) expect(sourceIds.has(id), `${era.id}: ${id}`).toBe(true);
    }
  });

  it('시점마다 연표 사건이 10개 이상이고 모두 근거와 신뢰도를 단다', () => {
    for (const era of content.eras) {
      const tl = content.events.filter((e) => e.kind === 'timeline' && e.when?.year !== undefined && e.conditions.eras?.includes(era.id));
      expect(tl.length, era.id).toBeGreaterThanOrEqual(10);
      for (const e of tl) {
        expect(e.sourceRefs.length, e.id).toBeGreaterThan(0);
        expect(['confirmed', 'estimated', 'adapted']).toContain(e.confidence);
      }
    }
  });

  it('근거 문서 링크가 저장소에 있는 문서를 가리킨다', () => {
    for (const s of content.sources) {
      const path = s.doc.split('#')[0];
      expect(existsSync(resolve(__dirname, '..', path)), `${s.id}: ${s.doc}`).toBe(true);
    }
  });
});
