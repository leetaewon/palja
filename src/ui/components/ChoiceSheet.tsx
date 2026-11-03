// 갈림길: 모바일은 하단 시트, 큰 화면은 가운데 모달 (PRD 10-2). 기억·현대 지식 선택지는 구분 표시 (10장 4)
import { useEffect, useRef } from 'react';
import { getEvent, type Content, type LifeState } from '../../engine';
import { ConfidenceTag } from './common';

const TAG_LABEL = { memory: '기억', knowledge: '현대 지식' } as const;
const TAG_HELP = {
  memory: '지난 삶에서 겪은 일을 기억해서 열린 선택지',
  knowledge: '회귀한 인생에서만 쓸 수 있는 현대 지식',
} as const;

export function ChoiceSheet({
  content,
  life,
  onChoose,
  openSources,
}: {
  content: Content;
  life: LifeState;
  onChoose: (id: string) => void;
  openSources: (ids: string[]) => void;
}) {
  const p = life.pending;
  const firstRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
  }, [p?.eventId]);

  // 포커스를 시트 안에 가둔다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !boxRef.current) return;
      const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!p) return null;
  let ev = null;
  try {
    ev = getEvent(content, p.eventId);
  } catch {
    ev = null;
  }
  // 갈림길 사건 문장 뒤에 이미 일어난 일(결과 문장)이 있으면 함께 보여 준다
  const after = life.log.filter((e) => e.eventId === p.eventId && e.year === life.year && e.text !== p.text);
  const month = life.log.find((e) => e.eventId === p.eventId && e.year === life.year)?.month;

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={boxRef}>
        <div className="sheet__grip" aria-hidden="true" />
        <p className="sheet__when">
          {life.year}년{month ? ` ${month}월` : ''} · {life.age}세
          {ev && <ConfidenceTag value={ev.confidence} />}
        </p>
        <h2 id="sheet-title" className="sheet__title">
          갈림길
        </h2>
        <p className="sheet__text">{p.text}</p>
        {after.map((e, i) => (
          <p key={i} className="sheet__text sheet__text--after">
            {e.text}
          </p>
        ))}
        <ol className="choices">
          {p.choices.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                ref={i === 0 ? firstRef : undefined}
                className={`choice choice--${c.tag}`}
                onClick={() => onChoose(c.id)}
                data-tag={c.tag}
              >
                <span className="choice__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="choice__label">{c.label}</span>
                {c.tag !== 'normal' && (
                  <span className={`choice__tag choice__tag--${c.tag}`} title={TAG_HELP[c.tag]}>
                    {TAG_LABEL[c.tag]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
        {ev && ev.sourceRefs.length > 0 && (
          <button type="button" className="text-btn sheet__src" onClick={() => openSources(ev.sourceRefs)}>
            이 사건의 근거 보기 <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
