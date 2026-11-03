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
