# PROGRESS — 진행 상황

> 새 세션은 이 파일부터 읽는다. 작업할 때마다 갱신한다. (규칙: `CLAUDE.md`)

## 현재 상태
- **현재 단계**: Phase 1 — 엔진과 시뮬레이터 (완료, PR 검토 대기)
- **현재 브랜치**: phase-1-engine
- **마지막 갱신**: 2026-11-03 — sim:lives 보정 완료 (1592: 평균 25.9세, 5세 이전 37.4%, 성인 48.1세)

## 다음 할 일
Phase 1 PR이 main에 병합되면 Phase 2를 시작한다.
1. main에서 `phase-2-ui` 브랜치를 만든다.
2. 화면은 `src/ui/`에 만든다. 엔진 사용법:
   - 출생: `createBirth(content, seed)` → `createLife(content, birth)`. 출생 확률 표시는 `statusProbability()`, 근거는 `content.sources`
   - 한 해: `advanceYear(content, state, mindsetId)` (0~9세는 mindset 생략). `state.pending`이 있으면 갈림길 모달을 띄우고 `resolveChoice(content, state, choiceId)`
   - 선택지 `tag`가 `memory`/`knowledge`면 구분 표시 (PRD 10장 4)
   - 죽으면(`state.dead`) `judgeEnding(content, state)` → 사인 이름·기록 문장·바꾼 것·남은 회귀 횟수. 같은 고을 사람들은 `neighbors(content, state.birth)`
   - 팔자 고치기: `regress(content, state)`, 새 환생: 새 시드로 `createBirth`
   - 상태(`LifeState`)는 JSON 그대로 `localStorage`에 저장 가능 (`try/catch`)
   - 자연 사망은 연대기에 문장이 없다. 엔딩 문장 "○○(으)로 세상을 떠났습니다"는 UI에서 조사를 처리해 만든다 (결정 기록)
   - 시드 문자열은 UI가 만든다. `Math.random()` 대신 `crypto.getRandomValues` 또는 시각 기반
3. Playwright 설치·`npm run e2e` 스크립트 추가 후 CLAUDE.md 명령 표 갱신.
4. 콘텐츠를 고치면 `npm run test`(보정 목표 검사 포함)와 `npm run sim:lives`로 확인한다.

## 단계별 체크

### Phase 1 — 엔진과 시뮬레이터
- [x] 프로젝트 초기화 (Node 22 `.node-version`, `base: '/'`, ESLint에 `Math.random`·엔진 DOM 금지 규칙)
- [x] 시드 RNG, 출생, 능력치, 연 단위 진행, 사건·갈림길, 신분 변동 (`src/engine/`)
- [x] 사망 모델, 회귀(기억·현대 지식·영향력), 기록 엔딩 판정, 같은 고을 사람들
- [x] 콘텐츠 스키마 검증 + 1592 최소 콘텐츠 (1592 사건 58개(왕족 10개 포함) 중 갈림길 14개·기억 대비 선택지 8개, 공통 사건 28개, 현대 지식 9개)
- [x] sim:lives + 보정 목표 만족 (`docs/sim-report.md`에 보정 과정과 출력)
- [x] 단위 테스트 (결정론, 왕족 1%, 회귀 같은 출생, 영향력) — 9개 파일 58개
- [x] build / test / lint 통과 → PR

### Phase 2 — 화면과 1차 공개
- [ ] 10장의 모든 화면, 1592 시점 처음부터 기록 엔딩·회귀까지 플레이 가능
- [ ] 저장/이어하기, 시드, 결과 복사, 안내 문구(9장)
- [ ] Playwright E2E: 새 환생 → 갈림길 선택 → 죽음 → 기록 → 팔자 고치기 → 같은 출생 확인
- [ ] 화면 크기별 레이아웃(10-2), 라이트 기본·다크 전환(10-1)
- [ ] Playwright 스크린샷 `docs/screenshots/` (360px·390px·1280px, 라이트·다크)
- [ ] Cloudflare Pages 빌드 설정 확인 (`npm run build` → `dist`, `base: '/'`, `.node-version`)
- [ ] 미완성 시점은 "준비 중" 표시 → main 병합 시 1차 공개
- [ ] PR

### Phase 3 — 4개 시점 완성
- [ ]

### Phase 4 — 완성도
- [ ]

## 막힌 점·우회
- 첫 시뮬레이션에서 성인 평균 사망 나이가 38세로 낮았다. 건강이 회복되지 않아 30대에 바닥나는 것이 원인이라, 나이별 기준선으로 돌아가는 건강 회복을 넣었다 (결정 기록, `docs/sim-report.md`).

## 아이디어 메모 (범위 밖)
- 대체 역사: 한 인생에서 바꾼 결과가 이후 시점 판에 이어지기
- 시점 추가: 1231 몽골 침입, 1392 조선 건국
- 원문 대조가 필요한 근거: `docs/02-research/sources.md` "앞으로 보강할 것"
- 포로로 끌려간 인생의 일본 측 기록 한 줄 (research 1592 5장) — 기록 템플릿만 추가하면 됨
- 공명첩 매입 갈림길 (지금은 납속 갈림길에 합쳐 둠)
