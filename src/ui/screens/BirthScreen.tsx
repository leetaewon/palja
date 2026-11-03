// 출생 공개 (PRD 4-2)
import { findEra, findStatus, MAX_REGRESSIONS, regressionsLeft, statusProbability, type LifeState } from '../../engine';
import { useApp } from '../context';
import { BrushRule, ConfidenceTag, Seal, TopBar } from '../components/common';
import { StatBars } from '../components/StatBars';
import { eraLabelOf } from '../lib/eras';
import { memoryLines } from '../lib/memory';
import { birthSentence, reignOf } from '../lib/summary';
import { fullName, perHundred, wasNoun, WEALTH_GRADE } from '../lib/text';

export function BirthScreen({ life, onStart }: { life: LifeState; onStart: () => void }) {
  const { content, nav } = useApp();
  const b = life.birth;
  const era = findEra(content, b.eraId);
  const status = findStatus(content, b.eraId, b.statusId);
  const n = perHundred(statusProbability(content, b.eraId, b.statusId));
  const royal = status.id === 'royal' || status.nameGroup === 'royal';
  const source = content.sources.find((s) => s.id === status.sourceRef);
  const regressed = life.lifeIndex > 0;
  const memories = memoryLines(content, life);

  return (
    <div className="page">
      <TopBar back="home" title={eraLabelOf(content, b.eraId)} />
      <main className="birth">
        {regressed && (
          <section className="regress-banner" aria-label="팔자 고치기">
            <Seal text="회귀" size={44} tilt={-8} />
            <div>
              <p className="regress-banner__title">
                팔자를 고치러 돌아왔습니다. ({life.lifeIndex}/{MAX_REGRESSIONS}, 남은 {regressionsLeft(life)}회)
              </p>
              <p>같은 해, 같은 집안에 다시 태어납니다. 이번에는 지난 삶을 기억하고, 현대 지식을 쓸 수 있어요.</p>
              {memories.length > 0 ? (
                <ul className="memory-list">
                  {memories.map((m) => (
                    <li key={m.key}>
                      {m.when && <span className="memory-list__when">{m.when}</span>} {m.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">지난 삶에서 또렷이 기억할 만한 큰일은 겪지 못했습니다.</p>
              )}
            </div>
          </section>
        )}

        <section className="birth__card" aria-labelledby="birth-name">
          <p className="birth__year">
            {b.year}년 {b.month}월 <span className="birth__reign">{reignOf(content, life, b.year)}</span>
          </p>
          <h1 id="birth-name" className="birth__name">
            {fullName(b)}
          </h1>
          <p className="birth__sentence" data-testid="birth-sentence">
            {birthSentence(content, life)}
          </p>
          <Seal text={status.name.slice(0, 2)} size={72} className="birth__seal" tilt={-6} />
        </section>

        <section className={`odds ${royal ? 'odds--royal' : ''}`} aria-labelledby="odds-h">
          <h2 id="odds-h" className="label">
            이 신분으로 태어날 확률
          </h2>
          <div className="odds__figure">
            <HundredDots filled={n} />
            <p className="odds__text">
              {royal ? (
                <>
                  이 게임에서는 100명 중 <strong>{n}명</strong>이 {status.name}으로 태어납니다.
                </>
              ) : (
                <>
                  이 시대 사람 100명 중 <strong>{n}명</strong>이 {wasNoun(status.name)}.
                </>
              )}
            </p>
          </div>
          {royal && (
            <p className="odds__royal" role="note">
              실제로는 약 1만 명 중 1명보다 드물었습니다. 이 게임은 재미를 위해 100명 중 1명으로 보정했습니다.
            </p>
          )}
          <div className="odds__src">
            {source && <ConfidenceTag value={source.confidence} />}
            <button
              type="button"
              className="text-btn"
              onClick={() => nav.push({ name: 'sources', focus: [status.sourceRef, ...era.sourceRefs] })}
            >
              근거 보기 <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section className="birth__family" aria-labelledby="family-h">
          <h2 id="family-h" className="label">
            타고난 것
          </h2>
          <p>
            {WEALTH_GRADE[b.family.wealthGrade]} 집안, 형제자매 {b.family.siblings === 0 ? '없이 혼자' : `${b.family.siblings}명`}.
          </p>
          <StatBars stats={life.stats} />
        </section>

        <BrushRule />

        <div className="birth__actions">
          <button type="button" className="btn btn--primary btn--big" onClick={onStart} autoFocus>
            {regressed ? '다시 살아 보기' : '일생 시작'}
          </button>
          <p className="seed-line">
            시드 <code>{b.seed}</code>
          </p>
        </div>
      </main>
    </div>
  );
}

/** 100칸 중 n칸을 먹으로 채운 그림 */
function HundredDots({ filled }: { filled: number }) {
  return (
    <svg className="dots" viewBox="0 0 100 100" role="img" aria-label={`100명 중 ${filled}명`}>
      {Array.from({ length: 100 }, (_, i) => {
        const x = (i % 10) * 10 + 5;
        const y = Math.floor(i / 10) * 10 + 5;
        return <circle key={i} cx={x} cy={y} r={3.3} className={i < filled ? 'dots__on' : 'dots__off'} />;
      })}
    </svg>
  );
}
