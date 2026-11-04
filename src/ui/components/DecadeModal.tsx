import { useEffect, useMemo, useState } from 'react';
import type { Content, LifeState } from '../../engine';
import { BrushRule } from './common';

const MINDSET_DESC: Record<string, string> = {
  work: '재산을 모으고 생업에 힘쓴다',
  study: '글공부와 학식을 닦는다',
  family: '집안을 돌보고 신뢰를 쌓는다',
  health: '몸을 보살피고 건강을 지킨다',
  laylow: '몸을 사려 화를 피한다',
};

export interface DecadeModalProps {
  open: boolean;
  content: Content;
  life: LifeState;
  currentMindset: string;
  onConfirm: (newMindset: string, reflectionText: string) => void;
}

export function DecadeModal({ open, content, life, currentMindset, onConfirm }: DecadeModalProps) {
  const [selectedMindset, setSelectedMindset] = useState(currentMindset);
  const [selectedReflection, setSelectedReflection] = useState('');

  const mindsets = useMemo(() => content.mindsets.filter((m) => m.selectable), [content]);

  // 지난 10년(또는 유년기) 요약 문장 추출
  const summaryLines = useMemo(() => {
    const minAge = Math.max(0, life.age - 10);
    const recentLogs = life.log.filter((e) => e.age >= minAge && e.age < life.age && e.text);
    if (recentLogs.length === 0) {
      return ['큰 풍파 없이 담담하게 세월을 보냈습니다.'];
    }
    // 중요한 사건 위주로 최대 3줄
    const events = recentLogs.filter((e) => e.kind === 'event' || e.kind === 'knowledge');
    const pool = events.length > 0 ? events : recentLogs;
    return pool.slice(-3).map((e) => `${e.year}년 (${e.age}세) · ${e.text}`);
  }, [life]);

  // 나이대별 소회 선택지
  const reflectionOptions = useMemo(() => {
    if (life.age <= 10) {
      return [
        '배움과 지혜를 쌓아 세상에 뜻을 세우고 싶다.',
        '부모님의 노고를 덜고 집안에 보탬이 되어야겠다.',
        '그저 큰 병 없이 무탈하게 자라기를 소망한다.',
      ];
    }
    if (life.age <= 20) {
      return [
        '내 힘으로 세상에 나아가 입신양명하고 싶다.',
        '가정을 꾸리고 소중한 사람들을 평안히 지키겠다.',
        '험난한 세월 속에서 묵묵히 내 자리를 지켜내겠다.',
      ];
    }
    if (life.age <= 40) {
      return [
        '집안의 터전을 닦고 이름을 드높이고자 힘쓴다.',
        '자식들이 굶주리지 않고 평안히 자라는 것이 제일이다.',
        '세상의 부귀영화보다 그저 탈 없는 하루가 간절하다.',
      ];
    }
    return [
      '남은 날 동안 후손들에게 부끄럽지 않은 본이 되고 싶다.',
      '지난날의 풍파를 뒤로하고 하루하루 감사하며 살겠다.',
      '인생은 봄날의 꿈과 같으니, 올 때를 담담히 기다린다.',
    ];
  }, [life.age]);

  useEffect(() => {
    if (open) {
      setSelectedMindset(currentMindset === 'child' ? 'work' : currentMindset);
      setSelectedReflection(reflectionOptions[0]);
    }
  }, [open, currentMindset, reflectionOptions]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="decade-title">
      <div className="decade-modal" onClick={(e) => e.stopPropagation()}>
        <header className="decade-modal__head">
          <p className="label">생애의 변곡점</p>
          <h2 id="decade-title" className="decade-modal__title">
            어느덧 {life.age}세가 되었습니다
          </h2>
          <p className="hint">{life.year}년, 지나온 삶을 돌아보고 앞으로의 마음가짐을 가다듬습니다.</p>
        </header>

        <section className="decade-modal__section">
          <h3 className="decade-modal__subtitle">지난 10년의 발자취</h3>
          <ul className="decade-modal__summary">
            {summaryLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <BrushRule />

        <section className="decade-modal__section">
          <h3 className="decade-modal__subtitle">앞으로의 마음가짐</h3>
          <div className="decade-modal__mindsets">
            {mindsets.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`decade-opt-btn ${selectedMindset === m.id ? 'is-active' : ''}`}
                onClick={() => setSelectedMindset(m.id)}
              >
                <strong>{m.name}</strong>
                <span className="decade-opt-btn__desc">{MINDSET_DESC[m.id] ?? ''}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="decade-modal__section">
          <h3 className="decade-modal__subtitle">이 시절 품은 삶의 소회</h3>
          <div className="decade-modal__reflections">
            {reflectionOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={`decade-reflect-btn ${selectedReflection === opt ? 'is-active' : ''}`}
                onClick={() => setSelectedReflection(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <footer className="decade-modal__foot">
          <button
            type="button"
            className="btn btn--primary btn--big"
            onClick={() => onConfirm(selectedMindset, selectedReflection)}
          >
            이 마음으로 살아가기
          </button>
        </footer>
      </div>
    </div>
  );
}
