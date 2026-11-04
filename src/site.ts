// 사이트 절대 주소의 기본값. 이 값은 src/config.ts(앱)와 vite.config.ts(index.html 메타)가 함께 읽는다.
// 배포 주소를 바꿀 때는 환경 변수 VITE_SITE_URL을 쓰거나 이 한 줄만 고친다 (PRD 11장).
export const DEFAULT_SITE_URL = 'https://palja.leetaewon.dev';

/** 공개 저장소 (근거 문서 링크용) */
export const REPO_URL = 'https://github.com/leetaewon/palja';
