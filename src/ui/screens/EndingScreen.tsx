// 엔딩: 기록 (PRD 8장)
import { useEffect, useMemo, useState } from 'react';
import { findEra, findStatus, judgeEnding, MAX_REGRESSIONS, neighbors, type Ending, type LifeState } from '../../engine';
import { useApp } from '../context';
import { BrushRule, Seal, TopBar } from '../components/common';
import { eraLabelOf } from '../lib/eras';
import { addRecentLife } from '../lib/storage';
import { birthSentence, deathSentence, regressionLabel, resultText } from '../lib/summary';
import { fullName, josa, RECORD_LABEL, SCOPE_LABEL } from '../lib/text';
import { useRevealSkip } from '../lib/motion';

const EPITAPH_MAX = 40;

function getSuggestedEpitaph(life: LifeState, ending: Ending): string {
  const age = life.dead?.age ?? 0;
  const cause = life.dead?.cause ?? '';
  if (age < 5) return '짧은 봄날 꿈처럼 지나간 삶.';
  if (age < 15) return '피어나지 못한 꽃봉오리로 잠들다.';
  if (cause === 'war' || cause.includes('전란')) return '모진 전란 속에서도 물러서지 않았다.';
  if (cause === 'epidemic' || cause.includes('역병') || cause.includes('두창') || cause.includes('마마')) return '모진 돌림병 속에서도 묵묵히 버텨낸 생애.';
  if (ending.record.level === 'sillok' || ending.record.level === 'munjip') return '세상에 뜻을 펴고 나라의 기록에 이름을 남기다.';
  if (ending.changes.length > 0) return '작은 힘으로 세상을 조금이나마 따뜻하게 밝혔으니 여한이 없다.';
  if (life.statusId === 'slave' || life.birth.statusId === 'slave') return '흙에서 태어나 평생 땀 흘리다 흙으로 돌아가다.';
  if (age >= 60) return '모진 풍파를 다 겪고 평안히 눈을 감다.';
  return '이 땅에 태어나 한평생 정직하게 살다 가다.';
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function EndingScreen({
  life,
  epitaph,
  setEpitaph,
  onRegress,
  onNew,
}: {
  life: LifeState;
  epitaph: string;
  setEpitaph: (t: string) => void;
  onRegress: () => void;
  onNew: () => void;
}) {
  const { content, nav } = useApp();
  const ending = useMemo(() => judgeEnding(content, life), [content, life]);
  const people = useMemo(() => neighbors(content, life.birth), [content, life.birth]);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showPeople, setShowPeople] = useState(life.dead ? life.dead.age >= 5 : true);
  const [showTimeline, setShowTimeline] = useState(false);
  const short = (life.dead?.age ?? 0) < 5;
  const rec = ending.record;
  const status = findStatus(content, life.birth.eraId, life.statusId);

  // 묘비명이 비어 있으면 추천 문구 자동 채우기
  useEffect(() => {
    if (!epitaph.trim()) {
      setEpitaph(getSuggestedEpitaph(life, ending));
    }
  }, [life, ending, epitaph, setEpitaph]);

  // 최근 삶의 기록 저장
  useEffect(() => {
    if (!life.dead) return;
    const era = findEra(content, life.birth.eraId);
    addRecentLife({
      id: `${life.seed}#${life.lifeIndex}`,
      timestamp: Date.now(),
      eraId: life.birth.eraId,
      eraTitle: era.title,
      name: fullName(life.birth),
      sex: life.birth.sex,
      statusName: status.name,
      birthYear: life.birth.year,
      deathYear: life.dead.year,
      ageAtDeath: life.dead.age,
      causeName: ending.causeName,
      birthSentence: birthSentence(content, life),
      deathSentence: deathSentence(ending),
      recordText: rec.text ?? null,
      recordLevel: rec.level,
      epitaph: epitaph.trim() || getSuggestedEpitaph(life, ending),
      lifeIndex: life.lifeIndex,
      changes: ending.changes,
      log: life.log.map((l) => ({ year: l.year, age: l.age, text: l.text, kind: l.kind })),
    });
  }, [content, life, ending, rec, status, epitaph]);
  // 이 시점의 기록 엔딩 근거와 사망 모델 근거를 먼저 보여 준다
  const endingSources = [`records-${life.birth.eraId}`, 'life-expectancy', 'mortality-model'].filter((id) =>
    content.sources.some((s) => s.id === id),
  );
  const [revealed] = useRevealSkip();

  return (
    <div className={`page page--ending reveal ${rec.text ? 'ending--recorded' : 'ending--unrecorded'} ${revealed ? 'reveal--done' : ''}`}>
      <TopBar back="home" title={eraLabelOf(content, life.birth.eraId)} />
      <main className="ending">
        <section className="ending__death" aria-labelledby="death-h">
          <p className="label">{regressionLabel(life.lifeIndex)}</p>
          <h1 id="death-h" className="ending__name">
            {fullName(life.birth)}
            <span className="ending__status">{status.name}</span>
          </h1>
          <p className="ending__birth">{birthSentence(content, life)}</p>
          <p className="ending__line" data-testid="death-sentence">
            {deathSentence(ending)}
          </p>
          {short && <p className="ending__short">짧은 생이었습니다. 이 시대에는 다섯 살을 넘기지 못한 아이가 많았습니다.</p>}
        </section>

        <section className={`record record--${rec.level}`} aria-labelledby="record-h">
          <h2 id="record-h" className="label">
            남은 기록
          </h2>
          {rec.text ? (
            <div className="record__paper">
              <p className="record__text" lang="ko" data-testid="record-text">
                {rec.text}
              </p>
              <div className="record__stamp">
                <Seal text={RECORD_LABEL[rec.level].slice(0, 2)} size={58} tilt={-7} />
                <span className="record__kind">{RECORD_LABEL[rec.level]}</span>
              </div>
            </div>
          ) : (
            <p className="record__none" data-testid="record-text">
              당신의 삶은 어디에도 기록되지 않았습니다.
            </p>
          )}
        </section>

        {life.lifeIndex > 0 && (
          <section className="changes" aria-labelledby="changes-h">
            <h2 id="changes-h" className="label">
              이번 생에서 바꾼 것
            </h2>
            {ending.changes.length > 0 ? (
              <ul className="changes__list">
                {ending.changes.map((c, i) => (
                  <li key={i} className={`changes__item changes__item--${c.scope}`}>
                    <span className="changes__scope">{SCOPE_LABEL[c.scope]}</span>
                    <span>
                      <span className="changes__year">{c.year}년</span> {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">이번 생에는 세상에 남긴 변화가 없었습니다.</p>
            )}
          </section>
        )}

        <section className="epitaph" aria-labelledby="epitaph-h">
          <h2 id="epitaph-h" className="label">
            <label htmlFor="epitaph-input">묘비 한 줄</label>
          </h2>
          <input
            id="epitaph-input"
            className="input epitaph__input"
            value={epitaph}
            maxLength={EPITAPH_MAX}
            onChange={(e) => setEpitaph(e.target.value.slice(0, EPITAPH_MAX))}
            placeholder="이 삶에 남길 말 (선택)"
            autoComplete="off"
          />
          <p className="hint">
            {epitaph.length}/{EPITAPH_MAX}자 · 이 기기에만 저장돼요.
          </p>
        </section>

        <section className="neighbors" aria-labelledby="nb-h">
          <h2 id="nb-h" className="label">
            같은 해 같은 고을에 태어난 사람들
          </h2>
          {showPeople ? (
            <ul className="neighbors__list">
              {people.map((p, i) => (
                <li key={i} className="neighbors__item">
                  <span className="neighbors__name">{p.name}</span>
                  <span className="neighbors__desc">
                    {p.statusName} {p.sex === 'male' ? '남' : '여'} · {p.ageAtDeath}세에 {josa(p.causeName, '으로/로')} 세상을 떠남
                    {p.recordLevel !== 'none' ? ` · ${RECORD_LABEL[p.recordLevel]}에 이름이 남음` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" className="text-btn" onClick={() => setShowPeople(true)}>
              펼쳐 보기
            </button>
          )}
        </section>

        <section className="timeline-review" aria-labelledby="timeline-h">
          <h2 id="timeline-h" className="label">
            일생 연대기
          </h2>
          {showTimeline ? (
            <div className="timeline-review__content">
              <button type="button" className="text-btn timeline-review__toggle" onClick={() => setShowTimeline(false)}>
                ▴ 연대기 접기
              </button>
              <ol className="timeline-review__list">
                {life.log.map((l, i) => (
                  <li key={i} className={`timeline-review__item timeline-review__item--${l.kind || 'normal'}`}>
                    <span className="timeline-review__year">{l.year}년 ({l.age}세)</span>
                    <span className="timeline-review__text">{l.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <button type="button" className="btn btn--ghost timeline-review__open" onClick={() => setShowTimeline(true)}>
              일생 연대기 전체 다시 읽기 ({life.log.length}개 기록) ▾
            </button>
          )}
        </section>

        <BrushRule />

        <div className="ending__actions">
          <button
            type="button"
            className="btn btn--primary btn--big"
            onClick={onRegress}
            disabled={ending.regressionsLeft <= 0}
            autoFocus={ending.regressionsLeft > 0}
          >
            팔자 고치기
            <span className="btn__sub">
              {ending.regressionsLeft > 0
                ? `같은 출생으로 돌아가기 · 남은 ${ending.regressionsLeft}/${MAX_REGRESSIONS}회`
                : '이 인생의 팔자 고치기를 모두 썼어요'}
            </span>
          </button>
          <button type="button" className="btn btn--big" onClick={onNew} autoFocus={ending.regressionsLeft <= 0}>
            새 환생
            <span className="btn__sub">전혀 다른 삶으로</span>
          </button>
          <div className="ending__minor">
            <button
              type="button"
              className="btn"
              onClick={async () => setCopied((await copyText(resultText(content, life, ending, epitaph))) ? 'ok' : 'fail')}
            >
              결과 복사
            </button>
            <button type="button" className="btn" onClick={() => nav.push({ name: 'codex' })}>
              인생 도감
            </button>
            <button type="button" className="btn" onClick={() => nav.push({ name: 'sources', focus: endingSources })}>
              근거 보기
            </button>
          </div>
          <p className="hint" role="status" aria-live="polite">
            {copied === 'ok' ? '복사했어요. 원하는 곳에 붙여 넣으세요.' : copied === 'fail' ? '복사하지 못했어요. 브라우저 설정을 확인해 주세요.' : ''}
          </p>
          <p className="seed-line">
            시드 <code>{life.seed}</code>
          </p>
        </div>
      </main>
    </div>
  );
}
