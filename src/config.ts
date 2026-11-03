// 사이트 절대 주소는 이 한 곳에서만 읽는다 (PRD 11장). 기본값은 src/site.ts.
import { DEFAULT_SITE_URL, REPO_URL } from './site';

export const SITE_URL: string = (import.meta.env.VITE_SITE_URL as string | undefined) || DEFAULT_SITE_URL;
export { REPO_URL };
