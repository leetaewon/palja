// 근거 보기: 출생 확률, 연표 사건, 자료 목록과 신뢰도 (PRD 9장)
import { useEffect, useMemo, useRef } from 'react';
import type { Content, EventDef, SourceDef } from '../../engine';
import { REPO_URL } from '../../config';
import { useApp } from '../context';
import { ConfidenceTag, TopBar } from '../components/common';
import { eraSlots } from '../lib/eras';
import { CONFIDENCE_HELP, CONFIDENCE_LABEL, firstSentence, perHundred } from '../lib/text';

function docUrl(doc: string): string {
  return `${REPO_URL}/blob/main/${encodeURI(doc)}`;
}

function timelineEvents(content: Content, eraId: string): EventDef[] {
  const seen = new Set<string>();
  return content.events
    .filter((e) => e.kind === 'timeline' && e.when?.year !== undefined && e.conditions.eras?.includes(eraId))
    .filter((e) => {
      const k = e.memoryKey ?? e.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.when?.year ?? 0) - (b.when?.year ?? 0) || (a.when?.month ?? 0) - (b.when?.month ?? 0));
}

function SourceCard({ s, focused }: { s: SourceDef; focused: boolean }) {
  return (
    <li id={focused ? undefined : `src-${s.id}`} className={`src ${focused ? 'is-focus' : ''}`} tabIndex={focused ? -1 : undefined}>
      <h3 className="src__title">
        <ConfidenceTag value={s.confidence} /> {s.title}
      </h3>
      <p className="src__summary">{s.summary}</p>
      <a className="src__doc" href={docUrl(s.doc)} target="_blank" rel="noopener noreferrer">
        자세한 근거 문서 <span aria-hidden="true">↗</span>
      </a>
    </li>
  );
}

export function SourcesScreen({ focus }: { focus?: string[] }) {
  const { content } = useApp();
  const slots = eraSlots(content).filter((s) => s.era);
  const focusSet = useMemo(() => new Set(focus ?? []), [focus]);
  const focused = content.sources.filter((s) => focusSet.has(s.id));
  const headRef = useRef<HTMLHeadingElement>(null);
  const sourceTitle = (id: string) => content.sources.find((s) => s.id === id)?.title ?? id;

  useEffect(() => {
    if (focused.length > 0) headRef.current?.focus();
  }, [focused.length]);

  return (
    <div className="page">
      <TopBar back="back" title="근거 보기" />
      <main className="sources">
        <header>
          <h1 className="display">근거 보기</h1>
          <p>
            이 게임은 역사 연구를 바탕으로 한 추정과 게임을 위한 각색이 섞여 있습니다. 모든 근거에 신뢰도를 붙였어요.
          </p>
          <ul className="legend">
            {(['confirmed', 'estimated', 'adapted'] as const).map((c) => (
              <li key={c}>
                <ConfidenceTag value={c} /> {CONFIDENCE_HELP[c]}
              </li>
            ))}
          </ul>
          <p className="hint">연표 날짜는 사료의 음력 날짜를 따릅니다. 나이는 모두 만 나이예요.</p>
          <nav className="jump" aria-label="이 화면 안에서 이동">
            <a href="#sec-birth">출생 확률</a>
            <a href="#sec-timeline">연표 사건</a>
            <a href="#sec-all">모든 자료</a>
          </nav>
        </header>

        {focused.length > 0 && (
          <section className="sources__focus" aria-labelledby="sec-focus">
            <h2 id="sec-focus" className="section-title" tabIndex={-1} ref={headRef}>
              찾으신 근거
            </h2>
            <ul className="src-list">
              {focused.map((s) => (
                <SourceCard key={s.id} s={s} focused />
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="sec-birth">
          <h2 id="sec-birth" className="section-title">
            출생 확률
          </h2>
          {slots.map(({ era, label, title }) =>
            era ? (
              <div key={era.id} className="odds-table">
                <h3 className="odds-table__title">
                  {label} {title} <span className="hint">{era.birthYears[0]}~{era.birthYears[1]}년 출생</span>
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">신분</th>
                      <th scope="col">100명 중</th>
                      <th scope="col">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    {era.statuses.map((st) => {
                      const total = era.statuses.reduce((n, x) => n + x.weight, 0);
                      const src = content.sources.find((s) => s.id === st.sourceRef);
                      return (
                        <tr key={st.id}>
                          <th scope="row">{st.name}</th>
                          <td>{perHundred(st.weight / total)}명</td>
                          <td>
                            {src ? (
                              <a href={`#src-${src.id}`} className="odds-table__src">
                                <ConfidenceTag value={src.confidence} /> {src.title}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="hint">
                  왕족은 실제로 약 1만 명 중 1명보다 드물었지만, 재미를 위해 모든 시대에서 100명 중 1명으로 보정했어요.
                </p>
              </div>
            ) : null,
          )}
        </section>

        <section aria-labelledby="sec-timeline">
          <h2 id="sec-timeline" className="section-title">
            연표 사건
          </h2>
          {slots.map(({ era, label, title }) =>
            era ? (
              <div key={era.id} className="timeline">
                <h3 className="timeline__era">
                  {label} {title}
                </h3>
                <ol className="timeline__list">
                  {timelineEvents(content, era.id).map((e) => (
                    <li key={e.id} className="timeline__item">
                      <span className="timeline__when">
                        {e.when?.year}년{e.when?.month ? ` ${e.when.month}월` : ''}
                      </span>
                      <span className="timeline__text">
                        {firstSentence(e.text.replace(/\{[a-zA-Z]+\}/g, '당신'), 60)}{' '}
                        <ConfidenceTag value={e.confidence} />
                        <span className="timeline__refs">근거: {e.sourceRefs.map(sourceTitle).join(', ')}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null,
          )}
        </section>

        <section aria-labelledby="sec-all">
          <h2 id="sec-all" className="section-title">
            모든 자료 <span className="hint">{content.sources.length}개</span>
          </h2>
          <ul className="src-list">
            {content.sources.map((s) => (
              <SourceCard key={s.id} s={s} focused={false} />
            ))}
          </ul>
          <p className="hint">
            신뢰도 표시: {(['confirmed', 'estimated', 'adapted'] as const).map((c) => `[${CONFIDENCE_LABEL[c]}]`).join(' ')}
          </p>
        </section>
      </main>
    </div>
  );
}
