// 엔진 공개 API. 순수 TypeScript (React·DOM·window·localStorage 금지)
export * from './types';
export * from './rng';
export { createBirth, statusProbability, findEra, wealthGradeOf, type BirthOptions } from './birth';
export { checkConditions } from './conditions';
export { computeInfluence, persuasionChance, findStatus, INFLUENCE_RULES } from './influence';
export {
  createLife,
  advanceYear,
  advanceYearMut,
  resolveChoice,
  resolveChoiceMut,
  regress,
  canRegress,
  regressionsLeft,
  cloneState,
  naturalHazard,
  healthModifier,
  availableChoices,
  getEvent,
  renderText,
  useKnowledge,
  resolveKnowledge,
  healthBaseline,
  MAX_REGRESSIONS,
  CHILD_AGE,
  type LifeOptions,
} from './life';
export { judgeEnding, judgeRecord, reignLabel, recordRank, causeName, templateFitsEra } from './ending';
export { autoLive, continueAuto, neighbors, type BotPolicy, type NeighborSummary } from './bot';
