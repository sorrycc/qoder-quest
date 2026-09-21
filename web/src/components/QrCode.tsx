import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import type { ShowcaseRecord } from '../../../src/types.ts';

// Four modules of white all round: phone cameras need the quiet zone, more so on a dark page.
const QUIET = 4;

export function QrCode({ text, className }: { text: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
      }
    }
    return { size: count + QUIET * 2, path: d };
  }, [text]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={text} className={className}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

export function QrDialog({ record, hint, onClose }: { record: ShowcaseRecord; hint?: string; onClose(): void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop/80 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="animate-pop w-[min(360px,90vw)] rounded-2xl border border-line bg-bg-bar p-6 text-center">
        <QrCode text={record.url} className="mx-auto w-56 rounded-lg" />
        {record.idea && <p className="mt-4 text-sm text-fg">{record.idea}</p>}
        {hint && <p className="mt-2 text-xs text-dim">{hint}</p>}
        <a href={record.url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-dim underline-offset-4 hover:text-fg hover:underline">
          {record.url}
        </a>
      </div>
    </div>
  );
}
