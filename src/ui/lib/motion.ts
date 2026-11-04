// 연출 도우미. prefers-reduced-motion이면 연출을 끈다 (PRD 10-1)
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

/**
 * 화면이 차례로 드러나는 연출을 한 번 누르거나 키를 치면 끝까지 건너뛴다.
 * 돌려준 값이 true면 컨테이너에 `reveal--done`을 붙여 남은 애니메이션을 없앤다.
 */
export function useRevealSkip(): [boolean, () => void] {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done) return;
    const finish = () => setDone(true);
    window.addEventListener('pointerdown', finish, { once: true });
    window.addEventListener('keydown', finish, { once: true });
    return () => {
      window.removeEventListener('pointerdown', finish);
      window.removeEventListener('keydown', finish);
    };
  }, [done]);
  return [done, () => setDone(true)];
}
