import { useEffect, useRef, useState } from 'react';
import type { CheckResult, ShowcaseRecord, TaskDef } from '../../../src/types.ts';
import { checkSession, createSession, endSession, shareSession } from '../api.ts';
import { Celebration } from '../components/Celebration.tsx';
import { QrDialog } from '../components/QrCode.tsx';
import { Terminal, type TerminalHandle } from '../components/Terminal.tsx';
import { LangToggle, Stars } from '../components/ui.tsx';
import { useI18n } from '../i18n.ts';
import { formatMs } from '../progress.ts';

const CHECK_EVERY_MS = 5000;

interface Props {
  task: TaskDef;
  tiersCleared: number;
  tiersTotal: number;
  onCleared(ms: number): void;
  onOpen(id: string | null): void;
  onToggleLang(): void;
}

function useTypewriter(text: string): string {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const timer = setInterval(() => setShown((n) => (n >= text.length ? n : n + 2)), 24);
    return () => clearInterval(timer);
  }, [text]);
  return text.slice(0, shown);
}

export function PlayPage({ task, tiersCleared, tiersTotal, onCleared, onOpen, onToggleLang }: Props) {
  const { lang, t, l } = useI18n();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
  const [exit, setExit] = useState<'exited' | 'disconnected' | null>(null);
  const [tab, setTab] = useState<'terminal' | 'preview'>('terminal');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [stepsDone, setStepsDone] = useState<boolean[]>(() => task.steps.map(() => false));
  const [typed, setTyped] = useState<number | null>(null);
  // A prompt sits in the input box and nothing happens until the visitor sends it.
  const [awaitingEnter, setAwaitingEnter] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [missed, setMissed] = useState(false);
  const [clearedMs, setClearedMs] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [share, setShare] = useState<ShowcaseRecord | undefined>();
  const [qrOpen, setQrOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const terminal = useRef<TerminalHandle>(null);
  const story = useTypewriter(l(task.story));
  const hasChecks = (task.checks?.length ?? 0) > 0;

  // The session's language is fixed at the moment the level starts.
  const startLang = useRef(lang);
  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    createSession(task.id, startLang.current)
      .then((created) => {
        id = created;
        if (cancelled) endSession(created);
        else setSessionId(created);
      })
      .catch(() => setFailed(true));
    const onUnload = () => id && endSession(id);
    window.addEventListener('pagehide', onUnload);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onUnload);
      if (id) endSession(id);
    };
  }, [task.id]);

  useEffect(() => {
    if (clearedMs !== null) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(timer);
  }, [clearedMs]);

  const finish = () => {
    const ms = Date.now() - startedAt.current;
    setClearedMs(ms);
    setCelebrating(true);
    onCleared(ms);
  };

  const check = async (manual: boolean) => {
    if (!sessionId || clearedMs !== null) return;
    if (manual) setChecking(true);
    try {
      const res = await checkSession(sessionId);
      setResults(res.results);
      if (res.share) setShare(res.share);
      if (res.done) finish();
      else if (manual) setMissed(true);
    } catch {
      // The next poll retries.
    } finally {
      if (manual) setChecking(false);
    }
  };
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    if (!sessionId || !hasChecks || clearedMs !== null) return;
    const timer = setInterval(() => void checkRef.current(false), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [sessionId, hasChecks, clearedMs]);

  useEffect(() => {
    if (!missed) return;
    const timer = setTimeout(() => setMissed(false), 2500);
    return () => clearTimeout(timer);
  }, [missed]);

  const markStep = (i: number, done: boolean) => setStepsDone((prev) => prev.map((v, j) => (j === i ? done : v)));

  const typePrompt = (i: number, text: string) => {
    setTab('terminal');
    terminal.current?.type(text);
    // Everything before a step the visitor has reached counts as seen.
    setStepsDone((prev) => prev.map((v, j) => v || j <= i));
    setTyped(i);
    setAwaitingEnter(true);
  };

  const par = task.parMinutes !== undefined ? task.parMinutes * 60_000 : null;
  const shownMs = clearedMs ?? elapsed;
  const overtime = par !== null && shownMs > par;
  const doneCount = stepsDone.filter(Boolean).length;

  return (
    <div className="flex h-full flex-col bg-bg-backdrop">
      <header className="flex items-center gap-4 border-b border-line bg-bg-bar px-5 py-3">
        <button onClick={() => onOpen(null)} className="text-sm text-dim hover:text-q-green">
          ← {t('back')}
        </button>
        <span className="text-2xl">{task.emoji}</span>
        <h1 className="font-bold text-fg">{l(task.title)}</h1>
        <Stars level={task.level} />
        <div className="ml-auto flex items-center gap-4">
          {share && clearedMs !== null && !celebrating && (
            // The celebration is where the QR code lives. This brings it back after "keep playing".
            <button onClick={() => setCelebrating(true)} className="rounded-full border border-q-purple/60 px-3 py-1 text-sm text-q-purple hover:bg-q-purple/10">
              {t('takeHomeButton')}
            </button>
          )}
          <div
            className={`text-lg font-bold tabular-nums ${overtime ? 'text-q-red' : par !== null ? 'text-q-purple' : 'text-dim'}`}
            title={overtime ? t('overtime') : undefined}
          >
            {par !== null ? `${overtime ? '+' : ''}${formatMs(par - shownMs)}` : formatMs(shownMs)}
          </div>
          <span className="text-xs text-dim">
            {tiersCleared}/{tiersTotal}
          </span>
          <LangToggle onToggle={onToggleLang} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-r border-line bg-bg-bar p-5">
          <h2 className="text-xs uppercase tracking-widest text-dim">{t('story')}</h2>
          <p className="mt-2 min-h-24 text-sm leading-relaxed text-fg">
            {story}
            <span className="animate-blink text-q-green">▌</span>
          </p>

          <h2 className="mt-5 text-xs uppercase tracking-widest text-dim">{t('goal')}</h2>
          <p className="mt-2 rounded-lg border border-q-green/30 bg-q-green/5 p-3 text-sm leading-relaxed text-q-green">
            {l(task.goal)}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <h2 className="text-xs uppercase tracking-widest text-dim">{t('steps')}</h2>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-q-green transition-all duration-500"
                style={{ width: `${(doneCount / task.steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ol className="mt-3 space-y-3">
            {task.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <button
                  onClick={() => markStep(i, !stepsDone[i])}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                    stepsDone[i] ? 'border-q-green bg-q-green text-bg-term' : 'border-dim text-dim hover:border-q-green'
                  }`}
                  aria-label={`step ${i + 1}`}
                >
                  {stepsDone[i] ? '✓' : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-relaxed ${stepsDone[i] ? 'text-dim' : 'text-fg'}`}>{l(step.hint)}</p>
                  {step.prompt && (
                    <button
                      onClick={() => typePrompt(i, l(step.prompt!))}
                      className="group mt-2 w-full rounded-lg border border-line bg-bg-term p-2.5 text-left text-xs leading-relaxed text-dim hover:border-q-green hover:text-fg"
                    >
                      <span className="text-q-green">{'> '}</span>
                      {l(step.prompt)}
                      <span className="mt-1.5 block text-right text-q-green opacity-60 group-hover:opacity-100">
                        {typed === i ? t('typedHint') : `${t('typeIt')} ⏎`}
                      </span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-auto pt-6">
            {hasChecks && (
              <>
                <h2 className="text-xs uppercase tracking-widest text-dim">{t('checks')}</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {task.checks!.map((c, i) => {
                    const ok = results?.[i]?.ok;
                    return (
                      <li key={i} className={`flex gap-2 ${ok ? 'text-q-green' : 'text-dim'}`}>
                        <span>{ok ? '✓' : '○'}</span>
                        {l(c.label)}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <button
              disabled={!sessionId || checking || clearedMs !== null}
              onClick={() => (hasChecks ? void check(true) : finish())}
              className={`mt-4 w-full rounded-lg py-3 font-bold transition-colors disabled:opacity-40 ${
                missed ? 'bg-q-yellow/20 text-q-yellow' : 'bg-q-green text-bg-term hover:brightness-110'
              }`}
            >
              {missed ? t('notYet') : checking ? t('checking') : hasChecks ? t('checkNow') : t('manualDone')}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-line bg-bg-bar px-3 py-1.5 text-sm">
            <span className="mr-2 flex gap-1.5">
              <i className="h-3 w-3 rounded-full bg-q-red" />
              <i className="h-3 w-3 rounded-full bg-q-yellow" />
              <i className="h-3 w-3 rounded-full bg-q-green" />
            </span>
            {(task.preview ? (['terminal', 'preview'] as const) : (['terminal'] as const)).map((name) => (
              <button
                key={name}
                onClick={() => {
                  setTab(name);
                  if (name === 'preview') setPreviewNonce((n) => n + 1);
                  else terminal.current?.focus();
                }}
                className={`rounded-md px-3 py-1 ${tab === name ? 'bg-line text-fg' : 'text-dim hover:text-fg'}`}
              >
                {t(name)}
              </button>
            ))}
            {tab === 'preview' && (
              <button onClick={() => setPreviewNonce((n) => n + 1)} className="px-2 text-dim hover:text-q-green">
                ↻ {t('refresh')}
              </button>
            )}
            {tab === 'preview' && share && (
              <button onClick={() => setQrOpen(true)} className="px-2 text-q-purple hover:brightness-125">
                📱 {t('previewQr')}
              </button>
            )}
            <button
              onClick={() => {
                setExit(null);
                setAwaitingEnter(false);
                setRun((n) => n + 1);
              }}
              className="ml-auto px-2 text-xs text-dim hover:text-q-green"
            >
              ↻ {t('restart')}
            </button>
          </div>

          <div className="relative min-h-0 flex-1 bg-bg-term">
            {/* Hidden, not unmounted: the terminal keeps its size and its qodercli while the preview shows. */}
            <div className={`absolute inset-0 ${tab === 'terminal' ? '' : 'invisible'}`}>
              {sessionId ? (
                <Terminal
                  key={run}
                  ref={terminal}
                  sessionId={sessionId}
                  onExit={(code) => setExit(code === null ? 'disconnected' : 'exited')}
                  onPrompted={() => setAwaitingEnter(true)}
                  onEnter={() => setAwaitingEnter(false)}
                />
              ) : (
                <p className="p-6 text-sm text-dim">{failed ? t('startFailed') : t('starting')}</p>
              )}
              {awaitingEnter && !exit && (
                <button
                  onClick={() => terminal.current?.focus()}
                  className="animate-pop absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full border border-q-green bg-bg-bar/95 px-5 py-2 text-sm text-q-green shadow-[0_0_30px_rgb(42_219_92/0.3)]"
                >
                  {t('pressEnter')} <span className="animate-blink">⏎</span>
                </button>
              )}
              {exit && (
                <div className="absolute inset-x-0 bottom-0 border-t border-q-yellow/40 bg-bg-bar/95 p-3 text-center text-sm text-q-yellow">
                  {t(exit)}
                </div>
              )}
            </div>
            {tab === 'preview' && sessionId && task.preview && (
              <Preview
                key={previewNonce}
                src={`/preview/${sessionId}/${task.preview}`}
                empty={t('previewEmpty')}
                // The page exists, so it can already go home with the visitor, cleared or not.
                onExists={() => task.showcase && !share && void shareSession(sessionId).then((record) => record && setShare(record))}
              />
            )}
          </div>
        </main>
      </div>

      {qrOpen && share && <QrDialog record={share} hint={t('previewQrHint')} onClose={() => setQrOpen(false)} />}

      {celebrating && clearedMs !== null && (
        <Celebration
          task={task}
          ms={clearedMs}
          allCleared={tiersCleared === tiersTotal}
          share={share}
          onMap={() => onOpen(null)}
          onStay={() => setCelebrating(false)}
        />
      )}
    </div>
  );
}

function Preview({ src, empty, onExists }: { src: string; empty: string; onExists?(): void }) {
  const [exists, setExists] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch(src, { method: 'HEAD' }).then((res) => {
      if (cancelled) return;
      setExists(res.ok);
      if (res.ok) onExists?.();
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (exists === null) return null;
  if (!exists) return <p className="absolute inset-0 flex items-center justify-center text-sm text-dim">{empty}</p>;
  return <iframe src={src} title="preview" className="absolute inset-0 h-full w-full border-0 bg-white" />;
}
