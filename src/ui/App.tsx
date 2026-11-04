// 화면 전환과 저장. 화면 목록은 PRD 10장.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBirth, createLife, judgeEnding, regress, type Content, type LifeState } from '../engine';
import { loadContent } from '../content';
import { addToCodex, loadSave, loadSpeed, loadTheme, saveSpeed, saveTheme, storeSave, type Theme } from './lib/storage';
import { newSeed } from './lib/seed';
import { TitleScreen } from './screens/TitleScreen';
import { BirthScreen } from './screens/BirthScreen';
import { LifeScreen } from './screens/LifeScreen';
import { EndingScreen } from './screens/EndingScreen';
import { CodexScreen } from './screens/CodexScreen';
import { SourcesScreen } from './screens/SourcesScreen';
import { AboutScreen } from './screens/AboutScreen';
import { AppContext, type Nav, type Screen } from './context';
import { RegressTransition, type RegressTransitionProps } from './components/RegressTransition';
import { prefersReducedMotion } from './lib/motion';
import { fullName } from './lib/text';

function useContent(): { content: Content | null; error: string | null } {
  return useMemo(() => {
    try {
      return { content: loadContent(), error: null };
    } catch (e) {
      return { content: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);
}

export function App() {
  const { content, error } = useContent();
  if (!content) {
    return (
      <main className="page page--narrow">
        <h1 className="display">팔자록</h1>
        <p>게임 자료를 읽지 못했어요. 새로 고침해 보세요.</p>
        <pre className="error-detail">{error}</pre>
      </main>
    );
  }
  return <Game content={content} />;
}

function Game({ content }: { content: Content }) {
  const initialSave = useMemo(() => loadSave(content), [content]);
  const [hasSave, setHasSave] = useState(initialSave !== null);
  const [life, setLife] = useState<LifeState | null>(initialSave?.life ?? null);
  const [epitaphs, setEpitaphs] = useState<Record<string, string>>(initialSave?.epitaphs ?? {});
  const [stack, setStack] = useState<Screen[]>([{ name: 'title' }]);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [speed, setSpeedState] = useState<1 | 3>(loadSpeed);
  const [fx, setFx] = useState<Omit<RegressTransitionProps, 'onDone'> | null>(null);
  const screen = stack[stack.length - 1];

  // 테마: 라이트 기본, 고른 모드는 기억 (PRD 10-1)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17140f' : '#f2ebdd');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, []);

  const setSpeed = useCallback((s: 1 | 3) => {
    setSpeedState(s);
    saveSpeed(s);
  }, []);

  // 진행 중 인생 저장
  useEffect(() => {
    if (!life) return;
    if (storeSave({ v: 1, life, epitaphs })) setHasSave(true);
  }, [life, epitaphs]);

  // 끝난 인생은 도감에 넣는다
  useEffect(() => {
    if (!life?.dead) return;
    addToCodex(life, judgeEnding(content, life).record.level);
  }, [content, life]);

  // 화면이 바뀌면 맨 위로
  useEffect(() => {
    if (screen.name !== 'life') window.scrollTo({ top: 0 });
  }, [screen]);

  const nav: Nav = useMemo(
    () => ({
      go: (s) => setStack([s]),
      push: (s) => setStack((st) => [...st, s]),
      back: () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : [{ name: 'title' }])),
    }),
    [],
  );

  const startNew = useCallback(
    (seed?: string) => {
      const birth = createBirth(content, seed ?? newSeed());
      setLife(createLife(content, birth));
      setEpitaphs({});
      nav.go({ name: 'birth' });
    },
    [content, nav],
  );

  // 회귀 전환 연출을 띄운 뒤 출생 공개로. 움직임 줄이기 설정이면 바로 넘어간다
  const doRegress = useCallback(() => {
    if (!life) return;
    const next = regress(content, life);
    setLife(next);
    if (life.dead && !prefersReducedMotion()) {
      setFx({
        name: fullName(life.birth),
        fromYear: life.dead.year,
        fromAge: life.dead.age,
        toYear: life.birth.year,
        round: next.lifeIndex,
      });
    } else {
      nav.go({ name: 'birth' });
    }
  }, [content, life, nav]);

  const endFx = useCallback(() => {
    setFx(null);
    nav.go({ name: 'birth' });
  }, [nav]);

  const resume = useCallback(() => {
    if (!life) return;
    nav.go({ name: life.dead ? 'ending' : life.log.length === 0 && life.age === 0 ? 'birth' : 'life' });
  }, [life, nav]);

  const ctx = useMemo(
    () => ({ content, nav, theme, toggleTheme, speed, setSpeed }),
    [content, nav, theme, toggleTheme, speed, setSpeed],
  );

  let body: React.ReactNode = null;
  switch (screen.name) {
    case 'title':
      body = <TitleScreen canResume={hasSave && life !== null} life={life} onNew={startNew} onResume={resume} />;
      break;
    case 'birth':
      body = life && <BirthScreen life={life} onStart={() => nav.go({ name: 'life' })} />;
      break;
    case 'life':
      body = life && <LifeScreen life={life} setLife={setLife} onSeeRecord={() => nav.go({ name: 'ending' })} />;
      break;
    case 'ending':
      body = life?.dead && (
        <EndingScreen
          life={life}
          epitaph={epitaphs[String(life.lifeIndex)] ?? ''}
          setEpitaph={(t) => setEpitaphs((e) => ({ ...e, [String(life.lifeIndex)]: t }))}
          onRegress={doRegress}
          onNew={() => startNew()}
        />
      );
      break;
    case 'codex':
      body = <CodexScreen />;
      break;
    case 'sources':
      body = <SourcesScreen focus={screen.focus} />;
      break;
    case 'about':
      body = <AboutScreen onCleared={() => { setLife(null); setHasSave(false); }} />;
      break;
  }
  if (!body) body = <TitleScreen canResume={false} life={null} onNew={startNew} onResume={resume} />;

  return (
    <AppContext.Provider value={ctx}>
      {fx ? <RegressTransition {...fx} onDone={endFx} /> : body}
    </AppContext.Provider>
  );
}
