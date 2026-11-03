# PROGRESS — 진행 상황

> 새 세션은 이 파일부터 읽는다. 작업할 때마다 갱신한다. (규칙: `CLAUDE.md`)

## 현재 상태
- **현재 단계**: Phase 2 — 화면과 1차 공개 (완료, PR 검토 대기). Phase 3의 화면 작업(근거 보기 연결·인생 도감)도 함께 끝냄
- **현재 브랜치**: phase-2-ui
- **마지막 갱신**: 2026-11-03 — 10장 모든 화면, E2E 10개, 스크린샷 52장(`docs/screenshots/`)
- **동시 작업**: 다른 세션 3개가 660·1170·1800s 콘텐츠를 만들고 있다. 화면은 `content.eras`에서 시점을 읽으므로 콘텐츠가 병합되면 자동으로 열린다

## 다음 할 일
Phase 2 PR이 main에 병합되면 1차 공개(Cloudflare Pages 프로덕션). 그다음:
1. 시점 콘텐츠 세션들의 PR이 병합되면 `npm run e2e`와 `npm run screenshots`를 다시 돌려 새 시점이 열리는지 확인한다.
   - 시점 짝짓기: `src/ui/lib/eras.ts` (PRD 4-1 계획 목록과 출생 구간이 겹치면 같은 시점)
   - 왕족 판정은 신분 id `royal` 또는 `nameGroup: "royal"` (출생 화면 1/100 보정 안내). 새 시점도 이 규칙을 지키면 안내가 뜬다
   - 근거 보기의 "연표 사건"은 `kind: "timeline"` + `when.year` + `conditions.eras`에 시점 id가 있는 사건만 보여 준다
2. Phase 3 남은 것은 콘텐츠뿐: 시점별 사건·갈림길·왕족 콘텐츠·기록 템플릿, `sim:lives` 4개 시점 보정
3. Phase 4: 연출(출생 공개·회귀 전환), 접근성 점검(스크린 리더로 한 판), README 완성본, 제목 후보

### 화면 구조 (src/ui/)
- `App.tsx`: 화면 전환(스택: 도감·근거·소개는 위에 쌓고 돌아가기), 저장, 테마, 도감 기록
- `screens/`: Title · Birth · Life · Ending · Codex · Sources · About
- `components/`: 도장(`Seal`), 윗줄, 신뢰도 표시, 능력치, 갈림길 시트(`ChoiceSheet`)
- `lib/`: `storage.ts`(localStorage 모두 try/catch), `eras.ts`(시점 슬롯), `summary.ts`(출생·사인 문장, 결과 복사), `text.ts`(조사), `seed.ts`(crypto 시드)
- 스타일은 `styles.css` 한 파일. 색은 `:root`/`[data-theme]` 변수. 768px부터 두 단
- 키보드: 숫자키 마음가짐·선택지, 스페이스 진행/멈춤, → 한 해 넘기기, Enter 기록 보기
- E2E: `e2e/play.spec.ts`, 스크린샷: `e2e/screenshots.spec.ts` (`SCREENSHOTS=1`일 때만)

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
- [x] 10장의 모든 화면, 1592 시점 처음부터 기록 엔딩·회귀까지 플레이 가능
- [x] 저장/이어하기, 시드, 결과 복사, 안내 문구(9장)
- [x] Playwright E2E: 새 환생 → 갈림길 선택 → 죽음 → 기록 → 팔자 고치기 → 같은 출생 확인 (+ 저장·이어하기, 테마 기억, 시점 슬롯, 근거·소개) — 모바일·데스크톱 10개
- [x] 화면 크기별 레이아웃(10-2), 라이트 기본·다크 전환(10-1). 명도 대비 라이트·다크 모두 4.9:1 이상
- [x] Playwright 스크린샷 `docs/screenshots/` (360px·390px·1280px, 라이트·다크, JPEG 52장)
- [x] Cloudflare Pages 빌드 설정 확인 (`npm run build` → `dist`, `base: '/'`, `.node-version` 22). GitHub Pages 워크플로 없음
- [x] 미완성 시점은 "준비 중" 표시 (`content.eras` 기준 자동) → main 병합 시 1차 공개
- [x] PR

### Phase 3 — 4개 시점 완성
- [ ] 나머지 3개 시점 콘텐츠 (다른 세션 진행 중)
- [x] 근거 보기 화면: 출생 확률·연표 사건·모든 자료, 신뢰도 표시. 연대기와 갈림길에서 사건 근거로 바로 이동 (Phase 2에서 함께)
- [x] 인생 도감 (Phase 2에서 함께)

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
