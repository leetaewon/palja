import { createContext, useContext } from 'react';
import type { Content } from '../engine';
import type { Theme } from './lib/storage';

export type Screen =
  | { name: 'title' }
  | { name: 'birth' }
  | { name: 'life' }
  | { name: 'ending' }
  | { name: 'codex' }
  | { name: 'sources'; focus?: string[] }
  | { name: 'about' };

export interface Nav {
  /** 화면을 바꾼다 (뒤로 가기 기록을 지운다) */
  go: (s: Screen) => void;
  /** 위에 쌓는다 (도감·근거·소개) */
  push: (s: Screen) => void;
  back: () => void;
}

export interface AppCtx {
  content: Content;
  nav: Nav;
  theme: Theme;
  toggleTheme: () => void;
  speed: 1 | 3;
  setSpeed: (s: 1 | 3) => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext 없음');
  return ctx;
}
