# 콘텐츠 데이터 형식

> `content/` 아래 JSON 파일의 구조. 엔진은 이 구조를 읽고, 테스트는 모든 파일을 이 구조로 검증한다.
> 타입 정의: `src/engine/types.ts` / 검증: `src/content/validate.ts` / 불러오기: `src/content/index.ts`
> 구현 중 필드를 바꾸면 이 문서를 함께 고친다. (Phase 1 구현에 맞춰 갱신: 2026-11-03)

## 1. 파일 구성

```
content/
├─ eras/                 # 시점 정의 (시점당 1파일)
│  └─ 1592.json
├─ events/               # 사건 (시점별 + 공통 + 왕족)
│  ├─ 1592.json
│  ├─ common.json        # 모든 시점 공통 (conditions.eras: ["*"])
│  └─ royal-1592.json
├─ knowledge.json        # 현대 지식 행동
├─ records.json          # 기록 엔딩 문장 템플릿 + 기록 규칙
├─ names.json            # 시대별 이름 풀
├─ mortality.json        # 사망 모델 (나이 구간 위험, 사인, 건강 보정)
├─ mindsets.json         # 올해의 마음가짐
└─ sources.json          # 근거 보기 항목 (docs/02-research 요약)
```

- 새 파일을 만들면 `src/content/index.ts`의 `FILES`에 등록한다. 등록하지 않으면 테스트가 실패한다.
- `eras/`와 `events/` 아래 파일은 개수 제한 없이 합쳐서 읽는다.

## 2. 시점 (`eras/*.json`)

```json
{
  "id": "1592",
  "title": "임진왜란",
  "birthYears": [1565, 1580],
  "regions": [{ "id": "gyeongsang", "name": "경상도", "weight": 24 }],
  "statuses": [
    {
      "id": "royal", "name": "왕족", "weight": 1, "sourceRef": "status-royal",
      "recordTerm": "종친", "recordTermFemale": "종녀", "nameGroup": "royal",
      "influenceBase": 3, "persuasion": 1.0, "mortality": 0.75,
      "start": { "health": [55, 80], "wealth": [80, 95], "learning": [5, 15], "trust": [45, 60] },
      "regions": ["gyeonggi"]
    }
  ],
  "mortality": { "eraModifier": 1.0 },
  "reigns": [{ "name": "선조", "accession": 1567, "firstYear": 1568 }],
  "sourceRefs": ["era-1592"]
}
```

| 필드 | 설명 |
|---|---|
| `statuses.weight` | 출생 가중치. 합은 100. **왕족은 항상 1** (PRD 4-1). 검증에서 확인한다 |
| `recordTerm` / `recordTermFemale` | 기록 문장의 호칭 (사노/사비, 양인/양녀, 유학/처, 종친/종녀) |
| `nameGroup` | `names.json`의 이름 묶음 |
| `influenceBase` | 영향력 기본값. 2 이상이면 고을(3), 3 이상이면 나라(4)까지 닿을 수 있다 (7장) |
| `persuasion` | 현대 지식 설득 성공률 배수. 낮은 신분일수록 낮다 |
| `mortality` | 자연 사망 위험 배수 (신분 보정) |
| `start` | 출생 능력치 범위 `[min, max]` |
| `regions` | 이 신분이 태어날 수 있는 지역 (없으면 전체). 왕족은 한양이 있는 경기도 |
| `mortality.eraModifier` | 시점 보정 배수 |
| `reigns` | 재위 연도 계산용. `accession`은 즉위한 해, `firstYear`는 원년(1년)으로 세는 해. 그 사이는 "즉위년" |

## 3. 사건 (`events/*.json`)

```json
{
  "id": "1592-busan-landing",
  "kind": "timeline",
  "when": { "year": 1592, "month": 4 },
  "conditions": { "eras": ["1592"], "ageMin": 14, "notFlags": ["safe-1592"], "notStatuses": ["royal"] },
  "text": "4월, 왜군이 부산에 상륙했다는 소식이 고을에 닿았다.",
  "choices": [
    {
      "id": "flee",
      "label": "가족을 데리고 피난길에 오른다",
      "effects": [{ "type": "flag", "set": "fled-1592" }, { "type": "stat", "stat": "wealth", "delta": -10 }],
      "result": "당신은 가족을 이끌고 산길로 들어섰다."
    },
    {
      "id": "memory-route",
      "label": "(기억) 왜군이 지나갈 길을 피해 서쪽 골짜기로 간다",
      "requires": { "memory": ["1592-busan-landing"] },
      "effects": [{ "type": "flag", "set": "safe-1592" }],
      "result": "당신은 기억해 둔 길로 가족을 이끌었다."
    }
  ],
  "memorable": true,
  "sourceRefs": ["era-1592"],
  "confidence": "confirmed"
}
```

| 필드 | 설명 |
|---|---|
| `kind` | `timeline`(정해진 해에 반드시) / `random`(조건이 맞으면 `chance` 확률로, 연 1회 판정) / `choice`(갈림길. 선택지 2개 이상) |
| `when.year` | 있으면 그해에만 일어난다(연표 사건). 없으면 확률 사건 |
| `when.month` | 일어나는 달 (음력). 없으면 무작위. 같은 해 사건은 달 순으로 처리 |
| `chance` | 발생 확률. `random`은 필수. 확률 사건은 한 해 최대 2개 |
| `repeatable` | 한 인생에서 여러 번 일어날 수 있는가 (기본 false) |
| `conditions` | 아래 조건 표. `eras`는 필수 (`["*"]`는 모든 시점) |
| `effects` | 사건이 일어나면 바로 적용 |
| `outcomes` | `[{ weight, text, effects }]` 가중치로 하나를 고른다. `effects` 다음에 판정 (사망 효과로 죽으면 판정하지 않음) |
| `choices` | 있으면 갈림길. 진행을 멈추고 선택을 받는다. **조건 없는 기본 선택지가 하나 이상** 있어야 한다 |
| `pauseOnlySpecial` | true면 기억·지식 선택지가 열렸을 때만 멈춘다. 아니면 첫 선택지를 자동 적용 (예: 역병, 출산) |
| `memorable` | true면 회귀 때 기억으로 가져간다 |
| `memoryKey` | 기억 이름을 다른 사건과 묶는다 (예: 아이용 변형 사건이 어른용 사건과 같은 기억을 남김) |
| `confidence` | `confirmed` / `estimated` / `adapted` ([확인]/[추정]/[각색]) |

### 조건 (`conditions`, 선택지의 `requires`, 기록 규칙의 `conditions`)

| 키 | 뜻 |
|---|---|
| `eras`, `statuses`, `regions` | 목록 중 하나. `"*"`는 전체 |
| `notStatuses` | 이 신분이면 제외 |
| `sex` | `male` / `female` / `*` |
| `ageMin`, `ageMax` | 만 나이 |
| `yearMin`, `yearMax` | 연도 |
| `flags`, `notFlags` | 모두 있어야 / 하나라도 있으면 제외 |
| `memory` | 이전 회차에서 겪은 기억(memoryKey). 선택지에 쓰면 **기억 선택지**로 표시된다 |
| `knowledge` | 현대 지식 id. **회귀한 인생에서만** 참. 선택지에 쓰면 **지식 선택지**로 표시된다 |
| `regressed` | true면 회귀한 인생에서만, false면 첫 인생에서만 |
| `influenceMin` | 최소 영향력 (1~4) |
| `statMin`, `statMax` | `{ "wealth": 40 }` 처럼 능력치 하한·상한 |
| `married`, `childrenMin` | 혼인 여부, 최소 자녀 수 |

### 효과 (`effects`) 종류

모든 효과에 `chance`(0~1)를 붙일 수 있다. `death`의 `chance`는 사망 확률이다.

| type | 예 |
|---|---|
| `stat` | `{ "type": "stat", "stat": "health", "delta": -20 }` (0~100으로 잘림) |
| `flag` | `{ "type": "flag", "set": "joined-militia" }` / `{ "type": "flag", "unset": "..." }` |
| `status` | `{ "type": "status", "to": "commoner" }` (신분 변동. 기록에 남는다) |
| `death` | `{ "type": "death", "cause": "war", "chance": 0.3 }` (사인은 `mortality.json`의 id. 보호·마음가짐 배수가 곱해진다) |
| `record` | `{ "type": "record", "level": "munjip", "templateId": "munjip-militia-leader" }` (기록 후보 추가) |
| `family` | `{ "type": "family", "event": "child-born" }` (`married`, `child-born`, `child-died`, `spouse-died`, `parent-died`, `sibling-died`) |
| `change` | `{ "type": "change", "scope": "village", "text": "마을이 물을 끓여 마시기 시작했다" }` (이번 생에서 바꾼 것. `family`/`village`/`county`/`nation`) |
| `protect` | `{ "type": "protect", "cause": "famine", "factor": 0.5 }` (그 사인의 사망 확률 배수. 대비·지식의 결과) |
| `knowledge` | `{ "type": "knowledge", "id": "war-prep", "attempt": 3 }` (현대 지식 쓰기. `attempt`는 노리는 범위 1~4, 없으면 자기 영향력) |
| `log` | `{ "type": "log", "text": "..." }` (연대기에 문장만 추가) |

## 4. 현대 지식 (`knowledge.json`)

```json
{
  "defaults": {
    "failText": { "2": "사람들은 {statusName}의 말을 귀담아듣지 않았다.", "3": "...", "4": "..." },
    "suspicionText": "오히려 이상한 소리를 하고 다닌다는 말이 돌았다."
  },
  "actions": [
    {
      "id": "boil-water",
      "name": "물을 끓여 마시기",
      "category": "위생",
      "intro": "당신은 끓인 물이 배앓이와 역병을 막는다는 것을 알고 있다.",
      "helpsAgainst": ["epidemic", "illness"],
      "protectFactor": 0.6,
      "byInfluence": {
        "1": { "effects": [{ "type": "stat", "stat": "health", "delta": 3 }], "text": "당신의 가족은 물을 끓여 마셨다." },
        "2": { "successText": "마을 사람들이 물을 끓여 마시기 시작했다.", "failText": "(선택) 실패 문장" },
        "3": { "successText": "수령이 고을의 우물을 살피게 했다." },
        "4": { "successText": "...", "record": { "level": "sillok", "templateId": "sillok-hygiene" } }
      }
    }
  ]
}
```

- 현대 지식은 **회귀한 인생에서만** 선택지에 나타난다 (PRD 7-2). 엔진이 `requires.knowledge`를 첫 인생에서 막는다.
- 쓰는 순서: `intro` → 1단계(가족)는 항상 성공 → 2단계부터 노리는 범위(`attempt`)까지 차례로 설득 판정. 실패하면 거기서 멈춘다.
- 설득 성공률(엔진 `persuasionChance`): 범위가 자기 영향력 이하면 `(기본 0.8/0.7/0.6 + (신뢰-50)/250) × 신분 persuasion`, 영향력보다 높으면 5%. 영향력보다 높은 범위에서 실패하면 `suspicionText`와 신뢰 -5.
- `helpsAgainst`의 사인은 `protectFactor`(기본 0.5)만큼 사망 확률이 줄어든다.
- 성공한 단계마다 "이번 생에서 바꾼 것"(`changes`)이 쌓인다. 4단계 `record`는 가상 실록 후보가 된다.
- 문장 안 `{statusName}`, `{regionName}`, `{name}`은 엔진이 바꿔 넣는다.

## 5. 기록 (`records.json`)

```json
{
  "templates": [
    { "id": "sillok-hygiene", "level": "sillok", "eras": ["1592"], "template": "{eventReign}, {term} {name}의 말에 따라 ..." }
  ],
  "rules": [
    { "id": "rule-jokbo-yangban-male", "level": "jokbo", "templateId": "jokbo-yangban-male",
      "conditions": { "statuses": ["yangban"], "sex": "male", "ageMin": 16 }, "chance": 0.85 }
  ]
}
```

- `level` 순서: `none` < `hojeok`(호적) < `jokbo`(족보) < `munjip`(문집·읍지) < `sillok`(실록)
- 기록 후보 = 사건의 `record` 효과 + 죽을 때 조건이 맞고 `chance`에 걸린 규칙. 가장 높은 것 하나가 남는다. 없으면 "기록 없음".
- 규칙 조건의 나이는 **죽은 나이**다.
- 템플릿 자리표시: `{name}`(여성 양반·중인은 "김씨"), `{givenName}`, `{surname}`, `{term}`, `{region}`, `{birthReign}`, `{deathReign}`, `{eventReign}`(기록이 생긴 해), `{month}`(죽은 달), `{age}`, `{children}`
- 조사(이/가)가 이름에 따라 바뀌는 문장은 피한다 (예: "{name}의", "{name}." 처럼 끝낸다).

## 6. 이름 (`names.json`)

```json
{
  "1592": {
    "surnames": [{ "name": "김", "weight": 22 }],
    "noSurnameGroups": ["slave"],
    "fixedSurname": { "royal": "이" },
    "groups": { "slave": { "male": ["복동"], "female": ["순덕"] } }
  }
}
```
- 시점의 모든 `nameGroup`에 남녀 이름이 5개 이상 있어야 한다.

## 7. 사망 모델 (`mortality.json`)

```json
{
  "maxAge": 100,
  "ageBands": [{ "min": 0, "max": 0, "hazard": 0.16, "causes": { "illness": 3, "epidemic": 1, "smallpox": 1 } }],
  "health": { "low": 3, "high": 0.5 },
  "aging": { "baseline": 60, "recovery": 0.2, "from": 40, "perYear": 1, "from2": 60, "perYear2": 2 },
  "causes": [{ "id": "old-age", "name": "노환" }]
}
```
- 매년 자연 사망 위험 = 나이 구간 `hazard` × 신분 `mortality` × 시점 `eraModifier` × 건강 보정 × 마음가짐 `hazard` (PRD 6-1)
- 건강 보정: 건강 50에서 1, 0이면 `low`배, 100이면 `high`배 (선형)
- 자연 사망이면 구간 `causes` 가중치로 사인을 정한다. 그 사인에 보호(`protect`)가 있으면 그 비율만큼 살아남는다.
- 건강은 매년 기준선 쪽으로 (차이 × `recovery`)만큼 돌아간다. 기준선은 `baseline`에서 `from`세부터 `perYear`, `from2`세부터 `perYear2`씩 내려간다.
- 나이 구간은 0부터 `maxAge`까지 빈틈없이 이어져야 한다. `old-age` 사인이 있어야 한다. **자살은 사인에 넣지 않는다.**

## 8. 마음가짐 (`mindsets.json`)

```json
[{ "id": "body", "name": "몸 돌보기", "selectable": true, "effects": { "health": 2, "wealth": -1 }, "hazard": 0.85 }]
```
- `child`(0~9세 자동, 고를 수 없음), `work`, `study`, `family`, `body`, `hide`가 있어야 한다.
- `byStatus`: 신분별 능력치 변화 배수 (예: 노비의 공부는 학식이 0.3배만 오른다)
- `eventDeath`: 사건 사망 확률 배수 (예: 숨죽이기는 전란·형벌 위험이 줄어든다)

## 9. 근거 (`sources.json`)

```json
{
  "id": "status-1592",
  "title": "16세기 후반 조선의 신분 구성",
  "summary": "조선 초·중기 노비가 인구의 30~40%였다는 견해가 널리 인용된다. ...",
  "confidence": "estimated",
  "doc": "docs/02-research/status-ratios.md#2-3-1592년-무렵-조선-16세기-후반"
}
```
- 근거 보기 화면은 이 파일만 읽는다. `docs/02-research/`를 요약해 옮기고, 원문 문서 경로를 남긴다.
- 시점·신분·사건의 `sourceRefs`/`sourceRef`는 여기 있는 id여야 한다 (검증).

## 10. 검증이 잡는 것 (요약)

- 구조·타입, 알 수 없는 필드, 중복 id
- 서로 가리키는 id: 근거, 기록 템플릿, 기억(memorable 사건), 현대 지식, 신분, 지역, 사인, 능력치
- 신분 가중치 합 100, 왕족 1, 나이 구간 연속
- 갈림길은 선택지 2개 이상 + 조건 없는 기본 선택지
- 쓰지 않는 말 (자살·자해·비하 호칭·"노예"·"천연두"·"콜레라" 등. writing-guide 3·5장)
