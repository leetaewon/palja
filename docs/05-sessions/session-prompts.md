# 클라우드 세션 진행 가이드 & 프롬프트

> 태원쌤용 문서. 각 단계 세션에 아래 프롬프트를 그대로 붙여 넣는다.

## 0. 시작 전 확인

- [ ] 로컬 `palja`의 커밋을 GitHub에 Push했다 (`git push`)
- [ ] Cloudflare Pages에 저장소를 연결했다 (아래 0-1)
- [ ] 클라우드 세션에서 `leetaewon/palja` 저장소를 연결했다

### 0-1. Cloudflare Pages 연결 (한 번만)
1. Cloudflare 대시보드 → Workers & Pages → Create → **Pages** → Git 연결 → `leetaewon/palja` 선택
2. 빌드 설정
   - Production branch: `main`
   - Framework preset: Vite (없으면 None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - 환경 변수: 비워 둔다 (Node 버전은 저장소의 `.node-version`이 정한다)
3. 저장하고 배포. **main에 아직 코드가 없어 첫 배포는 실패한다. 정상이다.** Phase 1 PR부터 미리보기 빌드가 돌고, 병합하면 프로덕션이 뜬다.
4. 주소: `https://palja-game.pages.dev` (palja는 이미 사용 중이라 palja-game으로 생성). 커스텀 도메인은 나중에 (`docs/04-decisions.md` 참고).

> Cloudflare는 새 프로젝트에 Workers를 권장하지만, 이 게임은 정적 사이트라 Pages로 충분하다.

## 1. 진행 원칙

- 한 번에 한 단계. PR을 확인하고 main에 병합한 뒤 다음 단계를 연다.
- 세션이 멈추면 같은 세션에 **"PROGRESS.md 기준으로 계속 진행해줘"**.
- 세션이 길어져 엉키면 새 세션을 열고 **이어가기 프롬프트**(6장).
- PR을 병합한 뒤 로컬에서 `git pull`을 해야 로컬 폴더도 최신이 된다.
- 첫 세션을 1시간쯤 돌린 뒤 사용량 화면에서 **클라우드 크레딧이 실제로 줄었는지** 확인한다.

## 2. Phase 1 — 엔진과 시뮬레이터

```
이 저장소의 CLAUDE.md를 먼저 읽고, 거기 적힌 순서대로 PROGRESS.md와 PRD를 읽어줘.

PRD 12장의 Phase 1(엔진과 시뮬레이터)을 진행해줘.
- phase-1-engine 브랜치에서 작업해.
- 콘텐츠는 1592 시점만 최소분으로 만들어. docs/02-research/eras/1592-imjin-war.md와
  docs/03-design/writing-guide.md를 따르고, 데이터는 content-schema.md 형식으로.
- sim:lives로 PRD 6-1 보정 목표를 맞출 때까지 "시뮬레이션 → 수치 조정"을 반복해.
- 완료 기준을 하나씩 끝낼 때마다 PROGRESS.md를 갱신하고 커밋해.
- 애매한 건 묻지 말고 정한 뒤 docs/04-decisions.md에 남겨.
- 완료 기준을 모두 만족하면 PR을 만들고, 본문에 체크리스트와 sim:lives 출력 결과를 넣어줘.

끝까지 진행해줘.
```

## 3. Phase 2 — 화면과 1차 공개

```
CLAUDE.md를 먼저 읽고 순서대로 진행해줘. Phase 1은 main에 병합됐어.

PRD 12장의 Phase 2(화면과 1차 공개)를 진행해줘.
- main에서 phase-2-ui 브랜치를 만들어 작업해.
- PRD 10장 화면과 10-1 디자인 원칙을 따르고, 흔한 템플릿 느낌이 아닌
  한지·먹·도장 톤의 개성 있는 화면으로 만들어줘. 모바일 우선이고, 10-2의 화면 크기별 레이아웃을 따라.
  라이트 모드가 기본이고 다크 모드는 전환 버튼으로.
- 화면을 만들 때마다 Playwright로 스크린샷을 찍어 직접 확인하고 깨진 곳을 고쳐.
  360px·390px·1280px, 라이트·다크 모두 확인해.
- 배포는 Cloudflare Pages가 저장소에 연결돼 있어. `npm run build` → `dist`, base '/'를 유지하고
  GitHub Pages 워크플로는 만들지 마. 나머지 시점은 "준비 중"으로 표시해.
- 완료 기준을 모두 만족하면 PR을 만들고, 본문에 체크리스트·스크린샷 경로를 넣어줘.

끝까지 진행해줘.
```

## 4. Phase 3 — 4개 시점 완성

```
CLAUDE.md를 먼저 읽고 순서대로 진행해줘. Phase 2는 main에 병합됐어.

PRD 12장의 Phase 3(4개 시점 완성)을 진행해줘.
- main에서 phase-3-content 브랜치를 만들어 작업해.
- 시점 하나씩 끝내: 660 → 1170 → 1800s. 각 시점마다 docs/02-research/eras/ 문서를 읽고
  사건·갈림길·회귀 대비 선택지·왕족 콘텐츠·기록 템플릿을 만든 뒤 sim:lives로 확인하고 커밋해.
- 연표 사건은 사실대로, 각색은 confidence: "adapted"로 표시해.
- 근거 보기와 인생 도감을 완성하고, 시뮬레이션 결과를 docs/sim-report.md에 정리해.
- 완료 기준을 모두 만족하면 PR을 만들어줘.

끝까지 진행해줘.
```

## 5. Phase 4 — 완성도 (크레딧이 남으면)

```
CLAUDE.md를 먼저 읽고 순서대로 진행해줘. Phase 3은 main에 병합됐어.

PRD 12장의 Phase 4(완성도)를 진행해줘.
- main에서 phase-4-polish 브랜치를 만들어 작업해.
- 연출, 접근성 점검, README 완성본, 최종 제목 후보 3개 제안까지 해줘.
- 완료 기준을 모두 만족하면 PR을 만들어줘.

끝까지 진행해줘.
```

## 6. 이어가기 프롬프트

```
CLAUDE.md를 먼저 읽고, PROGRESS.md의 "현재 단계"와 "다음 할 일"부터 이어서 진행해줘.
현재 브랜치와 최근 커밋 내역을 먼저 확인하고 시작해. 끝까지 진행해줘.
```

## 7. 크레딧이 남을 때 해 볼 것

- **병렬 비교**: Phase 3에서 시점 3개를 각각 다른 세션·브랜치(phase-3-660 등)로 동시에 돌린다. 충돌이 날 수 있으니 공통 파일(엔진·스키마)은 건드리지 말라고 프롬프트에 덧붙인다.
- **리뷰 세션**: 완성 후 "이 저장소를 처음 보는 시니어 개발자이자 한국사 연구자 입장에서 검토하고, 개선 PR을 만들어줘".

---

# 병렬 진행 (2026-11-03 추가)

> Phase 1 병합 후, 아래 4개 세션을 **동시에** 연다. 각 세션은 서로 다른 브랜치·파일을 만든다.
> 공유 파일(`src/content/index.ts`, `names.json`, `records.json`, `sources.json`)은 **추가만** 하므로 병합 때 생기는 충돌은 단순하다.
> 병합 순서: 먼저 끝난 PR부터. 뒤의 PR은 그 세션에 **"main 최신을 반영해서 충돌을 해결하고 테스트를 다시 통과시켜줘"** 라고 보낸 뒤 병합한다.
> 4개가 모두 병합되면 마지막에 **통합 세션**(P-5)을 연다.

## P-1. 화면 (Phase 2 + 근거 보기·도감)

```
CLAUDE.md를 먼저 읽고 PROGRESS.md와 PRD를 읽어줘. Phase 1은 main에 병합됐어.

PRD 12장의 Phase 2(화면과 1차 공개)를 진행하고, Phase 3에 있던 화면 작업 두 가지
(근거 보기 화면, 인생 도감)도 이 세션에서 함께 만들어줘.

지금 다른 세션 3개가 동시에 660·1170·1800s 시점 콘텐츠를 만들고 있어. 그래서:
- main에서 phase-2-ui 브랜치를 만들어 작업해.
- content/ 파일은 수정하지 마. 꼭 필요하면 결정 기록에 이유를 남기고 최소한으로.
- 시점 목록은 하드코딩하지 말고 content.eras에서 읽어. 콘텐츠가 있는 시점은 자동으로 열리고,
  PRD 4-1의 4개 시점 중 아직 없는 시점만 "준비 중"으로 보이게 해.

화면 요구:
- PRD 10장 화면, 10-1 디자인 원칙, 10-2 화면 크기별 레이아웃을 따라. 모바일 우선, 라이트 기본, 다크 전환.
- 한지·먹·도장 톤의 개성 있는 화면으로. 흔한 템플릿 느낌은 피해.
- PROGRESS.md "다음 할 일"에 엔진 사용법이 정리돼 있어.
- 화면을 만들 때마다 Playwright로 스크린샷을 찍어 직접 확인하고 깨진 곳을 고쳐.
  360px·390px·1280px, 라이트·다크 모두.
- 배포는 Cloudflare Pages가 연결돼 있어. `npm run build` → `dist`, base '/'를 유지하고 GitHub Pages 워크플로는 만들지 마.

완료 기준을 하나씩 끝낼 때마다 PROGRESS.md를 갱신하고 커밋해. 애매한 건 묻지 말고 정한 뒤 docs/04-decisions.md에 남겨.
완료되면 PR을 만들고, 본문에 체크리스트와 스크린샷 경로를 넣어줘. 끝까지 진행해줘.
```

## P-2 ~ P-4. 시점 콘텐츠 (시점마다 세션 하나)

아래 프롬프트에서 `{ERA}` 세 군데만 바꿔 쓴다.

| 세션 | {ERA_ID} | {ERA_DOC} | {BRANCH} |
|---|---|---|---|
| P-2 | `660` | `docs/02-research/eras/0660-baekje-fall.md` | `phase-3-660` |
| P-3 | `1170` | `docs/02-research/eras/1170-military-coup.md` | `phase-3-1170` |
| P-4 | `1800s` | `docs/02-research/eras/1800s-sedo-politics.md` | `phase-3-1800s` |

```
CLAUDE.md를 먼저 읽고 PRD, docs/03-design/writing-guide.md, docs/03-design/content-schema.md를 읽어줘.
Phase 1은 main에 병합됐어. PROGRESS.md의 "다음 할 일"(Phase 2)은 다른 세션이 하고 있으니 따르지 마.

이 세션의 일: 시점 {ERA_ID}의 콘텐츠를 PRD 12장 Phase 3 기준으로 완성하는 것.
근거는 {ERA_DOC}와 docs/02-research/의 status-ratios.md·life-death.md야.
기존 1592 콘텐츠(content/eras/1592.json, content/events/*.json)를 본보기로 삼아.

지금 다른 세션 3개가 동시에 작업 중이야(화면 1개, 다른 시점 2개). 충돌을 막기 위해 아래 규칙을 꼭 지켜:
- main에서 {BRANCH} 브랜치를 만들어 작업해.
- src/engine/, src/ui/, sim/, 기존 tests/ 파일은 수정하지 마. 엔진에 기능이 꼭 필요하면 만들지 말고
  docs/progress/{ERA_ID}.md의 "엔진 요청"에 적어 둬.
- 새 파일만 만들어: content/eras/{ERA_ID}.json, content/events/{ERA_ID}.json, content/events/royal-{ERA_ID}.json,
  content/events/common-{ERA_ID}.json (이 시점에 맞게 쓴 공통 사건 — 혼인·출산·두창·흉년·부역 등),
  tests/era-{ERA_ID}.test.ts (콘텐츠 최소분 + sim 보정 목표 검사).
- content/events/common.json과 knowledge.json의 기존 항목은 고치지 마.
- 공유 파일은 "추가만" 해: src/content/index.ts(새 파일 import·등록), names.json(새 시점 키),
  records.json(새 템플릿·규칙), sources.json(새 근거 항목). 기존 줄은 건드리지 마.
- PROGRESS.md와 docs/04-decisions.md는 수정하지 마. 진행 상황과 결정은 docs/progress/{ERA_ID}.md에 적어.

콘텐츠 요구 (PRD 12장 Phase 3):
- 사건 25개 이상, 갈림길 8개 이상, 회귀 대비(기억) 선택지 6개 이상, 공통 사건(이 시점용) 20개 이상
- 왕족 전용 콘텐츠 8개 이상, 가상 실록·족보·호적 등 기록 템플릿
- 연표 사건은 근거 문서대로 사실에 맞게. 각색은 confidence: "adapted".
- 현대 지식 행동(knowledge.json)이 이 시점에 어울리지 않으면(예: 한글이 없던 시대의 "한글 가르치기")
  기존 항목을 고치지 말고, 이 시점 사건의 선택지·문장으로 처리하거나 progress 문서에 제안으로 남겨.
- 출생 구간·신분 가중치는 PRD 4-1과 status-ratios.md(왕족 1%, 나머지 비례).

검증:
- `npm run sim:lives -- --era {ERA_ID}`로 PRD 6-1 보정 목표를 맞출 때까지 "시뮬레이션 → 수치 조정"을 반복해.
  수치는 content/eras/{ERA_ID}.json의 시점 보정 등 이 시점 파일 안에서만 조정해.
- npm run test / build / lint 통과.

PR 만들기 전에 main 최신을 반영하고(다른 세션이 먼저 병합했을 수 있어) 충돌을 해결한 뒤 테스트를 다시 돌려.
PR 본문에 체크리스트, sim:lives 출력, "엔진 요청"이 있으면 그 목록을 넣어줘. 끝까지 진행해줘.
```

## P-5. 통합 (4개 PR이 모두 병합된 뒤)

```
CLAUDE.md를 먼저 읽고 PROGRESS.md와 PRD를 읽어줘.
Phase 2 화면과 660·1170·1800s 시점 콘텐츠가 각각 다른 세션에서 만들어져 main에 병합됐어.

main에서 phase-3-integration 브랜치를 만들어 통합 작업을 해줘.
1. docs/progress/*.md의 진행 내용과 결정을 PROGRESS.md와 docs/04-decisions.md로 옮겨 정리해.
2. "엔진 요청"이 있으면 검토해서 필요한 것만 구현해.
3. content/events/common.json(1592용)과 common-{시점}.json들의 중복·불일치를 정리해.
4. 4개 시점 모두 sim:lives로 보정 목표를 확인하고 결과를 docs/sim-report.md에 정리해.
5. 4개 시점을 실제 화면에서 처음부터 기록 엔딩·회귀까지 Playwright로 한 번씩 돌려 보고 깨진 곳을 고쳐.
6. 근거 보기에 4개 시점의 근거가 모두 연결됐는지 확인해.
완료되면 PR을 만들어줘. 끝까지 진행해줘.
```
