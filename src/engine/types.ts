// 엔진이 쓰는 타입. 콘텐츠(content/*.json) 구조와 인생 상태.
// 콘텐츠 구조를 바꾸면 docs/03-design/content-schema.md도 함께 고친다.

export type StatKey = 'health' | 'wealth' | 'learning' | 'trust';
export const STAT_KEYS: readonly StatKey[] = ['health', 'wealth', 'learning', 'trust'];
export type Stats = Record<StatKey, number>;

export type Sex = 'male' | 'female';
export type Confidence = 'confirmed' | 'estimated' | 'adapted';
export type RecordLevel = 'none' | 'hojeok' | 'jokbo' | 'munjip' | 'sillok';
export const RECORD_LEVELS: readonly RecordLevel[] = ['none', 'hojeok', 'jokbo', 'munjip', 'sillok'];
export type ChangeScope = 'family' | 'village' | 'county' | 'nation';
export const SCOPE_BY_TIER: readonly ChangeScope[] = ['family', 'village', 'county', 'nation'];

// ───────────── 콘텐츠 ─────────────

export interface RegionDef {
  id: string;
  name: string;
  weight: number;
}

export interface StatusDef {
  id: string;
  name: string;
  /** 출생 가중치. 시점 안에서 합 100. 왕족은 항상 1. */
  weight: number;
  sourceRef: string;
  /** 기록 문장에 쓰는 호칭 (예: 사노, 양인, 유학, 종친) */
  recordTerm: string;
  /** 여성일 때 호칭 (예: 사비). 없으면 recordTerm */
  recordTermFemale?: string;
  /** names.json의 이름 묶음 */
  nameGroup: string;
  /** 영향력 기본값 (1~4) */
  influenceBase: number;
  /** 현대 지식 설득 성공률 배수 */
  persuasion: number;
  /** 연간 자연 사망 위험 배수 */
  mortality: number;
  /** 출생 능력치 범위 [min, max] */
  start: Record<StatKey, [number, number]>;
  /** 이 신분이 태어날 수 있는 지역 (없으면 전체) */
  regions?: string[];
}

export interface ReignDef {
  name: string;
  /** 즉위한 해 */
  accession: number;
  /** 원년(1년)으로 세는 해 */
  firstYear: number;
}

export interface EraDef {
  id: string;
  title: string;
  birthYears: [number, number];
  regions: RegionDef[];
  statuses: StatusDef[];
  mortality: { eraModifier: number };
  reigns: ReignDef[];
  sourceRefs: string[];
}

export interface Conditions {
  eras?: string[];
  statuses?: string[];
  notStatuses?: string[];
  regions?: string[];
  sex?: Sex | '*';
  ageMin?: number;
  ageMax?: number;
  yearMin?: number;
  yearMax?: number;
  flags?: string[];
  notFlags?: string[];
  /** 이전 회차에서 겪어 기억하는 사건 */
  memory?: string[];
  /** true면 회귀한 인생에서만, false면 첫 인생에서만 */
  regressed?: boolean;
  statMin?: Partial<Stats>;
  statMax?: Partial<Stats>;
  married?: boolean;
  childrenMin?: number;
  /** 현대 지식 (회귀한 인생에서만 열림) */
  knowledge?: string[];
  influenceMin?: number;
}

interface EffectBase {
  /** 있으면 이 확률로만 적용 (death는 사망 확률) */
  chance?: number;
}

export type Effect =
  | (EffectBase & { type: 'stat'; stat: StatKey; delta: number })
  | (EffectBase & { type: 'flag'; set?: string; unset?: string })
  | (EffectBase & { type: 'status'; to: string })
  | (EffectBase & { type: 'death'; cause: string })
  | (EffectBase & { type: 'record'; level: Exclude<RecordLevel, 'none'>; templateId: string })
  | (EffectBase & { type: 'family'; event: FamilyEvent })
  | (EffectBase & { type: 'change'; scope: ChangeScope; text: string })
  | (EffectBase & { type: 'protect'; cause: string; factor: number })
  | (EffectBase & { type: 'knowledge'; id: string; attempt?: number })
  | (EffectBase & { type: 'log'; text: string });

export type FamilyEvent = 'married' | 'child-born' | 'child-died' | 'spouse-died' | 'parent-died' | 'sibling-died';

export interface Outcome {
  weight: number;
  text: string;
  effects?: Effect[];
}

export interface ChoiceDef {
  id: string;
  label: string;
  requires?: Conditions;
  effects?: Effect[];
  result?: string;
  outcomes?: Outcome[];
}

export interface EventDef {
  id: string;
  kind: 'timeline' | 'random' | 'choice';
  when?: { year?: number; month?: number };
  conditions: Conditions;
  /** random·choice 사건의 연간 발생 확률 */
  chance?: number;
  /** 한 인생에서 여러 번 일어날 수 있는가 (기본 false) */
  repeatable?: boolean;
  text: string;
  effects?: Effect[];
  outcomes?: Outcome[];
  choices?: ChoiceDef[];
  /** true면 기억·지식 선택지가 열렸을 때만 멈춘다. 아니면 첫 선택지를 자동 적용 */
  pauseOnlySpecial?: boolean;
  memorable?: boolean;
  /** 같은 기억으로 묶을 사건 id (예: 아이용 변형 사건) */
  memoryKey?: string;
  sourceRefs: string[];
  confidence: Confidence;
}

export interface KnowledgeTier {
  effects?: Effect[];
  text?: string;
  successText?: string;
  failText?: string;
  record?: { level: Exclude<RecordLevel, 'none'>; templateId: string };
}

export interface KnowledgeDef {
  id: string;
  name: string;
  category: string;
  /** "당신은 ~을 알고 있다" 문장 */
  intro: string;
  helpsAgainst: string[];
  /** 막는 정도: 해당 사인의 사망 확률 배수 (기본 0.5) */
  protectFactor?: number;
  byInfluence: Partial<Record<'1' | '2' | '3' | '4', KnowledgeTier>>;
}

export interface KnowledgeFile {
  defaults: {
    failText: Record<'2' | '3' | '4', string>;
    suspicionText: string;
  };
  actions: KnowledgeDef[];
}

export interface RecordTemplate {
  id: string;
  level: Exclude<RecordLevel, 'none'>;
  eras: string[];
  template: string;
}

export interface RecordRule {
  id: string;
  level: Exclude<RecordLevel, 'none'>;
  templateId: string;
  conditions: Conditions;
  chance: number;
}

export interface RecordsFile {
  templates: RecordTemplate[];
  rules: RecordRule[];
}

export interface NameGroup {
  male: string[];
  female: string[];
}

export interface EraNames {
  surnames: { name: string; weight: number }[];
  /** 성 없이 이름만 쓰는 묶음 */
  noSurnameGroups: string[];
  /** 성이 정해진 묶음 (예: 왕족) */
  fixedSurname?: Record<string, string>;
  groups: Record<string, NameGroup>;
}

export type NamesFile = Record<string, EraNames>;

export interface SourceDef {
  id: string;
  title: string;
  summary: string;
  confidence: Confidence;
  doc: string;
}

export interface AgeBand {
  min: number;
  max: number;
  /** 연간 기본 사망 확률 */
  hazard: number;
  /** 자연 사망 시 사인 가중치 */
  causes: Record<string, number>;
}

export interface CauseDef {
  id: string;
  name: string;
}

export interface MortalityDef {
  maxAge: number;
  ageBands: AgeBand[];
  /** 건강 보정: 건강 50에서 1. 0이면 low배, 100이면 high배 (선형 보간) */
  health: { low: number; high: number };
  /**
   * 건강 회복과 노화: 건강은 매년 기준선 쪽으로 (차이 × recovery)만큼 움직인다.
   * 기준선은 baseline에서 시작해 from세부터 해마다 perYear, from2세부터 perYear2씩 내려간다.
   */
  aging: { baseline: number; recovery: number; from: number; perYear: number; from2: number; perYear2: number };
  causes: CauseDef[];
}

export interface MindsetDef {
  id: string;
  name: string;
  selectable: boolean;
  effects: Partial<Stats>;
  /** 신분별 능력치 변화 배수 */
  byStatus?: Record<string, Partial<Stats>>;
  /** 자연 사망 위험 배수 */
  hazard?: number;
  /** 사건 사망 확률 배수 (사인별) */
  eventDeath?: Record<string, number>;
}

export interface Content {
  eras: EraDef[];
  events: EventDef[];
  knowledge: KnowledgeFile;
  records: RecordsFile;
  names: NamesFile;
  sources: SourceDef[];
  mortality: MortalityDef;
  mindsets: MindsetDef[];
}

// ───────────── 인생 상태 ─────────────

export interface Birth {
  seed: string;
  eraId: string;
  year: number;
  month: number;
  regionId: string;
  statusId: string;
  sex: Sex;
  surname: string;
  givenName: string;
  family: {
    siblings: number;
    /** 집안 재산 등급 1(가난)~5(넉넉) */
    wealthGrade: number;
  };
  stats: Stats;
}

export interface LogEntry {
  year: number;
  age: number;
  month?: number;
  text: string;
  eventId?: string;
  /** 'event' | 'choice-result' | 'knowledge' | 'death' */
  kind: 'event' | 'choice-result' | 'knowledge' | 'death';
}

export interface Change {
  year: number;
  scope: ChangeScope;
  text: string;
}

export interface RecordCandidate {
  level: Exclude<RecordLevel, 'none'>;
  templateId: string;
  year: number;
}

export interface Death {
  year: number;
  month: number;
  age: number;
  cause: string;
  eventId?: string;
}

export interface ChoiceView {
  id: string;
  label: string;
  /** 기억 선택지인가, 현대 지식 선택지인가 (화면에서 구분 표시) */
  tag: 'normal' | 'memory' | 'knowledge';
}

export interface PendingChoice {
  eventId: string;
  text: string;
  choices: ChoiceView[];
}

export interface FamilyState {
  married: boolean;
  children: number;
  childrenDied: number;
  siblings: number;
  parentsAlive: number;
}

export interface LifeState {
  seed: string;
  birth: Birth;
  /** 0이면 첫 인생, 1~3이면 회귀 횟수 */
  lifeIndex: number;
  /** 이전 회차에서 가져온 기억 (memoryKey) */
  memory: string[];
  year: number;
  age: number;
  statusId: string;
  stats: Stats;
  flags: string[];
  family: FamilyState;
  /** 사인별 사망 확률 배수 (현대 지식·대비로 생김) */
  protections: Record<string, number>;
  mindset: string;
  /** 이번 인생에서 일어난 사건 id */
  done: string[];
  /** 이번 인생에서 겪은 memorable 사건의 memoryKey */
  experienced: string[];
  knowledgeUsed: string[];
  /** 올해 아직 처리하지 않은 사건 (월 순) */
  queue: { id: string; month: number }[];
  /** 올해 처리 단계: 'start'(아직 시작 전) | 'events'(사건 처리 중) */
  phase: 'start' | 'events';
  pending: PendingChoice | null;
  log: LogEntry[];
  changes: Change[];
  recordCandidates: RecordCandidate[];
  statusHistory: { year: number; from: string; to: string }[];
  dead: Death | null;
  /** 시드 RNG 상태 */
  rng: number;
}

export interface RecordResult {
  level: RecordLevel;
  templateId?: string;
  text?: string;
}

export interface Ending {
  death: Death;
  causeName: string;
  record: RecordResult;
  changes: Change[];
  regressionsLeft: number;
}
