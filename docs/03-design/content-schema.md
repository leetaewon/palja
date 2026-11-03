# 콘텐츠 데이터 형식

> `content/` 아래 JSON 파일의 구조. 엔진은 이 구조를 읽고, 테스트는 모든 파일을 이 구조로 검증한다.
> 아래는 설계 초안이다. 구현 중 필드를 바꾸면 이 문서를 함께 고친다.

## 1. 파일 구성

```
content/
├─ eras/                 # 시점 정의 (시점당 1파일)
│  ├─ 1592.json
│  └─ ...
├─ events/               # 사건 (시점별 + 공통)
│  ├─ 1592.json
│  ├─ common.json
│  └─ royal-1592.json
├─ knowledge.json        # 현대 지식 행동
├─ records.json          # 기록 엔딩 문장 템플릿
├─ names.json            # 시대별 이름 풀
└─ sources.json          # 근거 보기 항목 (docs/02-research 요약)
```

## 2. 시점 (`eras/*.json`)

```json
{
  "id": "1592",
  "title": "임진왜란",
  "birthYears": [1565, 1580],
  "regions": [{ "id": "gyeongsang", "name": "경상도", "weight": 25 }],
  "statuses": [
    { "id": "royal", "name": "왕족", "weight": 1, "sourceRef": "status-royal" },
    { "id": "slave", "name": "노비", "weight": 35, "sourceRef": "status-1592" }
  ],
  "mortality": { "eraModifier": 1.0 },
  "sourceRefs": ["era-1592"]
}
```
- `statuses.weight`의 합은 100. 왕족은 항상 1 (PRD 4-1).

## 3. 사건 (`events/*.json`)

```json
{
  "id": "1592-busan-landing",
  "kind": "timeline",
  "when": { "year": 1592, "month": 4 },
  "conditions": {
    "eras": ["1592"],
    "ageMin": 0,
    "statuses": ["*"],
    "regions": ["*"],
    "sex": "*",
    "flags": [],
    "notFlags": []
  },
  "chance": 1.0,
  "text": "4월, 왜군이 부산에 상륙했다는 소식이 고을에 닿았다.",
  "effects": [],
  "choices": [
    {
      "id": "flee-north",
      "label": "가족을 데리고 북으로 피난한다",
      "requires": {},
      "effects": [{ "type": "stat", "stat": "wealth", "delta": -10 }, { "type": "flag", "set": "fled-1592" }],
      "result": "당신은 가족을 이끌고 북쪽 산길로 들어섰다."
    },
    {
      "id": "prepared-escape",
      "label": "(기억) 이미 3월에 피난 준비를 마쳤다",
      "requires": { "memory": ["1592-busan-landing"] },
      "effects": [{ "type": "flag", "set": "safe-1592" }],
      "result": "당신은 기억대로 미리 길을 떠나 있었다."
    }
  ],
  "memorable": true,
  "sourceRefs": ["era-1592"],
  "confidence": "confirmed"
}
```

| 필드 | 설명 |
|---|---|
| `kind` | `timeline`(정해진 해에 반드시) / `random`(조건이 맞으면 `chance` 확률로, 연 1회 판정) / `choice`(갈림길) |
| `conditions` | 시점·나이·신분·지역·성별·플래그 조건. `"*"`는 전체 |
| `choices` | 있으면 갈림길. `requires`로 회귀 기억(`memory`), 현대 지식(`knowledge`), 최소 영향력(`influenceMin`), 능력치 조건을 건다 |
| `memorable` | true면 회귀 때 기억으로 가져간다 |
| `confidence` | `confirmed` / `estimated` / `adapted` ([확인]/[추정]/[각색]) |

### 효과(`effects`) 종류
| type | 예 |
|---|---|
| `stat` | `{ "type": "stat", "stat": "health", "delta": -20 }` |
| `flag` | `{ "type": "flag", "set": "joined-militia" }` / `{ "unset": "..." }` |
| `status` | `{ "type": "status", "to": "commoner" }` (신분 변동) |
| `death` | `{ "type": "death", "cause": "war", "chance": 0.3 }` |
| `record` | `{ "type": "record", "level": "munjip", "templateId": "militia-1592" }` (기록 후보 추가) |
| `family` | `{ "type": "family", "event": "child-born" }` |
| `change` | `{ "type": "change", "scope": "village", "text": "마을이 물을 끓여 마시기 시작했다" }` (이번 생에서 바꾼 것) |

## 4. 현대 지식 (`knowledge.json`)

```json
{
  "id": "boil-water",
  "name": "물을 끓여 마시기",
  "category": "위생",
  "helpsAgainst": ["epidemic", "cholera"],
  "byInfluence": {
    "1": { "effects": [{ "type": "stat", "stat": "health", "delta": 5 }], "text": "당신의 가족은 물을 끓여 마셨다." },
    "2": { "successText": "마을 사람들이 물을 끓이기 시작했다.", "failText": "사람들은 당신의 말을 귀담아듣지 않았다." },
    "3": { "successText": "수령이 우물을 관리하게 했다." },
    "4": { "record": { "level": "sillok", "templateId": "sillok-hygiene" } }
  }
}
```
- 현대 지식은 **회귀한 인생에서만** 선택지에 나타난다 (PRD 7-2).
- 영향력 단계별 성공 확률은 엔진에서 계산한다.

## 5. 기록 템플릿 (`records.json`)

```json
{
  "id": "sillok-hygiene",
  "level": "sillok",
  "eras": ["1800s"],
  "template": "{year}년 {month}월, 종친 {name}이 괴질을 막는 법을 아뢰니, 각 도에 명하여 우물을 살피게 하였다."
}
```
- `level` 순서: `none` < `hojeok`(호적) < `jokbo`(족보) < `munjip`(문집·읍지) < `sillok`(실록)

## 6. 근거 (`sources.json`)

```json
{
  "id": "status-1592",
  "title": "16세기 후반 조선의 신분 구성",
  "summary": "조선 초·중기 노비가 인구의 30~40%였다는 견해가 널리 인용된다. 양반은 10% 안팎이었다는 데 대체로 의견이 모인다.",
  "confidence": "estimated",
  "doc": "docs/02-research/status-ratios.md#2-3"
}
```
- 근거 보기 화면은 이 파일만 읽는다. `docs/02-research/`를 요약해 옮기고, 원문 문서 경로를 남긴다.
