// content/ 의 JSON을 모아 검증한 뒤 엔진에 넘긴다.
// 새 파일을 content/에 추가하면 여기 FILES에도 등록한다 (테스트가 빠진 파일을 잡는다).
import era1592 from '../../content/eras/1592.json';
import events1592 from '../../content/events/1592.json';
import eventsCommon from '../../content/events/common.json';
import eventsRoyal1592 from '../../content/events/royal-1592.json';
import era1800s from '../../content/eras/1800s.json';
import events1800s from '../../content/events/1800s.json';
import eventsCommon1800s from '../../content/events/common-1800s.json';
import eventsRoyal1800s from '../../content/events/royal-1800s.json';
import knowledge from '../../content/knowledge.json';
import records from '../../content/records.json';
import names from '../../content/names.json';
import sources from '../../content/sources.json';
import mortality from '../../content/mortality.json';
import mindsets from '../../content/mindsets.json';
import era660 from '../../content/eras/660.json';
import events660 from '../../content/events/660.json';
import eventsRoyal660 from '../../content/events/royal-660.json';
import eventsCommon660 from '../../content/events/common-660.json';
import era1170 from '../../content/eras/1170.json';
import events1170 from '../../content/events/1170.json';
import eventsRoyal1170 from '../../content/events/royal-1170.json';
import eventsCommon1170 from '../../content/events/common-1170.json';
import type { Content } from '../engine/types';
import { validateContent } from './validate';

/** content/ 기준 상대 경로 → 파일 내용. 테스트가 디스크의 파일 목록과 대조한다. */
export const FILES: Record<string, unknown> = {
  'eras/1592.json': era1592,
  'events/1592.json': events1592,
  'events/common.json': eventsCommon,
  'events/royal-1592.json': eventsRoyal1592,
  'eras/1800s.json': era1800s,
  'events/1800s.json': events1800s,
  'events/common-1800s.json': eventsCommon1800s,
  'events/royal-1800s.json': eventsRoyal1800s,
  'knowledge.json': knowledge,
  'records.json': records,
  'names.json': names,
  'sources.json': sources,
  'mortality.json': mortality,
  'mindsets.json': mindsets,
  'eras/660.json': era660,
  'events/660.json': events660,
  'events/royal-660.json': eventsRoyal660,
  'events/common-660.json': eventsCommon660,
  'eras/1170.json': era1170,
  'events/1170.json': events1170,
  'events/royal-1170.json': eventsRoyal1170,
  'events/common-1170.json': eventsCommon1170,
};

export function buildContent(files: Record<string, unknown> = FILES): unknown {
  const eras: unknown[] = [];
  const events: unknown[] = [];
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith('eras/')) eras.push(data);
    else if (path.startsWith('events/')) events.push(...(data as unknown[]));
  }
  return {
    eras,
    events,
    knowledge: files['knowledge.json'],
    records: files['records.json'],
    names: files['names.json'],
    sources: files['sources.json'],
    mortality: files['mortality.json'],
    mindsets: files['mindsets.json'],
  };
}

let cached: Content | null = null;

/** 검증을 통과한 콘텐츠. 검증에 실패하면 오류를 던진다. */
export function loadContent(): Content {
  if (cached) return cached;
  const raw = buildContent();
  const result = validateContent(raw);
  if (!result.ok) throw new Error(`콘텐츠 검증 실패:\n${result.errors.join('\n')}`);
  cached = raw as Content;
  return cached;
}
