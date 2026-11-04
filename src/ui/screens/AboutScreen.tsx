// 이 게임에 대하여: 안내, 규칙, 근거 자료, 영감 출처 (PRD 9장, 10장 1, 13장)
import { useState } from 'react';
import { MAX_REGRESSIONS } from '../../engine';
import { REPO_URL } from '../../config';
import { useApp } from '../context';
import { TopBar } from '../components/common';
import { Notice } from './TitleScreen';
import { clearAll } from '../lib/storage';

const RESEARCH_DOCS = [
  { path: 'docs/02-research/status-ratios.md', title: '시대별 신분 구성 추정' },
  { path: 'docs/02-research/life-death.md', title: '수명·사망 원인과 게임 사망 모델' },
  { path: 'docs/02-research/eras/1592-imjin-war.md', title: '1592 임진왜란' },
  { path: 'docs/02-research/eras/0660-baekje-fall.md', title: '660 백제 멸망' },
  { path: 'docs/02-research/eras/1170-military-coup.md', title: '1170 무신정변' },
  { path: 'docs/02-research/eras/1800s-sedo-politics.md', title: '1800년대 세도정치' },
  { path: 'docs/02-research/sources.md', title: '참고 문헌 목록' },
];

export function AboutScreen({ onCleared }: { onCleared: () => void }) {
  const { nav } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <div className="page">
      <TopBar back="back" title="이 게임에 대하여" />
      <main className="about prose">
        <h1 className="display">이 게임에 대하여</h1>
        <p>
        「팔자록」은 이 땅의 지난 시대 어딘가에 무작위로 태어나 한 번의 일생을 사는 텍스트 게임입니다. 태어난 시대와 신분이 삶의 거의
          모든 것을 정합니다. 죽은 뒤에는 같은 삶으로 돌아가 팔자를 고쳐 보거나, 전혀 다른 삶으로 다시 태어날 수 있어요.
        </p>
        <Notice />

        <h2 className="section-title">어떻게 하나요</h2>
        <ul className="rules">
          <li>한 해가 지날 때마다 연대기에 문장이 쌓입니다. 열 살부터는 해마다 마음가짐(일·공부·가족·몸 돌보기·숨죽이기)을 고를 수 있어요.</li>
          <li>갈림길이 오면 진행이 멈추고 선택을 기다립니다.</li>
          <li>
            죽으면 <strong>팔자 고치기</strong>로 같은 출생으로 돌아갈 수 있어요. 한 인생에 {MAX_REGRESSIONS}번까지입니다. 돌아간 삶에서는
            지난 삶에서 겪은 큰일을 기억하고(<span className="choice__tag choice__tag--memory">기억</span>), 현대 지식을 쓸 수 있어요(
            <span className="choice__tag choice__tag--knowledge">현대 지식</span>).
          </li>
          <li>지식이 있어도 신분이 들어주지 않습니다. 현대 지식이 닿는 범위(가족·마을·고을·나라)는 신분·재산·신뢰·학식에 따라 정해져요.</li>
          <li>바꾼 결과는 그 인생 안에서만 이어집니다.</li>
          <li>
            큰 화면에서는 키보드로도 할 수 있어요. 숫자키로 마음가짐과 선택지, 스페이스로 진행·멈춤, →로 한 해 넘기기, Enter로 기록 보기.
          </li>
        </ul>

        <h2 className="section-title">근거와 각색</h2>
        <p>
          출생 확률, 연표 사건, 수명은 역사 연구를 바탕으로 했습니다. 다만 신분 비율과 수명은 연구자마다 추정이 다르고, 개인의 사건은
          시대 흐름에 맞춰 지어낸 이야기입니다. 게임 안의 인물은 모두 가상 인물이에요. 각 근거에는 [확인]·[추정]·[각색] 표시를 붙였습니다.
        </p>
        <p>
          <button type="button" className="btn" onClick={() => nav.push({ name: 'sources' })}>
            게임 안 근거 보기
          </button>
        </p>
        <ul className="doc-links">
          {RESEARCH_DOCS.map((d) => (
            <li key={d.path}>
              <a href={`${REPO_URL}/blob/main/${d.path}`} target="_blank" rel="noopener noreferrer">
                {d.title} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>

        <h2 className="section-title">영감</h2>
        <p>
          현대 통계로 무작위 출생을 체험하는 인생 시뮬레이션 「80억분의 1」(1in8b.life)에서 영감을 받았습니다. 이 게임은 공간 대신 시대를,
          나라 대신 신분을 뽑고, 회귀라는 장치를 더했습니다. 화면과 문구는 따로 만들었어요.
        </p>
        <p>
          기획과 조사는 사람이, 구현과 문장 작업은 Claude와 함께 했습니다. 소스 코드와 조사 문서는{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            저장소
          </a>
          에 공개되어 있어요.
        </p>

        <h2 className="section-title">저장</h2>
        <p>
          진행 중인 인생, 인생 도감, 화면 모드는 이 기기의 브라우저(localStorage)에만 저장됩니다. 서버로 보내는 정보는 없어요. 묘비 한 줄도
          마찬가지입니다.
        </p>
        {!confirm ? (
          <button type="button" className="btn" onClick={() => setConfirm(true)} disabled={cleared}>
            {cleared ? '모두 지웠어요' : '저장한 기록 모두 지우기'}
          </button>
        ) : (
          <div className="confirm" role="group" aria-label="지우기 확인">
            <p>진행 중인 인생과 인생 도감이 모두 사라집니다. 지울까요?</p>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                clearAll();
                onCleared();
                setConfirm(false);
                setCleared(true);
              }}
            >
              지우기
            </button>{' '}
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              그만두기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
