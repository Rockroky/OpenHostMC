'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, ArrowLeft, Send, RefreshCw } from 'lucide-react';

import { Suspense } from 'react';

function ConsoleInner() {
  const searchParams = useSearchParams();
  const serverId = searchParams?.get('serverId');
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const socket = useRef<Socket | null>(null);
  const [command, setCommand] = useState('');
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !serverId || !terminalRef.current) return;

    let isDisposed = false;

    // Dynamically import xterm to avoid SSR issues
    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit')
    ]).then(([{ Terminal }, { FitAddon }]) => {
      if (isDisposed) return;

      term.current = new Terminal({
        theme: { background: '#18181b', foreground: '#e4e4e7' },
        fontFamily: 'monospace',
        fontSize: 14,
        convertEol: true,
      });
      
      fitAddon.current = new FitAddon();
      term.current.loadAddon(fitAddon.current);
      term.current.open(terminalRef.current!);
      fitAddon.current.fit();

      const host = window.location.hostname;
      socket.current = io(`ws://${host}:3005/console`, {
        transports: ['websocket'],
      });

      const token = localStorage.getItem('token');
      
      socket.current.on('connect', () => {
        term.current?.writeln('\x1b[32m[Sistema] Connesso al WebSocket del server.\x1b[0m');
        socket.current?.emit('join-console', { serverId, token });
      });

      socket.current.on('console-log', (data: string) => {
        term.current?.write(data);
      });

      socket.current.on('console-error', (err: string) => {
        term.current?.writeln(`\x1b[31m[Errore] ${err}\x1b[0m`);
      });

      socket.current.on('stats', (data: { cpu: number; ram: number }) => {
        setStats(data);
      });

      socket.current.on('disconnect', () => {
        term.current?.writeln('\x1b[31m[Sistema] Disconnesso dal server.\x1b[0m');
      });

      const handleResize = () => {
        try {
          fitAddon.current?.fit();
        } catch {}
      };
      window.addEventListener('resize', handleResize);

      let resizeObserver: ResizeObserver | null = null;
      if (terminalRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(terminalRef.current);
      }

      setTimeout(handleResize, 150);
    });

    return () => {
      isDisposed = true;
      socket.current?.disconnect();
      term.current?.dispose();
    };
  }, [mounted, serverId]);

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !socket.current || !serverId) return;
    const token = localStorage.getItem('token');
    socket.current.emit('send-command', { serverId, command: command.trim(), token });
    term.current?.writeln(`> ${command.trim()}`);
    setCommand('');
  };

  if (!mounted) return <div className="p-8 text-white">Caricamento...</div>;

  if (!serverId) {
    return <div className="p-8 text-red-400">ID Server mancante! <Link href="/dashboard" className="underline">Torna alla dashboard</Link></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-3 sm:p-6">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white">Console Server</h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-mono truncate">{serverId}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="bg-zinc-950 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-800 text-center text-xs">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">CPU</p>
              <p className="font-bold text-blue-400 font-mono">{stats.cpu}%</p>
            </div>
            <div className="bg-zinc-950 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-800 text-center text-xs">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">RAM</p>
              <p className="font-bold text-emerald-400 font-mono truncate">{stats.ram} MB</p>
            </div>
            <Link
              href="/dashboard"
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg sm:rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-zinc-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 bg-zinc-950 rounded-xl sm:rounded-2xl border border-zinc-800 overflow-hidden relative h-[360px] xs:h-[420px] sm:h-[480px] md:h-[560px] shadow-2xl">
          <div ref={terminalRef} className="absolute inset-0 p-3" />
        </div>

        <form onSubmit={sendCommand} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Inserisci un comando Minecraft (es. list, op Steve, say Buongiorno)..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 sm:py-3 outline-none focus:border-blue-500 font-mono text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!command.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-white w-full sm:w-auto shrink-0"
          >
            <span>Invia</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <ConsoleInner />
    </Suspense>
  );
}
