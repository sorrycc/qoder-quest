import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal as Xterm } from '@xterm/xterm';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { ClientMsg, ServerMsg } from '../../../src/types.ts';

const THEME = {
  background: '#0b0e0c',
  foreground: '#e6e9e6',
  cursor: '#2adb5c',
  cursorAccent: '#0b0e0c',
  selectionBackground: '#2adb5c44',
  black: '#0b0e0c',
  red: '#ff5f57',
  green: '#2adb5c',
  yellow: '#f5c15c',
  blue: '#6cb6ff',
  magenta: '#b48cf2',
  cyan: '#5fd7d7',
  white: '#e6e9e6',
  brightBlack: '#8b918c',
  brightRed: '#ff8a84',
  brightGreen: '#6df08f',
  brightYellow: '#ffd88a',
  brightBlue: '#9ccfff',
  brightMagenta: '#cdb2f7',
  brightCyan: '#8ee9e9',
  brightWhite: '#ffffff',
};

export interface TerminalHandle {
  /** Types text at the qodercli prompt without sending it. */
  type(text: string): void;
  focus(): void;
}

interface Props {
  sessionId: string;
  ref: Ref<TerminalHandle>;
  /** code is null when the socket dropped without qodercli exiting. */
  onExit(code: number | null): void;
  /** The opening prompt has been typed in and waits for Enter. */
  onPrompted(): void;
  /** The visitor pressed Enter. */
  onEnter(): void;
}

/** Mount one per qodercli run. Remount with a new key to restart. */
export function Terminal({ sessionId, ref, onExit, onPrompted, onEnter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onPromptedRef = useRef(onPrompted);
  onPromptedRef.current = onPrompted;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useImperativeHandle(ref, () => ({
    type(text) {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'input', d: text } satisfies ClientMsg));
      xtermRef.current?.focus();
    },
    focus: () => xtermRef.current?.focus(),
  }));

  useEffect(() => {
    const container = containerRef.current!;
    let disposed = false;
    let sawExit = false;

    const xterm = new Xterm({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", ui-monospace, "PingFang SC", "Microsoft YaHei", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 2000,
      theme: THEME,
    });
    xtermRef.current = xterm;
    const fit = new FitAddon();
    xterm.loadAddon(fit);
    xterm.open(container);

    const unicode = new Unicode11Addon();
    xterm.loadAddon(unicode);
    xterm.unicode.activeVersion = '11';

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      xterm.loadAddon(webgl);
    } catch {
      // The DOM renderer is fine.
    }

    const send = (msg: ClientMsg) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    const safeFit = () => {
      // A hidden or collapsing container measures as ~0 and would resize the TUI to nonsense.
      if (container.clientWidth < 16 || container.clientHeight < 16) return;
      try {
        fit.fit();
      } catch {
        // harmless mid-layout
      }
    };

    // Cell size depends on the font, so connect only once it's loaded: qodercli
    // then starts at the right size instead of redrawing after a resize.
    void document.fonts.ready.then(() => {
      if (disposed) return;
      safeFit();
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(
        `${proto}://${location.host}/ws?session=${sessionId}&cols=${xterm.cols}&rows=${xterm.rows}`,
      );
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as ServerMsg;
        if (msg.t === 'data') {
          xterm.write(msg.d);
        } else if (msg.t === 'prompted') {
          onPromptedRef.current();
          xterm.focus();
        } else {
          sawExit = true;
          onExitRef.current(msg.code);
        }
      };
      ws.onclose = () => {
        if (!disposed && !sawExit) onExitRef.current(null);
      };
      xterm.focus();
    });

    const input = xterm.onData((d) => {
      send({ t: 'input', d });
      if (d.includes('\r')) onEnterRef.current();
    });
    const resize = xterm.onResize(({ cols, rows }) => send({ t: 'resize', cols, rows }));

    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(safeFit, 100);
    });
    observer.observe(container);

    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      input.dispose();
      resize.dispose();
      wsRef.current?.close();
      wsRef.current = null;
      xtermRef.current = null;
      xterm.dispose();
    };
  }, [sessionId]);

  return <div ref={containerRef} className="h-full w-full bg-bg-term" />;
}
