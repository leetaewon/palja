// 회귀 기억(memoryKey)을 사람이 읽을 한 줄로
import { getEvent, renderText, type Content, type LifeState } from '../../engine';
import { firstSentence } from './text';

export interface MemoryLine {
  key: string;
  when: string;
  text: string;
}

export function memoryLines(content: Content, life: LifeState): MemoryLine[] {
  return life.memory.map((key) => {
    try {
      const ev = getEvent(content, key);
      const text = firstSentence(renderText(content, life, ev.text));
      // 문장이 이미 "4월, ..."로 시작하면 달은 한 번만 쓴다
      const month = ev.when?.month && !/^\d+월/.test(text) ? ` ${ev.when.month}월` : '';
      const when = ev.when?.year ? `${ev.when.year}년${month}` : '';
      return { key, when, text };
    } catch {
      return { key, when: '', text: '흐릿한 기억 하나' };
    }
  });
}
