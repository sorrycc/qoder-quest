import { useEffect, useState } from 'react';
import type { ShowcaseRecord } from '../../../src/types.ts';
import { deleteShowcase, fetchShowcase } from '../api.ts';
import { QrDialog } from '../components/QrCode.tsx';
import { LangToggle } from '../components/ui.tsx';
import { useI18n } from '../i18n.ts';
import { formatMs } from '../progress.ts';

interface Props {
  onBack(): void;
  onToggleLang(): void;
}

/** Same server, so a relative address works whatever host the QR code was made for. */
const localPath = (record: ShowcaseRecord) => new URL(record.url).pathname;

export function ShowcasePage({ onBack, onToggleLang }: Props) {
  const { t, lang } = useI18n();
  const [records, setRecords] = useState<ShowcaseRecord[] | null>(null);
  const [qrFor, setQrFor] = useState<ShowcaseRecord | null>(null);

  useEffect(() => {
    void fetchShowcase().then(setRecords);
  }, []);

  const remove = (record: ShowcaseRecord) => {
    if (!confirm(t('showcaseConfirmDelete'))) return;
    void deleteShowcase(record.id).then(() => setRecords((prev) => prev?.filter((r) => r.id !== record.id) ?? null));
  };

  return (
    <div className="backdrop min-h-full">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <header className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm text-dim hover:text-fg">
            ← {t('back')}
          </button>
          <h1 className="text-2xl font-bold text-fg">{t('showcase')}</h1>
          {records && <span className="text-sm text-dim">{records.length}</span>}
          <div className="ml-auto">
            <LangToggle onToggle={onToggleLang} />
          </div>
        </header>

        {records?.length === 0 && <p className="mt-16 text-center text-dim">{t('showcaseEmpty')}</p>}

        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {records?.map((record) => (
            <li key={record.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-bg-bar">
              <a href={localPath(record)} target="_blank" rel="noreferrer" className="group relative block aspect-video overflow-hidden bg-white">
                {/* The page itself, shrunk to a thumbnail. Lazy, or a long wall would start every promo at once. */}
                <iframe
                  src={localPath(record)}
                  title={record.idea ?? record.id}
                  loading="lazy"
                  tabIndex={-1}
                  className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-25 border-0"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-bg-backdrop/70 text-sm text-q-green opacity-0 transition-opacity group-hover:opacity-100">
                  {t('showcaseOpen')} ↗
                </span>
              </a>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 min-h-10 text-sm text-fg">{record.idea ?? record.taskId}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-dim">
                  <span className={record.cleared ? 'text-q-green' : 'text-q-yellow'}>
                    {record.cleared ? `✓ ${formatMs(record.ms)}` : t('showcaseUnfinished')}
                  </span>
                  <span className="truncate">{new Date(record.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB')}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <button onClick={() => setQrFor(record)} className="text-q-green underline-offset-4 hover:underline">
                    {t('showcaseQr')}
                  </button>
                  <button onClick={() => remove(record)} className="ml-auto text-dim underline-offset-4 hover:text-q-red hover:underline">
                    {t('showcaseDelete')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {qrFor && <QrDialog record={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
