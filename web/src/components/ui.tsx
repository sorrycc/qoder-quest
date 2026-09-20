import { useI18n } from '../i18n.ts';

export function LangToggle({ onToggle }: { onToggle(): void }) {
  const { lang } = useI18n();
  return (
    <button
      onClick={onToggle}
      className="flex items-center rounded-full border border-line p-0.5 text-xs"
      aria-label="切换语言 / Switch language"
    >
      {(['zh', 'en'] as const).map((code) => (
        <span
          key={code}
          className={`rounded-full px-2.5 py-1 transition-colors ${lang === code ? 'bg-q-green font-bold text-bg-term' : 'text-dim'}`}
        >
          {code === 'zh' ? '中' : 'EN'}
        </span>
      ))}
    </button>
  );
}

export function Stars({ level }: { level: number }) {
  return (
    <span className="tracking-widest text-q-yellow" aria-label={`level ${level}`}>
      {'★'.repeat(level)}
      <span className="text-line">{'★'.repeat(3 - level)}</span>
    </span>
  );
}
