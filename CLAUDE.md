# CLAUDE.md — 팔자 (가제)

> 이 저장소에서 작업하는 Claude를 위한 안내 파일이다.

## 작업 시작 시 반드시

1. `PROGRESS.md`를 읽는다. 현재 단계, 다음 할 일, 열린 질문이 있다.
2. `docs/01-prd/prd.md`를 읽는다. 무엇을 만들지와 단계별 완료 기준이 있다.
3. 콘텐츠를 만들거나 고칠 때는 `docs/03-design/writing-guide.md`, `docs/03-design/content-schema.md`, 해당 시점의 `docs/02-research/eras/` 문서를 읽는다.

## 문서 지도

| 위치 | 담는 것 | 이 문서를 고쳐도 되나 |
|---|---|---|
| `docs/00-brief/` | 기획 Brief (아이디어 원천) | 고치지 않는다 |
| `docs/01-prd/prd.md` | 요구사항·완료 기준 | 구현상 꼭 필요한 변경만. 바꾸면 결정 기록에 남긴다 |
| `docs/02-research/` | 역사 근거 (사람이 읽는 문서) | 사실 오류를 발견했을 때만. 근거와 함께 |
| `docs/03-design/` | 문체 가이드, 데이터 형식 | 데이터 형식은 구현에 맞춰 갱신한다 |
| `docs/04-decisions.md` | 결정 기록 | 결정할 때마다 추가한다 |
| `docs/05-sessions/` | 세션 프롬프트 (사람용) | 고치지 않는다 |
| `content/` | 게임 데이터 (JSON) | 자유롭게. 스키마 검증 통과 필수 |

- 근거 문서(`docs/02-research/`)와 게임 데이터(`content/`)를 섞지 않는다. 게임이 읽는 근거는 `content/sources.json`에 요약해 둔다.

## 작업 방식

- **사람에게 묻지 않고 끝까지 간다.** 클라우드 세션은 사용자가 지켜보지 않는다. 애매하면 PRD 취지 → 결정 기록 → Brief 순으로 판단하고, `docs/04-decisions.md`에 이유와 함께 남긴다.
- 단계마다 브랜치: `phase-1-engine`, `phase-2-ui`, `phase-3-content`, `phase-4-polish`
- 작은 단위로 자주 커밋. 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지.
- 커밋 전 `npm run test`, `npm run build`, `npm run lint` 통과. 실패한 채로 커밋하지 않는다.
- 완료 기준을 모두 채우면 PR을 만든다. 본문에 체크리스트, 시뮬레이션 결과, 스크린샷 경로.

## PROGRESS.md 갱신 규칙

다음 때마다 갱신하고 커밋한다: 완료 기준 하나를 끝냈을 때, 중요한 결정을 했을 때, 막혀서 우회했을 때, 맥락이 많이 쌓였을 때.
"다음 할 일"은 새 세션이 이 파일만 읽고 바로 시작할 수 있을 만큼 구체적으로 쓴다.

## 코드 규칙

- `src/engine/`은 순수 TypeScript. React·DOM·`window`·`localStorage` import 금지.
- 난수는 시드 RNG만. `Math.random()` 금지.
- 사건·지식·기록은 `content/` 데이터로 정의한다. 특정 사건을 위해 엔진에 if 분기를 넣지 않는다. 필요하면 재사용 가능한 조건·효과 타입을 추가하고 `content-schema.md`를 갱신한다.
- 사용자에게 보이는 텍스트는 모두 한국어. 문체는 `writing-guide.md`를 따른다.
- `localStorage` 접근은 항상 `try/catch`.
- 배포는 Cloudflare Pages Git 연동이다. `npm run build` → `dist`, Vite `base: '/'`를 유지한다. GitHub Pages 워크플로를 만들지 않는다.
- 모바일 우선, 라이트 모드 기본 (PRD 10-1, 10-2).

## 하지 않는 것

- 자살·성적 묘사·고문 상세·혐오 표현 (writing-guide 3장)
- 실존 인물의 속마음·대사 창작, 평가, 희화화
- 연표 사건을 사실과 다르게 쓰기
- 외부 이미지·사운드 에셋 다운로드, 게임 안 외부 API 호출
- 「80억분의 1」의 화면 구성·문구 모방
- PRD 범위 밖 기능 추가 (아이디어는 `PROGRESS.md` "아이디어 메모"에)

## 자주 쓰는 명령

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run test` | Vitest (엔진·콘텐츠 검증) |
| `npm run e2e` | Playwright |
| `npm run sim:lives` | 1만 인생 시뮬레이션 리포트 |
| `npm run build` | 프로덕션 빌드 |

> 명령 이름은 Phase 1에서 `package.json`에 맞춰 확정하고, 바뀌면 이 표를 고친다.
