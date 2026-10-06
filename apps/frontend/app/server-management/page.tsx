'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Server,
  Terminal,
  Sliders,
  Users,
  FolderTree,
  Share2,
  Play,
  RotateCw,
  Square,
  Lock,
  Shield,
  ShieldCheck,
  User as UserIcon,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  ArrowRight,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Search,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
  Power,
  Activity,
  Globe,
  Plus,
  X,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/ui/Toast';
import ShareModal from '../components/ShareModal';
import { clearSession, getToken, getUser } from '../lib/auth';

interface ServerDetails {
  id: string;
  name: string;
  subdomain: string;
  mc_version: string;
  mc_type: string;
  status: string;
  port: number | null;
  allocated_ram_mb?: number;
  allocated_cpu_cores?: number;
  owner_id: string;
  owner?: { id: string; username: string; email?: string };
  collaborators?: Array<{
    id: string;
    user_id: string;
    role?: 'MANAGER' | 'OPERATOR';
    user?: { id: string; username: string; email?: string; plan?: { can_edit_shared_servers?: boolean } };
  }>;
  plan?: { name: string; ram_mb: number; cpu_cores: number };
}

interface ServerProperties {
  [key: string]: string;
}

const CATEGORIZED_PROPERTIES: Record<
  string,
  {
    title: string;
    description: string;
    keys: {
      key: string;
      label: string;
      type: 'boolean' | 'select' | 'number' | 'text' | 'range';
      options?: string[];
      min?: number;
      max?: number;
      unit?: string;
    }[];
  }
> = {
  gameplay: {
    title: 'Gioco & Meccaniche',
    description: 'Modalità di gioco, difficoltà, PvP e regole del mondo',
    keys: [
      { key: 'gamemode', label: 'Modalità di Gioco', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'] },
      { key: 'difficulty', label: 'Difficoltà', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
      { key: 'pvp', label: 'Combattimento PvP', type: 'boolean' },
      { key: 'hardcore', label: 'Modalità Hardcore', type: 'boolean' },
      { key: 'allow-flight', label: 'Consenti Volo', type: 'boolean' },
      { key: 'force-gamemode', label: 'Forza Modalità Predefinita', type: 'boolean' },
      { key: 'spawn-monsters', label: 'Genera Mostri', type: 'boolean' },
      { key: 'spawn-animals', label: 'Genera Animali', type: 'boolean' },
      { key: 'spawn-npcs', label: 'Genera Villici / NPC', type: 'boolean' },
    ],
  },
  world: {
    title: 'Mondo & Generazione',
    description: 'Nome cartella mondo, seed, tipo di bioma e Nether',
    keys: [
      { key: 'level-name', label: 'Nome del Mondo', type: 'text' },
      { key: 'level-seed', label: 'Seed di Generazione', type: 'text' },
      {
        key: 'level-type',
        label: 'Tipo di Mondo',
        type: 'select',
        options: ['minecraft:normal', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified'],
      },
      { key: 'generate-structures', label: 'Genera Strutture (Villaggi, Fortezze)', type: 'boolean' },
      { key: 'allow-nether', label: 'Abilita Nether', type: 'boolean' },
      { key: 'max-world-size', label: 'Raggio Massimo Mondo (blocchi)', type: 'number' },
    ],
  },
  network: {
    title: 'Rete & Prestazioni',
    description: 'Distanza di rendering, max giocatori, porte e tick time',
    keys: [
      { key: 'max-players', label: 'Numero Massimo Giocatori', type: 'range', min: 1, max: 200, unit: 'players' },
      { key: 'view-distance', label: 'Distanza Visiva (Chunk)', type: 'range', min: 4, max: 32, unit: 'chunks' },
      { key: 'simulation-distance', label: 'Distanza Simulazione (Chunk)', type: 'range', min: 4, max: 24, unit: 'chunks' },
      { key: 'network-compression-threshold', label: 'Soglia Compressione Pacchetti', type: 'number' },
      { key: 'sync-chunk-writes', label: 'Scrittura Sincrona Chunk', type: 'boolean' },
      { key: 'max-tick-time', label: 'Timeout Watchdog Tick (ms)', type: 'number' },
      { key: 'pause-when-empty-seconds', label: 'Pausa quando vuoto (sec)', type: 'number' },
    ],
  },
  security: {
    title: 'Sicurezza & Whitelist',
    description: 'Autenticazione online mode, whitelist obbligatoria e protezione',
    keys: [
      { key: 'white-list', label: 'Whitelist Attiva', type: 'boolean' },
      { key: 'enforce-whitelist', label: 'Forza Whitelist (Kick immediato)', type: 'boolean' },
      { key: 'online-mode', label: 'Online Mode (Account Mojang Ufficiali)', type: 'boolean' },
      { key: 'enforce-secure-profile', label: 'Verifica Firma Chat Sicura', type: 'boolean' },
      { key: 'prevent-proxy-connections', label: 'Blocca Proxy / VPN', type: 'boolean' },
      { key: 'spawn-protection', label: 'Raggio Protezione Spawn (blocchi)', type: 'number' },
      { key: 'hide-online-players', label: 'Nascondi Lista Giocatori Online', type: 'boolean' },
    ],
  },
  advanced: {
    title: 'Avanzate & RCON',
    description: 'MOTD del server, command blocks e protocollo RCON remoto',
    keys: [
      { key: 'motd', label: 'Messaggio del Giorno (MOTD)', type: 'text' },
      { key: 'enable-command-block', label: 'Abilita Command Block', type: 'boolean' },
      { key: 'enable-rcon', label: 'Abilita Protocollo RCON', type: 'boolean' },
      { key: 'rcon.port', label: 'Porta RCON', type: 'number' },
      { key: 'rcon.password', label: 'Password RCON', type: 'text' },
      { key: 'log-ips', label: 'Registra Indirizzi IP nei Log', type: 'boolean' },
      { key: 'op-permission-level', label: 'Livello Permessi Operatori OP', type: 'range', min: 1, max: 4 },
    ],
  },
};

const API_BASE = '/api/orchestrator';

type ActiveTab = 'overview' | 'console' | 'config' | 'players' | 'files' | 'share';

function ServerManagementContent() {
  const searchParams = useSearchParams();
  const serverId = searchParams?.get('serverId') || searchParams?.get('id') || '';
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [properties, setProperties] = useState<ServerProperties>({});
  const [originalProperties, setOriginalProperties] = useState<ServerProperties>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingProperties, setSavingProperties] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [propertiesSearch, setPropertiesSearch] = useState('');

  // Whitelist state
  const [whitelist, setWhitelist] = useState<{ uuid: string; name: string }[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isWhitelistLoading, setIsWhitelistLoading] = useState(false);

  // Mod & File state
  const [modFiles, setModFiles] = useState<File[]>([]);
  const [isModUploading, setIsModUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ file: string; status: string; reason?: string }[]>([]);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Live Console & Stats WebSocket state
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const consoleSocket = useRef<Socket | null>(null);
  const [command, setCommand] = useState('');
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [isConsoleConnected, setIsConsoleConnected] = useState(false);

  // Load user from session
  useEffect(() => {
    const u = getUser();
    if (u) {
      setCurrentUser(u);
    }
  }, []);

  // Fetch Server Details & Properties
  const loadServerData = async () => {
    if (!serverId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        clearSession();
        window.location.href = `/login?redirect=${encodeURIComponent(`/server-management?id=${serverId}`)}`;
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Get server details from list
      const serversRes = await fetch(`${API_BASE}/servers`, { headers });
      if (serversRes.status === 401) {
        clearSession();
        window.location.href = `/login?expired=true&redirect=${encodeURIComponent(`/server-management?id=${serverId}`)}`;
        return;
      }
      if (serversRes.ok) {
        const serversList: ServerDetails[] = await serversRes.json();
        const found = Array.isArray(serversList) ? serversList.find((s) => s.id === serverId) : null;
        if (found) {
          setServer(found);
        } else {
          setError('Server non trovato o accesso negato');
        }
      }

      // 2. Get properties
      const propRes = await fetch(`${API_BASE}/properties?serverId=${encodeURIComponent(serverId)}`, { headers });
      if (propRes.ok) {
        const propData = await propRes.json();
        if (propData.properties) {
          setProperties(propData.properties);
          setOriginalProperties(propData.properties);
        }
      }

      // 3. Get whitelist
      const whiteRes = await fetch(`${API_BASE}/players/${serverId}/whitelist`, { headers });
      if (whiteRes.ok) {
        const data = await whiteRes.json();
        setWhitelist(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Error loading server data:', err);
      setError('Errore di comunicazione con il backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServerData();
  }, [serverId]);

  // Periodic status refresh
  useEffect(() => {
    if (!serverId) return;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/status?serverId=${serverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setServer((prev) => (prev ? { ...prev, status: data.status } : prev));
        }
      } catch {
        // quiet error on poll
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  // Determine user role
  const getUserRole = (): 'OWNER' | 'MANAGER' | 'OPERATOR' => {
    if (!currentUser || !server) return 'OPERATOR';
    if (server.owner_id === currentUser.id || currentUser.role === 'SUPERADMIN') {
      return 'OWNER';
    }
    const collab = server.collaborators?.find(
      (c) => c.user_id === currentUser.id || c.user?.id === currentUser.id
    );
    if (collab) {
      if (collab.role === 'MANAGER' || collab.user?.plan?.can_edit_shared_servers) {
        return 'MANAGER';
      }
      return 'OPERATOR';
    }
    return 'OPERATOR';
  };

  const userRole = getUserRole();
  const isOperator = userRole === 'OPERATOR';
  const isManagerOrOwner = userRole === 'MANAGER' || userRole === 'OWNER';

  // Live Console setup when activeTab === 'console'
  useEffect(() => {
    if (activeTab !== 'console' || !serverId) {
      if (consoleSocket.current) {
        consoleSocket.current.disconnect();
        consoleSocket.current = null;
      }
      if (term.current) {
        term.current.dispose();
        term.current = null;
      }
      return;
    }

    let isDisposed = false;

    Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]).then(
      ([{ Terminal }, { FitAddon }]) => {
        if (isDisposed || !terminalRef.current) return;

        term.current = new Terminal({
          theme: {
            background: '#09090b',
            foreground: '#e4e4e7',
            cursor: '#10b981',
            selectionBackground: '#10b98133',
          },
          fontFamily: 'monospace',
          fontSize: 13,
          convertEol: true,
          cursorBlink: true,
        });

        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.open(terminalRef.current);
        fitAddon.current.fit();

        const host = window.location.hostname;
        const socket = io(`ws://${host}:3005/console`, {
          transports: ['websocket'],
        });
        consoleSocket.current = socket;

        const token = localStorage.getItem('token');

        socket.on('connect', () => {
          setIsConsoleConnected(true);
          term.current?.writeln('\x1b[32m[OpenHostMC] Connesso al WebSocket del server.\x1b[0m');
          socket.emit('join-console', { serverId, token });
        });

        socket.on('console-log', (data: string) => {
          term.current?.write(data);
        });

        socket.on('console-error', (err: string) => {
          term.current?.writeln(`\x1b[31m[Errore Console] ${err}\x1b[0m`);
        });

        socket.on('stats', (data: { cpu: number; ram: number }) => {
          setStats(data);
        });

        socket.on('disconnect', () => {
          setIsConsoleConnected(false);
          term.current?.writeln('\x1b[31m[OpenHostMC] Disconnesso dal WebSocket.\x1b[0m');
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
      }
    );

    return () => {
      isDisposed = true;
      try {
        fitAddon.current?.fit();
      } catch {}
      if (consoleSocket.current) {
        consoleSocket.current.disconnect();
        consoleSocket.current = null;
      }
      if (term.current) {
        term.current.dispose();
        term.current = null;
      }
    };
  }, [activeTab, serverId]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !consoleSocket.current || !serverId) return;
    if (isOperator) {
      alert('Il tuo ruolo attuale (Operatore) consente solo la visualizzazione della console.');
      return;
    }
    const token = localStorage.getItem('token');
    consoleSocket.current.emit('send-command', { serverId, command: command.trim(), token });
    term.current?.writeln(`\x1b[36m> ${command.trim()}\x1b[0m`);
    setCommand('');
  };

  // Start / Restart / Stop Handlers
  const handleStart = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/start/${serverId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setServer((prev) => (prev ? { ...prev, status: 'STARTING' } : prev));
        toast.info('Avvio in corso...', 'Il server sta avviando il container.');
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.details || d.error || 'Errore avvio server');
      }
    } catch (err: any) {
      toast.error('Errore avvio', err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/restart/${serverId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setServer((prev) => (prev ? { ...prev, status: 'STARTING' } : prev));
        toast.info('Riavvio in corso...', 'Il container si sta riavviando.');
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.details || d.error || 'Errore riavvio server');
      }
    } catch (err: any) {
      toast.error('Errore riavvio', err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/stop/${serverId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setServer((prev) => (prev ? { ...prev, status: 'STOPPING' } : prev));
        toast.warning('Arresto in corso...', 'Il server si sta arrestando.');
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Errore arresto server');
      }
    } catch (err: any) {
      toast.error('Errore arresto', err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Property Changes
  const handlePropertyChange = (key: string, value: string) => {
    if (isOperator) return;
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProperties = async () => {
    if (isOperator) return;
    setSavingProperties(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serverId, properties }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nel salvataggio');

      setOriginalProperties(properties);
      const msg = data.writtenToContainer
        ? 'Proprietà salvate e container riavviato automaticamente.'
        : 'Proprietà salvate con successo su disco.';
      setSaveSuccess(msg);
      toast.success('Configurazione salvata', msg);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      toast.error('Errore salvataggio', err.message);
      setError(err.message);
    } finally {
      setSavingProperties(false);
    }
  };

  // Whitelist Handlers
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || isOperator) return;
    setIsWhitelistLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/players/${serverId}/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerName: newPlayerName.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Errore aggiunta giocatore');
      setWhitelist((prev) => [...prev, { uuid: result.uuid, name: result.playerName }]);
      setNewPlayerName('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsWhitelistLoading(false);
    }
  };

  const handleRemovePlayer = async (name: string) => {
    if (isOperator) return;
    if (!confirm(`Rimuovere ${name} dalla whitelist?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/players/${serverId}/whitelist/${name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Errore rimozione giocatore');
      setWhitelist((prev) => prev.filter((p) => p.name !== name));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Upload mods
  const handleUploadMods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modFiles.length === 0 || isOperator) return;
    setIsModUploading(true);
    setUploadResults([]);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      modFiles.forEach((file) => formData.append('files', file));

      const res = await fetch(`${API_BASE}/files/mods/upload-bulk/${serverId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const results = await res.json();
      if (!res.ok) throw new Error(results.message || 'Errore caricamento mod');
      setUploadResults(results);
      setModFiles([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsModUploading(false);
    }
  };

  const handleExportWorld = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/files/world/export/${serverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Errore download mondo');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world_${serverId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportMods = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/files/mods/export/${serverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Errore download mod');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mods_${serverId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!serverId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">ID Server Mancante</h2>
          <p className="text-sm text-zinc-400">Nessun identificatore di server fornito nell'URL.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <span>Torna alla Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Caricamento impostazioni server...</p>
        </div>
      </div>
    );
  }

  const isRunning = server?.status === 'RUNNING';
  const isStopped = server?.status === 'STOPPED' || server?.status === 'CREATED';
  const hasModifiedProperties = JSON.stringify(properties) !== JSON.stringify(originalProperties);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors shrink-0"
              title="Torna alla Dashboard"
            >
              <span>← <span className="hidden sm:inline">Dashboard</span></span>
            </Link>
            <span className="text-zinc-600 shrink-0">/</span>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-bold text-white text-xs sm:text-base truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs">{server?.name || 'Server'}</span>
              <span className="text-[10px] sm:text-xs font-mono text-zinc-500 hidden md:inline shrink-0">({serverId.slice(0, 8)}...)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Share Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              title="Condividi server"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Condividi</span>
            </button>

            {/* Quick Power Controls */}
            {isStopped ? (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Avvia Server"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="text-xs">Avvia<span className="hidden sm:inline"> Server</span></span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleRestart}
                  disabled={actionLoading}
                  className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                  title="Riavvia server"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="hidden sm:inline">Riavvia</span>
                </button>
                <button
                  onClick={handleStop}
                  disabled={actionLoading}
                  className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Arresta server"
                >
                  <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="hidden sm:inline">Arresta</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Operator Banner (if user has OPERATOR role) */}
      {isOperator && (
        <div className="bg-blue-950/40 border-b border-blue-900/50 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Ruolo: Operatore</strong> — Modalità sola lettura, log console e controlli rapidi.
              </span>
            </div>
            <span className="self-start sm:self-auto px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] shrink-0">
              Sola Lettura / Controllo Rapido
            </span>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 font-bold ml-2 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        </div>
      )}

      {/* Tabs Navigation Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 sticky top-[49px] sm:top-[57px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2 sm:py-2.5 no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Panoramica</span>
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'console'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Console Live</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Configurazione</span>
            {isOperator && <Lock className="w-3 h-3 text-zinc-500 shrink-0" />}
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'players'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Giocatori & Whitelist</span>
            {isOperator && <Lock className="w-3 h-3 text-zinc-500 shrink-0" />}
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'files'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mod & File</span>
            {isOperator && <Lock className="w-3 h-3 text-zinc-500 shrink-0" />}
          </button>

          <button
            onClick={() => setActiveTab('share')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              activeTab === 'share'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Condivisione & Team</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full space-y-4 sm:space-y-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="w-full"
          >
            {/* TAB 1: PANORAMICA */}
            {activeTab === 'overview' && server && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
            {/* Server Identity Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <Server className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate max-w-full">{server.name}</h2>
                    <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      {server.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-1 break-all">
                    Indirizzo: <span className="text-zinc-200 select-all font-semibold">{server.subdomain || server.name}.openhostmc.net{server.port ? `:${server.port}` : ''}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
                <button
                  onClick={handleStart}
                  disabled={actionLoading || isRunning}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
                  title="Avvia server"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
                  <span>Avvia</span>
                </button>
                <button
                  onClick={handleRestart}
                  disabled={actionLoading || isStopped}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/40 disabled:text-zinc-600 text-zinc-200 rounded-xl text-xs font-semibold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                  title="Riavvia server"
                >
                  <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                  <span>Riavvia</span>
                </button>
                <button
                  onClick={handleStop}
                  disabled={actionLoading || isStopped}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 disabled:bg-zinc-800/40 disabled:text-zinc-600 text-zinc-200 rounded-xl text-xs font-semibold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                  title="Arresta server"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-red-400 shrink-0" />
                  <span>Arresta</span>
                </button>
              </div>
            </div>

            {/* Hardware & Spec Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                    Allocazione RAM
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">Dedicata</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white break-words">
                  {(server.allocated_ram_mb ? server.allocated_ram_mb / 1024 : 2).toFixed(1)} GB
                </div>
                <div className="text-[11px] text-zinc-500">Memoria heap JVM isolata</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
                    Core CPU
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">Docker limit</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white break-words">
                  {server.allocated_cpu_cores || 1.0} Cores
                </div>
                <div className="text-[11px] text-zinc-500">Thread dedicati con CFS pool</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                    Piattaforma
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">Versione</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white truncate">
                  {server.mc_type}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono truncate">Minecraft {server.mc_version}</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                    Porta Rete
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">TCP</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white break-words">
                  {server.port ? `:${server.port}` : 'Allocata all\'avvio'}
                </div>
                <div className="text-[11px] text-zinc-500">Protocollo Minecraft standard</div>
              </div>
            </div>

            {/* Quick shortcuts grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2">
              <button
                onClick={() => setActiveTab('console')}
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-left transition-all space-y-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm">Console Live & RCON</div>
                <p className="text-xs text-zinc-400">Monitora i log del server in tempo reale e invia comandi amministrativi.</p>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-left transition-all space-y-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>Opzioni Configurazione</span>
                  {isOperator && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
                <p className="text-xs text-zinc-400">Personalizza difficoltà, gamemode, PvP, visuale e parametri server.properties.</p>
              </button>

              <button
                onClick={() => setActiveTab('share')}
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-left transition-all space-y-2 cursor-pointer group sm:col-span-2 lg:col-span-1"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm">Condividi con il Team</div>
                <p className="text-xs text-zinc-400">Genera link di invito e assegna ruoli Manager o Operatore ai collaboratori.</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONSOLE LIVE */}
        {activeTab === 'console' && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
            {/* Console Toolbar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Console WebSocket & RCON</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`w-2 h-2 rounded-full ${isConsoleConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span>{isConsoleConnected ? 'Connesso' : 'Disconnesso'}</span>
                  </div>
                </div>
              </div>

              {/* Resource stats from socket */}
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3 text-xs">
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-center flex-1 sm:flex-initial">
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">CPU Container</span>
                  <span className="font-mono font-bold text-blue-400">{stats.cpu}%</span>
                </div>
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-center flex-1 sm:flex-initial">
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">RAM Utilizzata</span>
                  <span className="font-mono font-bold text-emerald-400">{stats.ram} MB</span>
                </div>
              </div>
            </div>

            {/* Terminal View */}
            <div className="bg-zinc-950 rounded-xl sm:rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative h-[320px] xs:h-[380px] sm:h-[460px] md:h-[520px]">
              <div ref={terminalRef} className="absolute inset-0 p-3" />
            </div>

            {/* Command input form */}
            <form onSubmit={handleSendCommand} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={
                  isOperator
                    ? 'Invio comandi RCON disabilitato per il ruolo Operatore (sola visualizzazione log)'
                    : 'Inserisci un comando Minecraft (es. help, list, op Steve, say Buongiorno)...'
                }
                disabled={isOperator}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 sm:py-3 outline-none focus:border-blue-500 text-xs font-mono text-zinc-100 placeholder-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isOperator || !command.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Invia</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: CONFIGURAZIONE (server.properties) */}
        {activeTab === 'config' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isOperator && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-amber-300">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-100">Modifiche Bloccate (Ruolo Operatore)</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Stai visualizzando le impostazioni attuali del file <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">server.properties</code> in modalità di sola lettura. Per salvare modifiche è necessario il ruolo Manager o Proprietario.
                  </p>
                </div>
              </div>
            )}

            {/* Filter and search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-zinc-900 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-bold text-sm text-white">Parametri server.properties</h3>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cerca impostazione (es. pvp, motd, gamemode)..."
                  value={propertiesSearch}
                  onChange={(e) => setPropertiesSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Property Categories */}
            <div className="space-y-6">
              {Object.entries(CATEGORIZED_PROPERTIES).map(([catKey, category]) => {
                const filteredKeys = category.keys.filter(
                  (item) =>
                    item.label.toLowerCase().includes(propertiesSearch.toLowerCase()) ||
                    item.key.toLowerCase().includes(propertiesSearch.toLowerCase())
                );

                if (filteredKeys.length === 0) return null;

                return (
                  <div key={catKey} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/60">
                      <h4 className="font-bold text-sm text-white">{category.title}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{category.description}</p>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredKeys.map((item) => {
                        const currentVal = properties[item.key] ?? '';

                        return (
                          <div
                            key={item.key}
                            className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between gap-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <label className="font-semibold text-xs text-zinc-200 block">
                                  {item.label}
                                </label>
                                <span className="font-mono text-[10px] text-zinc-500">{item.key}</span>
                              </div>

                              {item.type === 'boolean' && (
                                <button
                                  type="button"
                                  disabled={isOperator}
                                  onClick={() =>
                                    handlePropertyChange(
                                      item.key,
                                      currentVal === 'true' ? 'false' : 'true'
                                    )
                                  }
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                    currentVal === 'true' ? 'bg-emerald-600' : 'bg-zinc-700'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      currentVal === 'true' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            {item.type === 'select' && item.options && (
                              <select
                                value={currentVal}
                                disabled={isOperator}
                                onChange={(e) => handlePropertyChange(item.key, e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-60 cursor-pointer"
                              >
                                {item.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {item.type === 'range' && (
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-zinc-400">
                                  <span>{currentVal || item.min} {item.unit || ''}</span>
                                </div>
                                <input
                                  type="range"
                                  min={item.min ?? 1}
                                  max={item.max ?? 100}
                                  value={parseInt(currentVal) || item.min || 1}
                                  disabled={isOperator}
                                  onChange={(e) => handlePropertyChange(item.key, e.target.value)}
                                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                                />
                              </div>
                            )}

                            {item.type === 'number' && (
                              <input
                                type="number"
                                value={currentVal}
                                disabled={isOperator}
                                onChange={(e) => handlePropertyChange(item.key, e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-60 font-mono"
                              />
                            )}

                            {item.type === 'text' && (
                              <input
                                type="text"
                                value={currentVal}
                                disabled={isOperator}
                                onChange={(e) => handlePropertyChange(item.key, e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-60"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Save Actions Bar */}
            {isManagerOrOwner && (
              <div className="sticky bottom-4 sm:bottom-6 z-20 bg-zinc-900/95 border border-zinc-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="text-xs">
                  {hasModifiedProperties ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Hai modifiche non salvate</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">Tutte le modifiche sono sincronizzate.</span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setProperties(originalProperties)}
                    disabled={!hasModifiedProperties || savingProperties}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-xl text-xs font-semibold transition-colors text-center"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveProperties}
                    disabled={savingProperties}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {savingProperties ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Salvataggio...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Salva Proprietà</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GIOCATORI & WHITELIST */}
        {activeTab === 'players' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isOperator && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-amber-300">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-100">Gestione Giocatori Bloccata</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Il ruolo Operatore permette di consultare la whitelist esistente in sola lettura. Per aggiungere o rimuovere giocatori è richiesto il ruolo Manager o Proprietario.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400 shrink-0" />
                    Gestione Whitelist (whitelist.json)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Controlla chi può entrare nel server Minecraft quando la whitelist è attiva.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs self-start sm:self-auto">
                  <span className="text-zinc-400">Stato Whitelist:</span>
                  <span className={`font-semibold ${properties['white-list'] === 'true' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {properties['white-list'] === 'true' ? 'Attiva (Chiuso)' : 'Disattivata (Aperto a tutti)'}
                  </span>
                </div>
              </div>

              {/* Add player form */}
              {isManagerOrOwner && (
                <form onSubmit={handleAddPlayer} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Nome utente Minecraft esatto (es. Notch, Alex)..."
                    disabled={isWhitelistLoading}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isWhitelistLoading || !newPlayerName.trim()}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto"
                  >
                    {isWhitelistLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 shrink-0" />
                    )}
                    <span>Aggiungi Giocatore</span>
                  </button>
                </form>
              )}

              {/* Whitelist list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {whitelist.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                    Nessun giocatore registrato nella whitelist.
                  </div>
                ) : (
                  whitelist.map((player) => (
                    <div
                      key={player.uuid || player.name}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 group hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs uppercase shrink-0">
                          {player.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-zinc-200 truncate">{player.name}</div>
                          <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[180px]">{player.uuid}</div>
                        </div>
                      </div>

                      {isManagerOrOwner && (
                        <button
                          onClick={() => handleRemovePlayer(player.name)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-80 group-hover:opacity-100 shrink-0"
                          title="Rimuovi dalla whitelist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MOD & FILE */}
        {activeTab === 'files' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {isOperator && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-amber-300">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-100">Upload e Modifiche File Bloccate</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Il caricamento di file e modpack è riservato ai ruoli Manager e Proprietario per garantire l'integrità del server.
                  </p>
                </div>
              </div>
            )}

            {/* Backups & Downloads */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-sm text-white">Esportazione & Backup Istantanei</h3>
                  <p className="text-xs text-zinc-400">Scarica archivi .zip completi del mondo o della cartella mod.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleExportWorld}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors border border-zinc-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Scarica Mondo (.zip)</span>
                </button>

                <button
                  onClick={handleExportMods}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors border border-zinc-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Scarica Cartella /mods (.zip)</span>
                </button>
              </div>
            </div>

            {/* Upload Section (Manager & Owner) */}
            {isManagerOrOwner && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5">
                <div>
                  <h3 className="font-bold text-sm text-white">Caricamento Mod & Modpack</h3>
                  <p className="text-xs text-zinc-400">
                    Carica file singoli <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">.jar</code> o interi archivi <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">.zip</code> che verranno estratti automaticamente.
                  </p>
                </div>

                <form onSubmit={handleUploadMods} className="space-y-4">
                  <div className="p-5 sm:p-8 bg-zinc-950/60 border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl text-center space-y-3 transition-colors">
                    <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Seleziona o trascina file .jar o .zip</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Compatibile con Fabric, Forge, NeoForge, Spigot</p>
                    </div>

                    <input
                      type="file"
                      multiple
                      accept=".jar,.zip"
                      onChange={(e) => setModFiles(Array.from(e.target.files || []))}
                      className="block w-full text-xs text-zinc-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-xl file:border-0
                        file:text-xs file:font-semibold
                        file:bg-zinc-800 file:text-zinc-200
                        hover:file:bg-zinc-700 cursor-pointer max-w-full sm:max-w-sm mx-auto"
                    />
                  </div>

                  {modFiles.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-300 font-medium">{modFiles.length} file pronti per il caricamento</span>
                      <button
                        type="submit"
                        disabled={isModUploading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                      >
                        {isModUploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span>Caricamento in corso...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 shrink-0" />
                            <span>Avvia Caricamento</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>

                {/* Upload Results */}
                {uploadResults.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-semibold text-zinc-400">Esito del caricamento:</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {uploadResults.map((r, i) => (
                        <div
                          key={i}
                          className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-mono text-zinc-300 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">{r.file}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            r.status === 'extracted' || r.status === 'uploaded'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONDIVISIONE & TEAM */}
        {activeTab === 'share' && server && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">Condivisione Server & Gestione Ruoli</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Invita amici e staff a collaborare sul server con autorizzazioni sicure.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-purple-950/20 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Invita Collaboratore</span>
                </button>
              </div>

              {/* Informative tier card */}
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Gerarchia dei Permessi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                      Ruolo: Manager
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Assegnato automaticamente agli utenti con piano <strong className="text-zinc-200">Contributor, Premium o Ultra</strong>. Permette modifica completa di server.properties, whitelist, caricamento file e comandi RCON.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-300">
                      <UserIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      Ruolo: Operatore
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Assegnato agli utenti con piano <strong className="text-zinc-200">Free</strong>. Consente di visualizzare lo stato in tempo reale, leggere i log della console e avviare o riavviare il server.
                    </p>
                  </div>
                </div>
              </div>

              {/* Collaborators Quick Access */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Membri del Server
                </h4>

                <div className="space-y-2">
                  {/* Owner row */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 uppercase text-xs shrink-0">
                        {server.owner?.username?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white flex items-center gap-2">
                          <span className="truncate">{server.owner?.username || 'Proprietario'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0">
                            Proprietario
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 truncate block">{server.owner?.email || 'Account primario'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Collaborators row preview */}
                  {server.collaborators && server.collaborators.length > 0 ? (
                    server.collaborators.map((c) => (
                      <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 uppercase text-xs shrink-0">
                            {c.user?.username?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-white flex items-center gap-2">
                              <span className="truncate">{c.user?.username || 'Collaboratore'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                c.role === 'MANAGER'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {c.role || 'OPERATOR'}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-500 truncate block">{c.user?.email}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                      Nessun collaboratore attivo. Clicca "Invita Collaboratore" per generare un link.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Share Modal Dialog */}
      {isShareModalOpen && server && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            loadServerData(); // reload on close to reflect any collaborator additions or removals
          }}
          serverId={server.id}
          serverName={server.name}
          isOwner={userRole === 'OWNER'}
        />
      )}
    </div>
  );
}

export default function ServerManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <ServerManagementContent />
    </Suspense>
  );
}
