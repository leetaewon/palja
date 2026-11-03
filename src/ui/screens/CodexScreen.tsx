// 인생 도감: 시점 × 신분 칸. 살아 본 조합이 채워진다 (PRD 9장)
import { useMemo } from 'react';
import { RECORD_LEVELS } from '../../engine';
import { useApp } from '../context';
import { Seal, TopBar } from '../components/common';
import { eraSlots } from '../lib/eras';
import { loadCodex } from '../lib/storage';
import { RECORD_LABEL } from '../lib/text';

export function CodexScreen() {
  const { content } = useApp();
  const codex = useMemo(() => loadCodex(), []);
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
                {[...s.era.statuses]
                  .sort((a, b) => b.influenceBase - a.influenceBase || a.weight - b.weight)
                  .map((st) => {
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
