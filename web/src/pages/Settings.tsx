import { useEffect, useState } from 'react';
import type { Settings } from '../../../src/types.ts';
import { fetchSettings, saveSettings } from '../api.ts';
import { LangToggle, Stars } from '../components/ui.tsx';
import { useI18n } from '../i18n.ts';

interface Props {
  onBack(): void;
  onToggleLang(): void;
}

function Switch({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange(next: boolean): void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
        on ? 'border-q-green bg-q-green/30' : 'border-line bg-bg-term'
      }`}
    >
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${on ? 'left-5.5 bg-q-green' : 'left-0.5 bg-dim'}`} />
    </button>
  );
}

export function SettingsPage({ onBack, onToggleLang }: Props) {
  const { t, l } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void fetchSettings().then(setSettings);
  }, []);

  // Every flip is saved on the spot: there is no Save button to forget on a busy booth.
  const patch = (body: Parameters<typeof saveSettings>[0]) => void saveSettings(body).then(setSettings);

  const groups = [
    { title: t('mainTrack'), levels: settings?.levels.filter((level) => level.track !== 'hardcore' && !level.archived) ?? [] },
    { title: t('hardcore'), levels: settings?.levels.filter((level) => level.track === 'hardcore' && !level.archived) ?? [] },
    { title: t('archivedLevels'), levels: settings?.levels.filter((level) => level.archived) ?? [] },
  ];
  const tiersOn = new Set(settings?.levels.filter((level) => level.enabled && !(level.needsVideo && !settings.video)).map((level) => level.level));

  return (
    <div className="backdrop min-h-full">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <header className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm text-dim hover:text-fg">
            ← {t('back')}
          </button>
          <h1 className="text-2xl font-bold text-fg">{t('settings')}</h1>
          <div className="ml-auto">
            <LangToggle onToggle={onToggleLang} />
          </div>
        </header>

        {settings && (
          <>
            <section className="mt-8 flex items-center gap-4 rounded-xl border border-line bg-bg-bar p-5">
              <span className="text-3xl">🎬</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-fg">{t('videoSwitch')}</h2>
                <p className="mt-1 text-sm text-dim">{settings.videoPinned ? t('videoPinned') : t('videoSwitchHint')}</p>
              </div>
              <Switch on={settings.video} disabled={settings.videoPinned} onChange={(video) => patch({ video })} label={t('videoSwitch')} />
            </section>

            {tiersOn.size < 3 && <p className="mt-6 rounded-lg border border-q-yellow/50 bg-q-yellow/10 px-4 py-3 text-sm text-q-yellow">{t('tierEmpty')}</p>}

            {groups.map(
              (group) =>
                group.levels.length > 0 && (
                  <section key={group.title} className="mt-8">
                    <h2 className="text-sm uppercase tracking-widest text-dim">{group.title}</h2>
                    <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-bg-bar">
                      {group.levels.map((level) => (
                        <li key={level.id} className="flex items-center gap-4 px-5 py-3">
                          <span className="text-2xl">{level.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate ${level.enabled ? 'text-fg' : 'text-dim'}`}>{l(level.title)}</div>
                            <div className="text-xs text-dim">
                              {level.id}
                              {level.needsVideo && !settings.video && <span className="ml-2 text-q-yellow">{t('hiddenNoVideo')}</span>}
                            </div>
                          </div>
                          <Stars level={level.level} />
                          <Switch on={level.enabled} onChange={(on) => patch({ levels: { [level.id]: on } })} label={l(level.title)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </>
        )}
      </div>
    </div>
  );
}
