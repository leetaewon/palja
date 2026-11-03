// 화면 문구 도우미: 조사, 숫자, 이름 표기
import type { Birth, Confidence, RecordLevel } from '../../engine';

/** 단어의 마지막 한글 글자에 받침이 있는가. 괄호 등은 건너뛰고 본다 */
function finalConsonant(word: string): number | null {
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
    if (/[0-9]/.test(word[i])) {
      // 숫자: 읽는 소리 기준 (0 영, 1 일, 2 이, 3 삼, 4 사, 5 오, 6 육, 7 칠, 8 팔, 9 구)
      const jong = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];
      return jong[Number(word[i])];
    }
    if (/[a-zA-Z]/.test(word[i])) return 0;
  }
  return null;
}

/**
 * 조사 붙이기. pair는 "받침 있을 때/없을 때" 순서. 예: josa('병', '으로/로') → '병으로'
 * '으로/로'는 ㄹ 받침이면 '로'를 쓴다.
 */
export function josa(word: string, pair: '이/가' | '은/는' | '을/를' | '과/와' | '으로/로' | '이에요/예요' | '이라/라'): string {
  const [withBatchim, without] = pair.split('/');
  const jong = finalConsonant(word);
  if (jong === null) return `${word}${withBatchim}`;
  if (pair === '으로/로') return `${word}${jong === 0 || jong === 8 ? without : withBatchim}`;
  return `${word}${jong === 0 ? without : withBatchim}`;
}

/** "상민이었습니다" / "노비였습니다" */
export function wasNoun(word: string): string {
  const jong = finalConsonant(word);
  return `${word}${jong === 0 ? '였습니다' : '이었습니다'}`;
}

export function fullName(b: Pick<Birth, 'surname' | 'givenName'>): string {
  return `${b.surname}${b.givenName}`;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: '확인',
  estimated: '추정',
  adapted: '각색',
};

export const CONFIDENCE_HELP: Record<Confidence, string> = {
  confirmed: '사료나 연구로 확인된 사실',
  estimated: '연구자들의 추정을 바탕으로 한 값',
  adapted: '게임을 위해 각색하거나 정한 값',
};

export const RECORD_LABEL: Record<RecordLevel, string> = {
  none: '기록 없음',
  hojeok: '호적',
  jokbo: '족보',
  munjip: '문집·읍지',
  sillok: '실록',
};

export const WEALTH_GRADE: Record<number, string> = {
  1: '끼니를 걱정하는',
  2: '가난한',
  3: '그럭저럭 사는',
  4: '넉넉한',
  5: '부유한',
};

export const SCOPE_LABEL = { family: '가족', village: '마을', county: '고을', nation: '나라' } as const;

export const INFLUENCE_LABEL: Record<number, string> = { 1: '가족', 2: '마을', 3: '고을', 4: '나라' };

/** 확률 → "100명 중 n명". 1 미만이면 1로 */
export function perHundred(p: number): number {
  return Math.max(1, Math.round(p * 100));
}

/** 사건 문장의 첫 문장만 (기억·연표 목록용) */
export function firstSentence(text: string, max = 48): string {
  const m = text.match(/^.*?[.?!](?=\s|$)/);
  const s = (m ? m[0] : text).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
