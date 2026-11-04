// localStorage 접근. 모든 접근은 try/catch — 저장이 안 돼도 게임은 동작한다 (PRD 9장)
import type { Content, LifeState, RecordLevel } from '../../engine';
import { RECORD_LEVELS } from '../../engine';

const KEY_THEME = 'palja:theme';
const KEY_FONT = 'palja:font';
const KEY_FONT_SIZE = 'palja:font-size';
const KEY_SAVE = 'palja:save';
const KEY_CODEX = 'palja:codex';
const KEY_SPEED = 'palja:speed';
const KEY_HISTORY = 'palja:history';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 저장소를 못 써도 괜찮다 */
  }
}

function readJson<T>(key: string): T | null {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ───────────── 테마 ─────────────

export type Theme = 'light' | 'dark';

/** 첫 방문은 OS 설정과 상관없이 라이트 (PRD 10-1) */
export function loadTheme(): Theme {
  return read(KEY_THEME) === 'dark' ? 'dark' : 'light';
}

export function saveTheme(t: Theme) {
  write(KEY_THEME, t);
}

// ───────────── 글꼴 및 크기 ─────────────

export type FontStyle = 'serif' | 'sans';
export type FontSize = 'sm' | 'md' | 'lg';

export function loadFont(): FontStyle {
  return read(KEY_FONT) === 'sans' ? 'sans' : 'serif';
}

export function saveFont(f: FontStyle) {
  write(KEY_FONT, f);
}

export function loadFontSize(): FontSize {
  const s = read(KEY_FONT_SIZE);
  return s === 'sm' || s === 'lg' ? s : 'md';
}

export function saveFontSize(s: FontSize) {
  write(KEY_FONT_SIZE, s);
}

// ───────────── 속도 ─────────────

export function loadSpeed(): 1 | 3 {
  return read(KEY_SPEED) === '3' ? 3 : 1;
}

export function saveSpeed(s: 1 | 3) {
  write(KEY_SPEED, String(s));
}

// ───────────── 진행 중 인생 ─────────────

export interface SaveData {
  v: 1;
  life: LifeState;
  /** 회차(lifeIndex)별 묘비 한 줄 */
  epitaphs: Record<string, string>;
}

export function loadSave(content: Content): SaveData | null {
  const data = readJson<SaveData>(KEY_SAVE);
  if (!data || data.v !== 1 || !data.life?.birth) return null;
  // 콘텐츠가 바뀌어 시점·신분이 없어졌으면 버린다
  const era = content.eras.find((e) => e.id === data.life.birth.eraId);
  if (!era || !era.statuses.some((s) => s.id === data.life.statusId)) return null;
  return { v: 1, life: data.life, epitaphs: data.epitaphs ?? {} };
}

export function storeSave(data: SaveData): boolean {
  return write(KEY_SAVE, JSON.stringify(data));
}

export function clearSave() {
  remove(KEY_SAVE);
}

// ───────────── 인생 도감 ─────────────

export interface CodexCell {
  lives: number;
  maxAge: number;
  bestRecord: RecordLevel;
}

export interface CodexData {
  v: 1;
  /** `${eraId}/${statusId}` → 칸 */
  cells: Record<string, CodexCell>;
  /** 이미 도감에 넣은 인생 (`${seed}#${lifeIndex}`), 최근 것만 */
  seen: string[];
}

export function loadCodex(): CodexData {
  const d = readJson<CodexData>(KEY_CODEX);
  if (!d || d.v !== 1 || typeof d.cells !== 'object') return { v: 1, cells: {}, seen: [] };
  return { v: 1, cells: d.cells, seen: Array.isArray(d.seen) ? d.seen : [] };
}

/** 끝난 인생을 도감에 넣는다. 같은 인생은 한 번만 */
export function addToCodex(life: LifeState, record: RecordLevel): CodexData {
  const codex = loadCodex();
  const id = `${life.seed}#${life.lifeIndex}`;
  if (!life.dead || codex.seen.includes(id)) return codex;
  const key = `${life.birth.eraId}/${life.birth.statusId}`;
  const cell = codex.cells[key] ?? { lives: 0, maxAge: 0, bestRecord: 'none' };
  cell.lives += 1;
  cell.maxAge = Math.max(cell.maxAge, life.dead.age);
  if (RECORD_LEVELS.indexOf(record) > RECORD_LEVELS.indexOf(cell.bestRecord)) cell.bestRecord = record;
  codex.cells[key] = cell;
  codex.seen = [...codex.seen, id].slice(-300);
  write(KEY_CODEX, JSON.stringify(codex));
  return codex;
}

export function clearAll() {
  remove(KEY_SAVE);
  remove(KEY_CODEX);
  remove(KEY_HISTORY);
}

// ───────────── 최근 삶의 기록 (최근 5회) ─────────────

export interface RecentLife {
  id: string; // seed#lifeIndex
  timestamp: number;
  eraId: string;
  eraTitle: string;
  name: string;
  sex: 'male' | 'female';
  statusName: string;
  birthYear: number;
  deathYear: number;
  ageAtDeath: number;
  causeName: string;
  birthSentence: string;
  deathSentence: string;
  recordText: string | null;
  recordLevel: RecordLevel;
  epitaph: string;
  lifeIndex: number;
  changes: Array<{ year: number; scope: string; text: string }>;
  log: Array<{ year: number; age: number; text: string; kind?: string }>;
}

export function loadRecentLives(): RecentLife[] {
  const d = readJson<RecentLife[]>(KEY_HISTORY);
  return Array.isArray(d) ? d : [];
}

export function addRecentLife(life: RecentLife): RecentLife[] {
  const list = loadRecentLives();
  const next = [life, ...list.filter((x) => x.id !== life.id)].slice(0, 5);
  write(KEY_HISTORY, JSON.stringify(next));
  return next;
}
