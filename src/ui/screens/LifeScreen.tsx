// 일생 (PRD 5장, 10장 3·4, 10-2)
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  advanceYear,
  causeName,
  CHILD_AGE,
  computeInfluence,
  findStatus,
  getEvent,
  resolveChoice,
  type Content,
  type EventDef,
  type LifeState,
  type LogEntry,
} from '../../engine';
import { useApp } from '../context';
import { ConfidenceTag, ThemeToggle } from '../components/common';
import { StatBars, StatLine } from '../components/StatBars';
import { ChoiceSheet } from '../components/ChoiceSheet';
import { DecadeModal, MINDSET_DESC } from '../components/DecadeModal';
import { eraLabelOf } from '../lib/eras';
import { memoryLines } from '../lib/memory';
import { deathSentence, regressionLabel, reignOf } from '../lib/summary';
import { fullName, INFLUENCE_LABEL } from '../lib/text';

const YEAR_MS = 3000;

export interface ConfirmedDecade {
  age: number;
  year: number;
  mindset: string;
  reflection: string;
  summary: string[];
}

export interface ViewingDecade {
  age: number;
  year: number;
  mindset: string;
  reflection?: string;
  summary?: string[];
  readOnly: boolean;
}

function getDecadeSummary(life: LifeState, age: number): string[] {
  const minAge = Math.max(0, age - 10);
  const recentLogs = life.log.filter((e) => e.age >= minAge && e.age < age && e.text);
  if (recentLogs.length === 0) {
    return ['큰 풍파 없이 담담하게 세월을 보냈습니다.'];
  }
  const events = recentLogs.filter((e) => e.kind === 'event' || e.kind === 'knowledge');
  const pool = events.length > 0 ? events : recentLogs;
  return pool.slice(-3).map((e) => `${e.year}년 (${e.age}세) · ${e.text}`);
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function LifeScreen({
  life,
  setLife,
  onSeeRecord,
}: {
  life: LifeState;
  setLife: (s: LifeState) => void;
  onSeeRecord: () => void;
}) {
  const { content, nav, speed, setSpeed } = useApp();
  const mindsets = useMemo(() => content.mindsets.filter((m) => m.selectable), [content]);
  const [playing, setPlaying] = useState(life.log.length === 0 && !life.dead);
  const [mindset, setMindset] = useState(life.mindset === 'child' ? 'work' : life.mindset);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // 10년 주기 변곡점 관련 상태
  const [pendingDecadeAge, setPendingDecadeAge] = useState<number | null>(null);
  const [confirmedDecades, setConfirmedDecades] = useState<Record<number, ConfirmedDecade>>({});
  const [viewingDecade, setViewingDecade] = useState<ViewingDecade | null>(null);
  const decadeTimerRef = useRef<number | null>(null);

  const wasPlaying = useRef(false);
  const child = life.age < CHILD_AGE;
  const prevAge = useRef(life.age);
  const lifeRef = useRef(life);
  lifeRef.current = life;

  const step = useCallback(() => {
    if (life.dead || life.pending || pendingDecadeAge !== null) return;
    if (life.age > CHILD_AGE) setHint(null);
    setLife(advanceYear(content, life, life.age >= CHILD_AGE ? mindset : undefined));
  }, [content, life, mindset, pendingDecadeAge, setLife]);

  const choose = useCallback(
    (choiceId: string) => {
      if (!life.pending) return;
      setLife(resolveChoice(content, life, choiceId));
    },
    [content, life, setLife],
  );

  // 10년 주기(10, 20, 30세...)가 되면 일시정지하고, 타임라인을 읽을 여유(1.8초)를 둔 뒤 모달을 띄운다
  useEffect(() => {
    if (prevAge.current !== life.age && life.age > 0 && life.age % 10 === 0 && !life.dead) {
      wasPlaying.current = playing;
      setPlaying(false);
      setPendingDecadeAge(life.age);

      if (decadeTimerRef.current) clearTimeout(decadeTimerRef.current);
      decadeTimerRef.current = window.setTimeout(() => {
        const curLife = lifeRef.current;
        setViewingDecade({
          age: curLife.age,
          year: curLife.year,
          mindset: curLife.mindset === 'child' ? 'work' : curLife.mindset,
          summary: getDecadeSummary(curLife, curLife.age),
          readOnly: false,
        });
      }, 1800);
    }
    prevAge.current = life.age;
    return () => {
      if (decadeTimerRef.current) clearTimeout(decadeTimerRef.current);
    };
  }, [life.age, life.dead, playing]);

  const openPendingDecade = useCallback(
    (targetAge?: number) => {
      if (decadeTimerRef.current) clearTimeout(decadeTimerRef.current);
      const age = targetAge ?? pendingDecadeAge ?? life.age;
      setViewingDecade({
        age,
        year: life.year - (life.age - age),
        mindset: mindset === 'child' ? 'work' : mindset,
        summary: getDecadeSummary(life, age),
        readOnly: false,
      });
    },
    [pendingDecadeAge, life, mindset],
  );

  const openRecordedDecade = useCallback(
    (age: number) => {
      const rec = confirmedDecades[age];
      if (!rec) return;
      setViewingDecade({
        age: rec.age,
        year: rec.year,
        mindset: rec.mindset,
        reflection: rec.reflection,
        summary: rec.summary,
        readOnly: true,
      });
    },
    [confirmedDecades],
  );

  const handleCloseDecade = useCallback(() => {
    setViewingDecade(null);
  }, []);

  const handleConfirmDecade = useCallback(
    (newMindset: string, reflectionText: string) => {
      if (!viewingDecade) return;
      const age = viewingDecade.age;
      const year = viewingDecade.year;
      const summary = viewingDecade.summary ?? getDecadeSummary(life, age);

      setConfirmedDecades((prev) => ({
        ...prev,
        [age]: {
          age,
          year,
          mindset: newMindset,
          reflection: reflectionText,
          summary,
        },
      }));

      setMindset(newMindset);
      setLife({
        ...life,
        mindset: newMindset,
        flags: [...life.flags, `reflection:${age}:${reflectionText}`],
      });

      setPendingDecadeAge(null);
      setViewingDecade(null);

      if (wasPlaying.current) {
        setPlaying(true);
      }
    },
    [viewingDecade, life, setLife],
  );

  // 직전 해가 별일 없이 지나갔는지 여부
  const isQuiet = useMemo(() => {
    if (life.log.length === 0) return false;
    const lastYear = life.year - 1;
    const entries = life.log.filter((e) => e.year === lastYear);
    return entries.length === 0 || entries.every((e) => !e.eventId && e.text.includes('별일 없이'));
  }, [life.log, life.year]);

  // 자동 진행: 보통 3초, 빨리 감기 3배. 별일 없는 해는 1/3로 단축. 갈림길·죽음·10년 요약/변곡점 대기에서는 멈춘다
  useEffect(() => {
    if (!playing || life.dead || life.pending || viewingDecade || pendingDecadeAge !== null) return;
    const delay = isQuiet ? Math.max(350, Math.round(YEAR_MS / speed / 3)) : Math.round(YEAR_MS / speed);
    const t = window.setTimeout(step, delay);
    return () => window.clearTimeout(t);
  }, [playing, life.dead, life.pending, viewingDecade, pendingDecadeAge, isQuiet, speed, step]);

  // 키보드: 갈림길 선택지(숫자키), 스페이스 진행·멈춤, → 한 해 넘기기, Enter 기록 보기
  // ※ 마음가짐은 타임라인에서 직접 바꿀 수 없으므로 숫자키를 제거함
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (life.pending) {
        const n = Number(e.key);
        const c = life.pending.choices[n - 1];
        if (c) {
          e.preventDefault();
          choose(c.id);
        }
        return;
      }
      if (life.dead) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSeeRecord();
        }
        return;
      }
      if (pendingDecadeAge !== null) {
        // 변곡점 미확정 상태에서는 진행 금지
        return;
      }
      if (e.key === ' ') {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight' || e.key === 'n') {
        e.preventDefault();
        step();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [life, choose, step, onSeeRecord, pendingDecadeAge]);

  // 새 문장이 쌓이면 연대기 끝으로
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' });
  }, [life.log.length, life.dead]);

  // 모바일에서 펼친 패널을 윗줄 바로 아래에 붙이기 위해 윗줄 높이를 잰다
  const topRef = useRef<HTMLElement>(null);
  const [topH, setTopH] = useState(110);
  useLayoutEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const measure = () => setTopH(Math.round(el.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 스크린 리더: 해가 넘어갈 때마다 그해 일어난 일을 한 번 읽어 준다 (연대기는 길어서 통째로 읽히지 않게)
  const announce = useMemo(() => {
    if (life.dead) return `${life.year}년, ${life.age}세. ${deathSentence({ death: life.dead, causeName: causeName(content, life.dead.cause) })}`;
    const y = life.pending ? life.year : life.year - 1;
    const lines = life.log.filter((e) => e.year === y).map((e) => e.text);
    const age = y - life.birth.year;
    if (life.log.length === 0 && !life.pending) return `${life.year}년, ${life.age}세.`;
    return `${y}년, ${age}세. ${lines.length ? lines.join(' ') : '별일 없이 지나갔다.'}${life.pending ? ' 갈림길이 열렸습니다.' : ''}`;
  }, [content, life]);

  const openSources = useCallback((ids: string[]) => nav.push({ name: 'sources', focus: ids }), [nav]);
  const status = findStatus(content, life.birth.eraId, life.statusId);

  const isSpeedDisabled = !!life.dead || !!life.pending || pendingDecadeAge !== null;

  const speedControls = (
    <SpeedControls
      playing={playing}
      setPlaying={setPlaying}
      speed={speed}
      setSpeed={setSpeed}
      onStep={step}
      disabled={isSpeedDisabled}
    />
  );

  return (
    <div className="page page--life" style={{ ['--life-top-h' as string]: `${topH}px` }}>
      <header className="life-top" ref={topRef}>
        <div className="life-top__row">
          <button type="button" className="text-btn life-top__home" onClick={() => nav.go({ name: 'title' })} aria-label="처음으로">
            <span aria-hidden="true">←</span>
            <span className="desk-only"> 처음으로</span>
          </button>
          <p className="life-top__when">
            <span className="life-top__era">{eraLabelOf(content, life.birth.eraId)}</span>
            <span className="life-top__year" data-testid="year">
              {life.year}년
            </span>
            <span className="life-top__age" data-testid="age">
              {life.age}세
            </span>
          </p>
          <div className="life-top__right">
            <div className="desk-only">{speedControls}</div>
            <ThemeToggle />
          </div>
        </div>
        <button
          type="button"
          className="life-top__summary mobile-only"
          aria-expanded={panelOpen}
          aria-controls="life-panel"
          onClick={() => setPanelOpen((o) => !o)}
        >
          <span className="life-top__who">
            {fullName(life.birth)} · {status.name} · {life.birth.sex === 'male' ? '남' : '여'}
          </span>
          <StatLine stats={life.stats} />
          <span className="life-top__chev" aria-hidden="true">
            {panelOpen ? '▴' : '▾'}
          </span>
        </button>
      </header>

      <div className="life-grid">
        <main className="chronicle-col">
          <Chronicle
            content={content}
            life={life}
            openSources={openSources}
            confirmedDecades={confirmedDecades}
            pendingDecadeAge={pendingDecadeAge}
            onOpenDecadeRecord={openRecordedDecade}
            onOpenPendingDecade={openPendingDecade}
          />
          <div ref={endRef} className="chronicle-end" />
          <div className="dock">
            {hint && !life.dead && (
              <p className="dock__hint" role="status">
                {hint}
              </p>
            )}
            {life.dead ? (
              <div className="dock__dead">
                <button type="button" className="btn btn--primary btn--big" onClick={onSeeRecord} autoFocus>
                  남은 기록 보기
                </button>
              </div>
            ) : pendingDecadeAge !== null ? (
              <div className="dock__pending-banner" role="alert">
                <div className="dock__pending-text-wrap">
                  <span className="dock__pending-badge">생애의 변곡점</span>
                  <p className="dock__pending-text">
                    <strong>{pendingDecadeAge}세</strong>를 맞이했습니다. 지나온 발자취를 돌아보고 앞으로의 마음가짐을 정해주세요.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--big dock__pending-btn"
                  onClick={() => openPendingDecade()}
                >
                  📜 변곡점 정하기
                </button>
              </div>
            ) : (
              <CurrentMindsetView mindset={mindset} mindsets={mindsets} child={child} />
            )}
            {!life.dead && <div className="mobile-only">{speedControls}</div>}
          </div>
        </main>

        <aside id="life-panel" className={`panel ${panelOpen ? 'is-open' : ''}`} aria-label="나의 형편">
          <SidePanel content={content} life={life} />
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      {life.pending && <ChoiceSheet content={content} life={life} onChoose={choose} openSources={openSources} />}

      {viewingDecade && (
        <DecadeModal
          open={!!viewingDecade}
          onClose={handleCloseDecade}
          content={content}
          life={life}
          targetAge={viewingDecade.age}
          targetYear={viewingDecade.year}
          initialMindset={viewingDecade.mindset}
          initialReflection={viewingDecade.reflection}
          savedSummary={viewingDecade.summary}
          readOnly={viewingDecade.readOnly}
          onConfirm={handleConfirmDecade}
        />
      )}
    </div>
  );
}

function SpeedControls({
  playing,
  setPlaying,
  speed,
  setSpeed,
  onStep,
  disabled,
}: {
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: 1 | 3;
  setSpeed: (s: 1 | 3) => void;
  onStep: () => void;
  disabled: boolean;
}) {
  return (
    <div className="speed" role="group" aria-label="속도 조절">
      <button type="button" className="speed__btn speed__play" onClick={() => setPlaying(!playing)} disabled={disabled} aria-pressed={playing}>
        {playing ? '멈춤' : '진행'}
      </button>
      <button type="button" className="speed__btn" onClick={onStep} disabled={disabled || playing}>
        한 해 넘기기
      </button>
      <button
        type="button"
        className="speed__btn"
        onClick={() => setSpeed(speed === 1 ? 3 : 1)}
        aria-pressed={speed === 3}
        aria-label={speed === 3 ? '빠르게 ×3: 눌러서 보통 속도로' : '보통 ×1: 눌러서 빨리 감기(3배)'}
      >
        {speed === 3 ? '빠르게 ×3' : '보통 ×1'}
      </button>
    </div>
  );
}

function CurrentMindsetView({
  mindset,
  mindsets,
  child,
}: {
  mindset: string;
  mindsets: { id: string; name: string }[];
  child: boolean;
}) {
  const cur = mindsets.find((m) => m.id === mindset);
  const desc = MINDSET_DESC[mindset] ?? '';

  return (
    <div className="current-mindset" role="region" aria-label="현재의 마음가짐">
      <div className="current-mindset__label-row">
        <span className="current-mindset__label">현재의 마음가짐</span>
        <span className="current-mindset__hint">
          {child ? '어린 시절' : '※ 10년 주기 변곡점에서만 변경할 수 있습니다'}
        </span>
      </div>
      <div className="current-mindset__card">
        {child ? (
          <p className="current-mindset__child-text">어린 시절에는 정해진 마음가짐 없이 자라납니다.</p>
        ) : (
          <div className="current-mindset__content">
            <span className="current-mindset__badge">{cur?.name ?? mindset}</span>
            <span className="current-mindset__desc">{desc}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────── 연대기 ─────────────

type Group = { kind: 'year'; year: number; age: number; entries: LogEntry[] } | { kind: 'quiet'; from: number; to: number };

function groupLog(life: LifeState): Group[] {
  const byYear = new Map<number, LogEntry[]>();
  for (const e of life.log) {
    const list = byYear.get(e.year) ?? [];
    list.push(e);
    byYear.set(e.year, list);
  }
  const last = life.dead || life.pending ? life.year : life.year - 1;
  const groups: Group[] = [];
  let quietFrom: number | null = null;
  for (let y = life.birth.year; y <= last; y++) {
    const entries = byYear.get(y);
    if (entries) {
      if (quietFrom !== null) groups.push({ kind: 'quiet', from: quietFrom, to: y - 1 });
      quietFrom = null;
      groups.push({ kind: 'year', year: y, age: y - life.birth.year, entries });
    } else if (quietFrom === null) quietFrom = y;
  }
  if (quietFrom !== null) groups.push({ kind: 'quiet', from: quietFrom, to: last });
  return groups;
}

function eventOf(content: Content, id?: string): EventDef | null {
  if (!id) return null;
  try {
    return getEvent(content, id);
  } catch {
    return null;
  }
}

function Chronicle({
  content,
  life,
  openSources,
  confirmedDecades,
  pendingDecadeAge,
  onOpenDecadeRecord,
  onOpenPendingDecade,
}: {
  content: Content;
  life: LifeState;
  openSources: (ids: string[]) => void;
  confirmedDecades: Record<number, ConfirmedDecade>;
  pendingDecadeAge: number | null;
  onOpenDecadeRecord: (age: number) => void;
  onOpenPendingDecade: (age: number) => void;
}) {
  const groups = groupLog(life);
  const b = life.birth;
  const region = content.eras.find((e) => e.id === b.eraId)?.regions.find((r) => r.id === b.regionId)?.name ?? '';
  return (
    <ol className="chronicle" aria-label="연대기">
      <li className="chronicle__birth">
        <span className="chronicle__year">
          {b.year}년 {b.month}월
        </span>
        <p>
          {region} 땅에서 {fullName(b)}{' '}
          {life.lifeIndex > 0 ? '다시 태어났다. 이번에는 기억을 품고.' : '태어났다.'}
        </p>
      </li>
      {groups.map((g) =>
        g.kind === 'quiet' ? (
          <li key={`q${g.from}`} className="chronicle__quiet">
            {g.from === g.to ? `${g.from}년` : `${g.from}–${g.to}년`} · 별일 없이 지나갔다
          </li>
        ) : (
          <li key={g.year} className="chronicle__year-group">
            <h3 className="chronicle__year">
              {g.year}년 <span className="chronicle__reign">{reignOf(content, life, g.year)}</span>
              <span className="chronicle__age">{g.age}세</span>
            </h3>
            <ul className="chronicle__entries">
              {g.entries.map((e, i) => {
                const ev = eventOf(content, e.eventId);
                const firstOfEvent = ev && g.entries.findIndex((x) => x.eventId === e.eventId) === i;
                const showSource = firstOfEvent && ev && (ev.kind === 'timeline' || ev.confidence !== 'adapted');
                return (
                  <li key={i} className={`entry entry--${e.kind}`}>
                    {e.kind === 'knowledge' && <span className="entry__mark">지식</span>}
                    {e.month && firstOfEvent && !e.text.startsWith(`${e.month}월`) ? <span className="entry__month">{e.month}월</span> : null}
                    <span className="entry__text">{e.text}</span>
                    {showSource && ev && <ConfidenceTag value={ev.confidence} onClick={() => openSources(ev.sourceRefs)} />}
                  </li>
                );
              })}
            </ul>

            {/* 10년 주기 변곡점 링크 또는 정하기 버튼 */}
            {g.age > 0 && g.age % 10 === 0 && (
              <div className="chronicle__decade-box">
                {confirmedDecades[g.age] ? (
                  <button
                    type="button"
                    className="decade-review-link"
                    onClick={() => onOpenDecadeRecord(g.age)}
                  >
                    <span className="decade-review-link__icon">📜</span>
                    <span className="decade-review-link__title">{g.age}세 생애의 변곡점 기록 보기</span>
                    <span className="decade-review-link__badge">
                      {content.mindsets.find((m) => m.id === confirmedDecades[g.age].mindset)?.name ?? confirmedDecades[g.age].mindset}
                    </span>
                  </button>
                ) : pendingDecadeAge === g.age ? (
                  <button
                    type="button"
                    className="btn btn--primary decade-pending-trigger"
                    onClick={() => onOpenPendingDecade(g.age)}
                  >
                    📜 {g.age}세 생애의 변곡점 정하기
                  </button>
                ) : null}
              </div>
            )}
          </li>
        ),
      )}
      {life.dead && (
        <li className="chronicle__death" data-testid="death-line">
          {deathSentence({ death: life.dead, causeName: causeName(content, life.dead.cause) })}
        </li>
      )}
    </ol>
  );
}

// ───────────── 옆 패널 ─────────────

function SidePanel({ content, life }: { content: Content; life: LifeState }) {
  const status = findStatus(content, life.birth.eraId, life.statusId);
  const born = findStatus(content, life.birth.eraId, life.birth.statusId);
  const f = life.family;
  const regressed = life.lifeIndex > 0;
  const memories = regressed ? memoryLines(content, life) : [];
  const influence = computeInfluence(content, life);
  return (
    <div className="panel__inner">
      <section className="panel__sec">
        <h2 className="label">나</h2>
        <p className="panel__who">
          {fullName(life.birth)} <span className="panel__status">{status.name}</span>{' '}
          <span className="badge badge--sex">{life.birth.sex === 'male' ? '남성' : '여성'}</span>
        </p>
        {status.id !== born.id && <p className="hint">태어날 때 신분: {born.name}</p>}
        <StatBars stats={life.stats} />
      </section>
      <section className="panel__sec">
        <h2 className="label">가족</h2>
        <ul className="facts">
          <li>부모 {f.parentsAlive === 2 ? '두 분 다 살아 계심' : f.parentsAlive === 1 ? '한 분 살아 계심' : '모두 여읨'}</li>
          <li>형제자매 {f.siblings}명</li>
          <li>{f.married ? '혼인함' : life.flags.includes('widowed') ? '배우자를 여읨' : '혼인 전'}</li>
          {(f.children > 0 || f.childrenDied > 0) && (
            <li>
              자녀 {f.children}명{f.childrenDied > 0 ? ` (앞세운 아이 ${f.childrenDied}명)` : ''}
            </li>
          )}
        </ul>
      </section>
      {regressed && (
        <section className="panel__sec">
          <h2 className="label">기억과 지식</h2>
          <p>
            영향력 <strong>{INFLUENCE_LABEL[influence]}</strong>
            <span className="hint"> — 현대 지식이 닿는 범위</span>
          </p>
          {memories.length > 0 && (
            <ul className="memory-list memory-list--small">
              {memories.map((m) => (
                <li key={m.key}>
                  {m.when && <span className="memory-list__when">{m.when}</span>} {m.text}
                </li>
              ))}
            </ul>
          )}
          {life.knowledgeUsed.length > 0 && <p className="hint">이번 생에 쓴 현대 지식 {life.knowledgeUsed.length}가지</p>}
        </section>
      )}
      <p className="panel__meta">
        {regressionLabel(life.lifeIndex)} · 시드 <code>{life.seed}</code>
      </p>
    </div>
  );
}


