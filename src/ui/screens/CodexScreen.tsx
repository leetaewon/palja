// 인생 도감: 시점 × 신분 칸. 살아 본 조합이 채워진다 (PRD 9장)
import { useMemo, useState } from 'react';
import { RECORD_LEVELS } from '../../engine';
import { useApp } from '../context';
import { BrushRule, Seal, TopBar } from '../components/common';
import { eraSlots } from '../lib/eras';
import { loadCodex, loadRecentLives, type RecentLife } from '../lib/storage';
import { RECORD_LABEL } from '../lib/text';

export function CodexScreen() {
  const { content } = useApp();
  const codex = useMemo(() => loadCodex(), []);
  const recentLives = useMemo(() => loadRecentLives(), []);
  const [selectedRecent, setSelectedRecent] = useState<RecentLife | null>(null);
  const slots = eraSlots(content);
  const open = slots.filter((s) => s.era);
  const total = open.reduce((n, s) => n + (s.era?.statuses.length ?? 0), 0);
  const filled = open.reduce((n, s) => n + (s.era?.statuses.filter((st) => codex.cells[`${s.era?.id}/${st.id}`]).length ?? 0), 0);
  const lives = Object.values(codex.cells).reduce((n, c) => n + c.lives, 0);

  return (
    <div className="page">
      <TopBar back="back" title="인생 도감" />
      <main className="codex">
        <header className="codex__head">
          <h1 className="display">인생 도감</h1>
          <p>
            살아 본 시대와 신분의 칸에 도장이 찍힙니다. 지금까지 <strong data-testid="codex-count">{filled}</strong>/{total}칸, 모두 {lives}번의
            삶을 살았습니다.
          </p>
          <p className="hint">태어날 때의 신분으로 칸을 채웁니다. 팔자를 고친 삶도 한 번의 삶으로 셉니다.</p>
        </header>

        {/* 최근 삶의 기록 (서고) */}
        {recentLives.length > 0 && (
          <section className="codex__recent" aria-labelledby="recent-h">
            <h2 id="recent-h" className="label">
              최근 삶의 기록
            </h2>
            <ul className="recent-list">
              {recentLives.map((r) => {
                const isSelected = selectedRecent?.id === r.id;
                return (
                  <li key={r.id} className={`recent-item ${isSelected ? 'is-expanded' : ''}`}>
                    <div className="recent-item__summary" onClick={() => setSelectedRecent(isSelected ? null : r)}>
                      <div className="recent-item__main">
                        <span className="recent-item__name">
                          <strong>{r.name}</strong> ({r.statusName} · {r.sex === 'male' ? '남' : '여'})
                        </span>
                        <span className="recent-item__era">
                          {r.eraTitle} · 향년 {r.ageAtDeath}세 ({r.causeName})
                        </span>
                      </div>
                      <div className="recent-item__right">
                        <span className="recent-item__badge">{RECORD_LABEL[r.recordLevel]}</span>
                        <span className="recent-item__chev" aria-hidden="true">
                          {isSelected ? '▴' : '▾'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="recent-item__detail">
                        <p className="recent-item__birth">{r.birthSentence}</p>
                        <p className="recent-item__death">{r.deathSentence}</p>

                        <div className="recent-item__record">
                          <p className="label">남은 기록</p>
                          <p className="recent-item__record-text">
                            {r.recordText || '당신의 삶은 어디에도 기록되지 않았습니다.'}
                          </p>
                        </div>

                        {r.epitaph && (
                          <div className="recent-item__epitaph">
                            <span className="label">새긴 묘비</span>
                            <p className="recent-item__epitaph-text">“{r.epitaph}”</p>
                          </div>
                        )}

                        <div className="recent-item__log">
                          <p className="label">일생 연대기 ({r.log.length}개 기록)</p>
                          <ol className="recent-log-list">
                            {r.log.map((l, idx) => (
                              <li key={idx} className="recent-log-item">
                                <span className="recent-log-item__year">{l.year}년 ({l.age}세)</span>
                                <span>{l.text}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <BrushRule />

        <h2 className="label">시대별 신분 도감</h2>

        {slots.map((s) => (
          <section key={s.key} className={`codex__era ${s.era ? '' : 'is-soon'}`} aria-labelledby={`cx-${s.key}`}>
            <h2 id={`cx-${s.key}`} className="codex__era-title">
              <span className="codex__era-year">{s.label}</span> {s.title}
              <span className="codex__era-range">
                {s.birthYears[0]}~{s.birthYears[1]}년 출생
              </span>
            </h2>
            {s.era ? (
              <ul className="codex__grid">
                {/* 시점 파일의 신분 순서(위계 순)를 그대로 따른다 */}
                {s.era.statuses.map((st) => {
                    const cell = codex.cells[`${s.era?.id}/${st.id}`];
                    return (
                      <li key={st.id} className={`codex__cell ${cell ? 'is-filled' : ''}`}>
                        <span className="codex__status">{st.name}</span>
                        {cell ? (
                          <>
                            <Seal text={st.name.slice(0, 2)} size={40} tilt={(st.id.length % 5) * 3 - 6} className="codex__seal" />
                            <span className="codex__meta">
                              {cell.lives}번 · 가장 오래 {cell.maxAge}세
                              <br />
                              {cell.bestRecord === 'none' ? '기록 없음' : `${RECORD_LABEL[cell.bestRecord]}에 남음`}
                            </span>
                          </>
                        ) : (
                          <span className="codex__empty">아직 살아 보지 못함</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p className="codex__soon">준비 중인 시대예요. 조사와 이야기를 채우고 있어요.</p>
            )}
          </section>
        ))}
        <p className="hint codex__legend">기록 등급: {RECORD_LEVELS.map((l) => RECORD_LABEL[l]).join(' < ')}</p>
      </main>
    </div>
  );
}
