import { useState, type FormEvent } from 'react';
import { login } from '../api.ts';
import { LangToggle } from '../components/ui.tsx';
import { useI18n } from '../i18n.ts';

interface Props {
  onAuthed(): void;
  onToggleLang(): void;
}

export function LoginPage({ onAuthed, onToggleLang }: Props) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (await login(password)) onAuthed();
      else setWrong(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backdrop flex min-h-full items-center justify-center px-8">
      <div className="absolute right-8 top-8">
        <LangToggle onToggle={onToggleLang} />
      </div>
      <form onSubmit={submit} className="animate-rise w-80 rounded-xl border border-line bg-bg-bar p-6">
        <h1 className="text-2xl font-bold text-fg">{t('brand')}</h1>
        <p className="mt-1 text-sm text-dim">{t('loginHint')}</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-label={t('password')}
          placeholder={t('password')}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setWrong(false);
          }}
          className={`mt-5 w-full rounded-lg border bg-bg-term px-3 py-2 text-fg outline-none focus:border-q-green ${wrong ? 'border-q-red' : 'border-line'}`}
        />
        {wrong && <p className="mt-2 text-sm text-q-red">{t('wrongPassword')}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded-lg bg-q-green py-2 font-bold text-bg-term transition-opacity disabled:opacity-40"
        >
          {t('login')}
        </button>
      </form>
    </div>
  );
}
