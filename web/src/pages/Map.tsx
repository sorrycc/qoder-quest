import { useRef, type MouseEvent } from 'react';
import type { TaskDef } from '../../../src/types.ts';
import { burst } from '../components/Celebration.tsx';
import { LangToggle, Stars } from '../components/ui.tsx';
import { useI18n, type Key } from '../i18n.ts';
import { clearedTiers, formatMs, type Progress } from '../progress.ts';

interface Props {
  tasks: TaskDef[];
  progress: Progress;
  onPick(id: string): void;
  onReset(): void;
  onSettings(): void;
  onToggleLang(): void;
}

function tilt(e: MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--ry', `${x * 10}deg`);
  el.style.setProperty('--rx', `${-y * 10}deg`);
}

function untilt(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.setProperty('--ry', '0deg');
  e.currentTarget.style.setProperty('--rx', '0deg');
}

function TaskCard({ task, index, cleared, optional, onPick }: { task: TaskDef; index: number; cleared?: { ms: number }; optional: boolean; onPick(): void }) {
  const { t, l } = useI18n();
  const boss = task.parMinutes !== undefined;
  return (
    <button
      onClick={onPick}
      onMouseMove={tilt}
      onMouseLeave={untilt}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`card animate-rise group relative flex w-72 flex-col rounded-xl border bg-bg-bar p-5 text-left ${
        boss ? 'border-q-purple/60' : 'border-line'
      } ${optional ? 'opacity-50 hover:opacity-100' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-4xl transition-transform group-hover:scale-125 group-hover:-rotate-6">{task.emoji}</span>
        <Stars level={task.level} />
      </div>
      <h3 className="mt-3 text-lg font-bold text-fg">{l(task.title)}</h3>
      <p className="mt-1 min-h-10 text-sm text-dim">{l(task.tagline)}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-dim">
        <span>
          ~{task.minutes} {t('minutes')}
        </span>
        {task.funny && <span className="rounded-full bg-q-yellow/15 px-2 py-0.5 text-q-yellow">{t('funny')}</span>}
        {boss && <span className="rounded-full bg-q-purple/15 px-2 py-0.5 text-q-purple">BOSS</span>}
        <span className="ml-auto text-q-green opacity-0 transition-opacity group-hover:opacity-100">
          {t('start')} <span className="animate-blink">▌</span>
        </span>
      </div>
      {cleared && (
        <div className="animate-stamp pointer-events-none absolute right-4 top-12 rounded-md border-2 border-q-green px-2 py-0.5 text-sm font-bold text-q-green">
          {t('stamp')} {formatMs(cleared.ms)}
        </div>
      )}
    </button>
  );
}

export function MapPage({ tasks, progress, onPick, onReset, onSettings, onToggleLang }: Props) {
  const { t } = useI18n();
  const logoClicks = useRef(0);
  const tiers = clearedTiers(tasks, progress);
  const tiersTotal = new Set(tasks.map((task) => task.level)).size;
  const main = tasks.filter((task) => task.track !== 'hardcore');
  const hardcore = tasks.filter((task) => task.track === 'hardcore');

  const card = (task: TaskDef) => (
    <TaskCard
      key={task.id}
      task={task}
      index={tasks.indexOf(task)}
      cleared={progress[task.id]}
      // The tier is already cleared through a sibling: still playable, no longer needed.
      optional={tiers.has(task.level) && !progress[task.id]}
      onPick={() => onPick(task.id)}
    />
  );

  return (
    <div className="backdrop min-h-full">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <header className="flex items-center gap-4">
          <button
            className="text-left"
            onClick={() => {
              // Five clicks on the logo: a small reward for the curious.
              if (++logoClicks.current % 5 === 0) burst('🥚');
            }}
          >
            <h1 className="glow text-4xl font-bold text-q-green">
              {'>'} {t('brand')}
              <span className="animate-blink">_</span>
            </h1>
            <p className="mt-2 text-dim">{t('slogan')}</p>
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-fg">
                {tiers.size}
                <span className="text-dim">/{tiersTotal}</span>
              </div>
              <div className="text-xs text-dim">{t('cleared')}</div>
            </div>
            <LangToggle onToggle={onToggleLang} />
          </div>
        </header>

        {([1, 2, 3] as const).map((level) => {
          const group = main.filter((task) => task.level === level);
          if (group.length === 0) return null;
          return (
            <section key={level} className="mt-10">
              <div className="flex items-center gap-3">
                <Stars level={level} />
                <h2 className="text-sm uppercase tracking-widest text-dim">{t(`level${level}` as Key)}</h2>
                <span className={`text-xs ${tiers.has(level) ? 'text-q-green' : 'text-q-yellow'}`}>
                  {tiers.has(level) ? `✓ ${t('tierCleared')}` : t('pickOne')}
                </span>
                <div className="trail animate-march flex-1 opacity-50" />
              </div>
              <div className="mt-4 flex flex-wrap gap-5">{group.map(card)}</div>
            </section>
          );
        })}

        {hardcore.length > 0 && (
          <section className="mt-14 border-t border-line pt-8">
            <div className="flex items-center gap-3">
              <h2 className="text-sm uppercase tracking-widest text-q-purple">{t('hardcore')}</h2>
              <span className="text-xs text-dim">{t('hardcoreHint')}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-5">{hardcore.map(card)}</div>
          </section>
        )}

        <footer className="mt-12 flex justify-center gap-6 text-xs text-dim">
          {tiers.size > 0 && (
            <button onClick={() => confirm(t('confirmReset')) && onReset()} className="underline-offset-4 hover:text-q-red hover:underline">
              {t('newVisitor')}
            </button>
          )}
          {/* For booth staff. Deliberately quiet. */}
          <button onClick={onSettings} className="underline-offset-4 hover:text-fg hover:underline">
            ⚙ {t('settings')}
          </button>
        </footer>
      </div>
    </div>
  );
}
