import { useState } from 'react';
import type { LifeState } from '../../engine';
import { useApp } from '../context';
import { BrushRule, Seal, TopBar } from '../components/common';
import { eraLabelOf, eraSlots } from '../lib/eras';
import { normalizeSeed } from '../lib/seed';
import { fullName } from '../lib/text';
import { regressionLabel } from '../lib/summary';

export function Notice() {
  return (
    <ul className="notice">
      <li>역사 연구를 바탕으로 한 추정과 게임 각색이 섞여 있습니다. 각 사건의 근거와 신뢰도는 「근거 보기」에서 확인할 수 있어요.</li>
      <li>권장 나이 15세 이상. 전쟁·역병·신분 차별·어린 죽음 같은 무거운 소재를 담담하게 다룹니다.</li>
      <li>진행 상황은 이 기기의 브라우저에만 저장되고, 어디로도 보내지 않아요.</li>
    </ul>
  );
}

export function TitleScreen({
  canResume,
  life,
  onNew,
  onResume,
}: {
  canResume: boolean;
  life: LifeState | null;
  onNew: (seed?: string) => void;
  onResume: () => void;
}) {
  const { content, nav } = useApp();
  const [seedInput, setSeedInput] = useState('');
  const slots = eraSlots(content);
  const seed = normalizeSeed(seedInput);

  return (
    <div className="page page--title">
      <TopBar />
      <main className="title">
        <section className="title__hero" aria-labelledby="game-title">
          <div className="title__brand">
            <h1 id="game-title" className="title__name">
              팔자
            </h1>
            <Seal text="팔자" size={60} className="title__seal" tilt={6} />
          </div>
          <p className="title__lead">
            삼국에서 조선까지, 이 땅 어딘가에 무작위로 태어나 한 번의 일생을 삽니다. 죽으면 <strong>팔자를 고치러</strong> 같은 삶으로
            돌아가거나, 전혀 다른 삶으로 다시 태어납니다.
          </p>
        </section>

        <nav className="title__menu" aria-label="시작 메뉴">
          <button type="button" className="btn btn--primary btn--big" onClick={() => onNew()}>
            새 환생
          </button>
          {canResume && life && (
            <button type="button" className="btn btn--big" onClick={onResume}>
              이어하기
              <span className="btn__sub">
                {fullName(life.birth)} · {eraLabelOf(content, life.birth.eraId)} · {life.dead ? '기록을 볼 차례' : `${life.age}세`} ·{' '}
                {regressionLabel(life.lifeIndex)}
              </span>
            </button>
          )}
          <div className="title__minor">
            <button type="button" className="btn" onClick={() => nav.push({ name: 'codex' })}>
              인생 도감
            </button>
            <button type="button" className="btn" onClick={() => nav.push({ name: 'sources' })}>
              근거 보기
            </button>
            <button type="button" className="btn" onClick={() => nav.push({ name: 'about' })}>
              이 게임에 대하여
            </button>
          </div>
        </nav>

        <BrushRule />

        <section className="title__eras" aria-labelledby="eras-h">
          <h2 id="eras-h" className="label">
            태어날 수 있는 시대
          </h2>
          <ol className="era-strip">
            {slots.map((s) => (
              <li key={s.key} className={`era-strip__item ${s.era ? 'is-open' : 'is-soon'}`}>
                <span className="era-strip__year">{s.label}</span>
                <span className="era-strip__title">{s.title}</span>
                <span className="era-strip__state">{s.era ? '열림' : '준비 중'}</span>
              </li>
            ))}
          </ol>
          <p className="hint">열린 시대 가운데 하나에 같은 확률로 태어납니다.</p>
        </section>

        <details className="seed-box">
          <summary>시드로 태어나기</summary>
          <form
            className="seed-box__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (seed) onNew(seed);
            }}
          >
            <label htmlFor="seed-input" className="seed-box__label">
              같은 시드를 넣으면 같은 출생으로 태어납니다.
            </label>
            <div className="seed-box__row">
              <input
                id="seed-input"
                className="input"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="예: hanji27"
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn" disabled={!seed}>
                태어나기
              </button>
            </div>
          </form>
        </details>

        <Notice />
      </main>
    </div>
  );
}
