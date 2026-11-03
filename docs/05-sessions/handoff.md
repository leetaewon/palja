# 인수인계 — 새 대화에서 이어가기

> 작성: 2026-11-03 22:50 (첫 기획 대화 마무리 시점)
> 새 대화는 이 문서 → `PROGRESS.md` → `docs/04-decisions.md` 순으로 읽고 시작한다.

## 1. 지금 상태

| 항목 | 상태 |
|---|---|
| 기획 | Brief, 근거 자료(`docs/02-research/`), PRD, 문체 가이드, 데이터 형식 완료 |
| Phase 1 엔진 | PR #1 병합 완료. 테스트 58개, sim:lives 보정 목표 5개 만족(1592) |
| 병렬 세션 4개 | 모두 PR 생성 완료, **검토·병합 전** |
| 다음 | PR 4개 검토 → 병합 → P-5 통합 세션 (`docs/05-sessions/session-prompts.md` 맨 아래) |
| 배포 | Cloudflare Pages `palja-game` → https://palja-game.pages.dev (main 병합 시 프로덕션, 브랜치·PR은 미리보기) |
| 저장소 | https://github.com/leetaewon/palja (public) |
| 크레딧 | Phase 1에 약 $9 사용 ($82 → $73). 병렬 4개 세션 사용량은 확인 필요. 만료 2026-11-05 |

## 2. 검토 대기 PR

| PR | 내용 | 브랜치 |
|---|---|---|
| #3 | Phase 2 화면과 1차 공개 (+ 근거 보기·인생 도감) | `phase-2-ui` |
| #2 | 시점 1800s 세도정치 콘텐츠와 보정 | `phase-3-1800s` |
| #4 | 시점 1170 무신정변 콘텐츠 | `phase-3-1170` |
| #5 | 시점 660 백제 멸망 콘텐츠 | `phase-3-660` |

**병합 순서 제안**: #3(화면, content/를 건드리지 않음) 먼저 → 시점 PR은 하나씩. 시점 PR끼리는 공유 파일(`src/content/index.ts`, `names.json`, `records.json`, `sources.json`)에 "추가만" 했으므로, 뒤에 병합하는 PR은 해당 세션에 "main 최신을 반영해서 충돌을 해결하고 테스트를 다시 통과시켜줘"를 보낸 뒤 병합한다.

## 3. PR 검토 방법 (Phase 1 때 쓴 방식)

1. 연결된 `palja` 폴더에서 `git fetch origin`
2. 폴더 밖(작업 셸의 `$HOME/work`)에 클론해서 해당 브랜치 체크아웃 → `npm ci`
3. `npm run test`, `npm run lint`, `npm run build`
4. `npm run sim:lives -- --era <시점>` → PRD 6-1 보정 목표(평균 사망 20대 중반, 5세 이전 30~40%, 성인 45~55세, 왕족 1%±0.3%p, 왕족·양반이 평균보다 오래 삶)
5. 연표 사건의 날짜·내용을 `docs/02-research/eras/` 문서와 대조
6. 병렬 규칙 준수 확인: 시점 PR이 `src/engine/`, `src/ui/`, `sim/`, 기존 `tests/`, `PROGRESS.md`, `docs/04-decisions.md`, `common.json`·`knowledge.json` 기존 항목을 고치지 않았는지 (`git diff --stat main...origin/<브랜치>`)
7. 화면 PR은 Cloudflare 미리보기 링크를 휴대폰·데스크톱에서 직접 플레이
8. 각 시점 PR의 `docs/progress/<시점>.md`에 "엔진 요청"이 있는지 확인 → P-5에서 처리

## 4. 지금까지의 핵심 결정 (자세한 건 `docs/04-decisions.md`)

- 시점 4개: 660 백제 멸망 · 1170 무신정변 · 1592 임진왜란 · 1800년대 세도정치
- 왕족 출생 1/100로 보정하고 플레이어에게 안내 (실제는 약 1/10,000 이하)
- 현대 지식은 회귀한 인생부터 허용. 효과는 영향력 4단계(가족·마을·고을·나라)로 신분에 따라 제한
- 바꾼 결과는 그 인생 안에서만 유지 (대체 역사는 확장 후보)
- 문체: 일생은 담담한 서술체, 엔딩 기록만 고풍
- 모바일 우선, 라이트 기본 + 다크 전환, 화면 크기별로 레이아웃만 다름
- 배포 Cloudflare Pages, 사이트 절대 주소는 `VITE_SITE_URL` 한 곳에서
- 커스텀 도메인(palja-game.com/.kr)은 링크를 퍼뜨리기 전에 바꿀 것 (localStorage가 주소별이라 기록이 옮겨 가지 않음)

## 5. 새 대화 시작 문장 (예시)

```
팔자 게임 저장소(palja 폴더)를 연결했어. docs/05-sessions/handoff.md를 읽고 이어서 진행하자.
병렬 세션 PR 4개(#2~#5)가 올라왔으니 검토부터 해줘.
```
