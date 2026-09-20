import { useEffect, useState } from 'react';
import type { Lang, TaskDef } from '../../src/types.ts';
import { fetchAuthed, fetchTasks } from './api.ts';
import { LangContext, loadLang, saveLang } from './i18n.ts';
import { LoginPage } from './pages/Login.tsx';
import { MapPage } from './pages/Map.tsx';
import { PlayPage } from './pages/Play.tsx';
import { SettingsPage } from './pages/Settings.tsx';
import { clearedTiers, loadProgress, saveProgress, type Progress } from './progress.ts';

export function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [inSettings, setInSettings] = useState(false);
  // null until the server says whether this browser already carries the login cookie.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchAuthed().then(setAuthed);
  }, []);

  // Again on the way back from settings: the map may have changed.
  useEffect(() => {
    if (authed && !inSettings) void fetchTasks().then(setTasks);
  }, [authed, inSettings]);

  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh' ? 'Qoder CLI 闯关' : 'Qoder CLI Quest';
  }, [lang]);

  const updateProgress = (next: Progress) => {
    setProgress(next);
    saveProgress(next);
  };

  const task = tasks.find((t) => t.id === taskId);
  const tiersCleared = clearedTiers(tasks, progress).size;
  const tiersTotal = new Set(tasks.map((t) => t.level)).size;
  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  return (
    <LangContext value={lang}>
      {authed === null ? null : !authed ? (
        <LoginPage onAuthed={() => setAuthed(true)} onToggleLang={toggleLang} />
      ) : task ? (
        <PlayPage
          // A fresh sandbox and terminal per level.
          key={task.id}
          task={task}
          tiersCleared={tiersCleared}
          tiersTotal={tiersTotal}
          onCleared={(ms) => {
            // Keep the visitor's best time.
            const best = progress[task.id];
            if (!best || ms < best.ms) updateProgress({ ...progress, [task.id]: { ms } });
          }}
          onOpen={setTaskId}
          onToggleLang={toggleLang}
        />
      ) : inSettings ? (
        <SettingsPage onBack={() => setInSettings(false)} onToggleLang={toggleLang} />
      ) : (
        <MapPage
          tasks={tasks}
          progress={progress}
          onPick={setTaskId}
          onReset={() => updateProgress({})}
          onSettings={() => setInSettings(true)}
          onToggleLang={toggleLang}
        />
      )}
    </LangContext>
  );
}
