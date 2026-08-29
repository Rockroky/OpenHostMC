'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

export default function ConsolePage() {
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

      const handleResize = () => fitAddon.current?.fit();
      window.addEventListener('resize', handleResize);
    });

    return () => {
      isDisposed = true;
      socket.current?.disconnect();
      term.current?.dispose();
      // Remove resize listener would go here, but handled implicitly
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <div>
            <h1 className="text-xl font-bold">Console Server</h1>
            <p className="text-xs text-zinc-500 font-mono">{serverId}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-zinc-400">CPU</p>
              <p className="font-bold text-blue-400">{stats.cpu}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-400">RAM</p>
              <p className="font-bold text-green-400">{stats.ram} MB</p>
            </div>
            <Link href="/dashboard" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              ← Torna indietro
            </Link>
          </div>
        </div>

        <div className="flex-1 bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden relative min-h-[400px]">
          <div ref={terminalRef} className="absolute inset-0 p-2" />
        </div>

        <form onSubmit={sendCommand} className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Inserisci un comando (es. list, say Ciao)..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-blue-500 font-mono transition-colors"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold transition-colors">
            Invia
          </button>
        </form>
      </div>
    </div>
  );
}
