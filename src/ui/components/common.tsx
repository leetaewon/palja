// 여러 화면이 함께 쓰는 조각: 도장, 윗줄, 테마 전환, 신뢰도 표시
import { useId, type ReactNode } from 'react';
import type { Confidence } from '../../engine';
import { useApp } from '../context';
import { CONFIDENCE_HELP, CONFIDENCE_LABEL } from '../lib/text';

/** 붉은 도장. 글자 2자는 세로 한 줄, 4자는 오른쪽 줄부터 2×2로 찍는다 */
export function Seal({ text, size = 56, className = '', tilt = -4 }: { text: string; size?: number; className?: string; tilt?: number }) {
  const id = useId().replace(/:/g, '');
  const chars = [...text];
  const four = chars.length >= 4;
  const pos = four
    ? [
        [70, 34],
        [70, 76],
        [30, 34],
        [30, 76],
      ]
    : chars.length === 1
      ? [[50, 56]]
      : [
          [50, 34],
          [50, 76],
        ];
  const fs = four ? 34 : chars.length === 1 ? 56 : 38;
  return (
    <svg
      className={`seal ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <defs>
        <filter id={`r${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
        </filter>
        <mask id={`m${id}`}>
          <rect width="100" height="100" fill="#fff" />
          <rect width="100" height="100" fill="#000" opacity="0.22" filter={`url(#t${id})`} />
        </mask>
        <filter id={`t${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="3" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.25" />
        </filter>
      </defs>
      <g filter={`url(#r${id})`} mask={`url(#m${id})`}>
        <rect x="5" y="5" width="90" height="90" rx="9" className="seal__body" />
        <rect x="12" y="12" width="76" height="76" rx="4" className="seal__inner" />
        {chars.slice(0, 4).map((c, i) => (
          <text key={i} x={pos[i][0]} y={pos[i][1]} fontSize={fs} className="seal__char" textAnchor="middle" dominantBaseline="central">
            {c}
          </text>
        ))}
      </g>
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기'}
      title={dark ? '밝게' : '어둡게'}
    >
      <span className="theme-toggle__dot" aria-hidden="true" />
      <span className="theme-toggle__label">{dark ? '한지' : '먹'}</span>
    </button>
  );
}

/** 화면 맨 윗줄: 왼쪽 뒤로/처음, 가운데 제목, 오른쪽 테마 */
export function TopBar({ title, back, children }: { title?: ReactNode; back?: 'back' | 'home' | null; children?: ReactNode }) {
  const { nav } = useApp();
  return (
    <header className="topbar">
      <div className="topbar__left">
        {back === 'back' && (
          <button type="button" className="text-btn" onClick={nav.back}>
            <span aria-hidden="true">←</span> 돌아가기
          </button>
        )}
        {back === 'home' && (
          <button type="button" className="text-btn" onClick={() => nav.go({ name: 'title' })}>
            <span aria-hidden="true">←</span> 처음으로
          </button>
        )}
      </div>
      <div className="topbar__title">{title}</div>
      <div className="topbar__right">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function ConfidenceTag({ value, onClick }: { value: Confidence; onClick?: () => void }) {
  const label = `[${CONFIDENCE_LABEL[value]}]`;
  if (onClick) {
    return (
      <button
        type="button"
        className={`conf conf--${value} conf--btn`}
        onClick={onClick}
        aria-label={`근거 보기: ${CONFIDENCE_LABEL[value]} — ${CONFIDENCE_HELP[value]}`}
        title={CONFIDENCE_HELP[value]}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={`conf conf--${value}`} title={CONFIDENCE_HELP[value]}>
      {label}
    </span>
  );
}

/** 먹 붓 획 구분선 */
export function BrushRule({ className = '' }: { className?: string }) {
  return (
    <svg className={`brush-rule ${className}`} viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 8 C 60 3, 120 11, 200 7 S 340 4, 398 8" />
    </svg>
  );
}
