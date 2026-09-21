import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { ShowcaseRecord, TaskDef } from '../../../src/types.ts';
import { useI18n } from '../i18n.ts';
import { formatMs } from '../progress.ts';
import { QrCode } from './QrCode.tsx';

const COLORS = ['#2adb5c', '#b48cf2', '#f5c15c', '#e6e9e6'];

export function burst(emoji?: string): void {
  // Funny levels rain their own emoji instead of paper.
  const shapes = emoji ? [confetti.shapeFromText({ text: emoji, scalar: 3 })] : undefined;
  const base = { colors: COLORS, shapes, scalar: emoji ? 3 : 1, disableForReducedMotion: true };
  void confetti({ ...base, particleCount: emoji ? 40 : 120, spread: 80, origin: { x: 0.5, y: 0.6 } });
  setTimeout(() => {
    void confetti({ ...base, particleCount: emoji ? 20 : 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    void confetti({ ...base, particleCount: emoji ? 20 : 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
  }, 250);
}

interface Props {
  task: TaskDef;
  ms: number;
  allCleared: boolean;
  /** The page the visitor built, kept on the server. */
  share?: ShowcaseRecord;
  onMap(): void;
  onStay(): void;
}

export function Celebration({ task, ms, allCleared, share, onMap, onStay }: Props) {
  const { t, l } = useI18n();

  useEffect(() => {
    burst(task.funny || task.parMinutes ? task.emoji : undefined);
  }, [task]);

  const bossLine =
    task.parMinutes !== undefined ? t(ms <= task.parMinutes * 60_000 ? 'bossInTime' : 'bossLate') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop/80 backdrop-blur-sm">
      <div className="animate-pop w-[min(440px,90vw)] rounded-2xl border border-q-green bg-bg-bar p-8 text-center shadow-[0_0_80px_rgb(42_219_92/0.25)]">
        <div className="animate-float text-7xl">{task.emoji}</div>
        <h2 className="glow mt-4 text-3xl font-bold text-q-green">{t('clearedTitle')}</h2>
        <p className="mt-2 text-fg">{l(task.title)}</p>
        <p className="mt-4 text-sm text-dim">
          {t('clearedIn')} <span className="text-xl font-bold text-q-yellow">{formatMs(ms)}</span>
        </p>
        {bossLine && <p className="mt-1 text-sm text-q-purple">{bossLine}</p>}
        {share && (
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-q-purple/40 bg-q-purple/5 p-3 text-left">
            <QrCode text={share.url} className="w-28 shrink-0 rounded-md" />
            <div className="min-w-0">
              <p className="font-bold text-q-purple">{t('takeHome')}</p>
              <p className="mt-1 text-xs text-dim">{t('takeHomeHint')}</p>
              <a href={share.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-dim underline-offset-4 hover:text-fg hover:underline">
                {share.url}
              </a>
            </div>
          </div>
        )}
        {allCleared && <p className="mt-4 rounded-lg bg-q-green/10 p-3 text-sm text-q-green">{t('allCleared')}</p>}
        <div className="mt-6 flex flex-col gap-2">
          {/* The next tier is the visitor's pick, so the way forward is the map. */}
          <button onClick={onMap} className="rounded-lg bg-q-green py-3 font-bold text-bg-term hover:brightness-110">
            {allCleared ? t('back') : `${t('next')} →`}
          </button>
          <button onClick={onStay} className="py-1 text-sm text-dim hover:text-fg">
            {t('keepPlaying')}
          </button>
        </div>
      </div>
    </div>
  );
}
