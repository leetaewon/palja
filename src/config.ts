// 사이트 절대 주소는 이 한 곳에서만 읽는다 (PRD 11장).
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://palja-game.pages.dev';
