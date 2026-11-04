// 회귀 전환 연출: 죽은 해에서 태어난 해로 연도가 거꾸로 흘러가며 먹이 걷힌다.
// prefers-reduced-motion이면 App에서 아예 띄우지 않는다. 누르거나 키를 치면 바로 끝난다.
import { useEffect, useRef, useState } from 'react';

const DURATION = 2600; // 전체 길이(ms)
const COUNT_FROM = 350; // 연도가 거꾸로 흐르기 시작하는 시점
const COUNT_TO = 1900; // 태어난 해에 닿는 시점

export interface RegressTransitionProps {
  name: string;
  fromYear: number;
  fromAge: number;
  toYear: number;
  round: number; // 몇 번째 팔자 고치기인지 (1~)
  onDone: () => void;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function RegressTransition({ name, fromYear, fromAge, toYear, round, onDone }: RegressTransitionProps) {
  const [year, setYear] = useState(fromYear);
  const doneRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const finish = useRef<() => void>(() => undefined);
  finish.current = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    btnRef.current?.focus({ preventScroll: true });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      const k = Math.min(1, Math.max(0, (t - COUNT_FROM) / (COUNT_TO - COUNT_FROM)));
      setYear(Math.round(fromYear - (fromYear - toYear) * easeInOut(k)));
      if (t >= DURATION) {
        finish.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return;
      e.preventDefault();
      finish.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [fromYear, toYear]);

  return (
    <div
      className="regress-fx"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regress-fx-title"
      data-testid="regress-fx"
      onPointerDown={() => finish.current()}
    >
      <div className="regress-fx__wash" aria-hidden="true" />
      <div className="regress-fx__body">
        <p id="regress-fx-title" className="regress-fx__title">
          팔자를 고치러
        </p>
        <p className="regress-fx__year" aria-hidden="true">
          {year}
          <span className="regress-fx__unit">년</span>
        </p>
        <p className="regress-fx__line">
          {fromAge}세의 {name}, 태어난 {toYear}년으로 돌아갑니다.
        </p>
        <p className="regress-fx__round" aria-hidden="true">
          {round}번째 회귀
        </p>
        <button type="button" ref={btnRef} className="regress-fx__skip" onClick={() => finish.current()}>
          건너뛰기
        </button>
      </div>
    </div>
  );
}
