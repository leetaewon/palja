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
import { eraLabelOf } from '../lib/eras';
import { memoryLines } from '../lib/memory';
import { deathSentence, regressionLabel, reignOf } from '../lib/summary';
import { fullName, INFLUENCE_LABEL } from '../lib/text';

const YEAR_MS = 3000;

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
  const child = life.age < CHILD_AGE;
  const prevAge = useRef(life.age);

  const step = useCallback(() => {
    if (life.dead || life.pending) return;
    if (life.age > CHILD_AGE) setHint(null);
    setLife(advanceYear(content, life, life.age >= CHILD_AGE ? mindset : undefined));
  }, [content, life, mindset, setLife]);

  const choose = useCallback(
    (choiceId: string) => {
      if (!life.pending) return;
      setLife(resolveChoice(content, life, choiceId));
    },
    [content, life, setLife],
  );

  // 열 살이 되면 한 번 멈추고 마음가짐을 고르게 한다
  useEffect(() => {
    if (prevAge.current < CHILD_AGE && life.age >= CHILD_AGE && !life.dead) {
      setPlaying(false);
      setHint('열 살이 되었어요. 이제 해마다 마음가짐을 고를 수 있어요. 고른 뒤 다시 진행해 주세요.');
    }
    prevAge.current = life.age;
  }, [life.age, life.dead]);

  // 자동 진행: 한 해 약 3초, 빨리 감기 3배. 갈림길·죽음에서는 멈춘다
  useEffect(() => {
    if (!playing || life.dead || life.pending) return;
    const t = window.setTimeout(step, YEAR_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, life, speed, step]);

  // 키보드: 숫자키 마음가짐/선택지, 스페이스 진행·멈춤, → 한 해 넘기기, Enter 기록 보기
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
      if (/^[1-9]$/.test(e.key) && !child) {
        const m = mindsets[Number(e.key) - 1];
        if (m) {
          e.preventDefault();
          setMindset(m.id);
          setHint(null);
        }
      } else if (e.key === ' ') {
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
  }, [life, child, mindsets, choose, step, onSeeRecord]);

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

  const openSources = useCallback((ids: string[]) => nav.push({ name: 'sources', focus: ids }), [nav]);
  const status = findStatus(content, life.birth.eraId, life.statusId);

  const speedControls = (
    <SpeedControls
      playing={playing}
      setPlaying={setPlaying}
      speed={speed}
      setSpeed={setSpeed}
      onStep={step}
      disabled={!!life.dead || !!life.pending}
    />
  );

  return (
    <div className="page page--life" style={{ ['--life-top-h' as string]: `${topH}px` }}>
      <header className="life-top" ref={topRef}>
        <div className="life-top__row">
          <button type="button" className="text-btn life-top__home" onClick={() => nav.go({ name: 'title' })} aria-label="처음 화면으로">
            <span aria-hidden="true">←</span>
            <span className="desk-only"> 처음으로</span>
          </button>
          <p className="life-top__when" aria-live="polite">
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
            {fullName(life.birth)} · {status.name}
          </span>
          <StatLine stats={life.stats} />
          <span className="life-top__chev" aria-hidden="true">
            {panelOpen ? '▴' : '▾'}
          </span>
        </button>
      </header>

      <div className="life-grid">
        <main className="chronicle-col">
          <Chronicle content={content} life={life} openSources={openSources} />
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
            ) : (
              <MindsetPicker
                mindsets={mindsets}
                value={mindset}
                disabled={child}
                onChange={(id) => {
                  setMindset(id);
                  setHint(null);
                }}
              />
            )}
            <div className="mobile-only">{speedControls}</div>
          </div>
        </main>

        <aside id="life-panel" className={`panel ${panelOpen ? 'is-open' : ''}`} aria-label="나의 형편">
          <SidePanel content={content} life={life} />
        </aside>
      </div>

      {life.pending && <ChoiceSheet content={content} life={life} onChoose={choose} openSources={openSources} />}
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
        aria-label={speed === 3 ? '빨리 감기 끄기' : '빨리 감기 (3배)'}
      >
        {speed === 3 ? '빠르게 ×3' : '보통 ×1'}
      </button>
    </div>
  );
}

function MindsetPicker({
  mindsets,
  value,
  disabled,
  onChange,
}: {
  mindsets: { id: string; name: string }[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="mindset" disabled={disabled}>
      <legend className="mindset__legend">
        {disabled ? '어린 시절에는 마음가짐 없이 흘러갑니다' : '올해의 마음가짐'}
      </legend>
      <div className="mindset__options">
        {mindsets.map((m, i) => (
          <label key={m.id} className={`mindset__opt ${value === m.id && !disabled ? 'is-on' : ''}`}>
            <input type="radio" name="mindset" value={m.id} checked={value === m.id} onChange={() => onChange(m.id)} />
            <span className="mindset__key desk-only" aria-hidden="true">
              {i + 1}
            </span>
            <span>{m.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
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

function Chronicle({ content, life, openSources }: { content: Content; life: LifeState; openSources: (ids: string[]) => void }) {
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
          {fullName(life.birth)} <span className="panel__status">{status.name}</span>
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
