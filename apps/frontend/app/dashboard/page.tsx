'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Sliders,
  Terminal,
  Share2,
  Trash2,
  Plus,
  LogOut,
  ShieldCheck,
  Shield,
  User,
  AlertCircle,
  AlertTriangle,
  Cpu,
  Layers,
  Crown,
  Search,
  RefreshCw,
  Lock,
  HardDrive,
  Activity,
  X,
  Menu,
} from 'lucide-react';
import ShareModal from '../components/ShareModal';
import { clearSession, getToken, getUser } from '../lib/auth';
import { StaggerContainer, StaggerItem, SkeletonCard } from '../components/ui/animations';
import { toast } from '../components/ui/Toast';


interface McServer {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  port: number | null;
  mc_version: string;
  mc_type: string;
  created_at: string;
  allocated_ram_mb?: number;
  allocated_cpu_cores?: number;
  owner_id: string;
  owner?: {
    id: string;
    username: string;
    email?: string;
  };
  collaborators?: Array<{
    id: string;
    user_id: string;
    role?: 'MANAGER' | 'OPERATOR';
    user?: {
      id: string;
      username: string;
      email?: string;
      plan?: {
        name: string;
        can_edit_shared_servers?: boolean;
      };
    };
  }>;
  plan?: {
    name: string;
    ram_mb: number;
    cpu_cores: number;
  };
}

const API_BASE = '/api/orchestrator';

export default function DashboardPage() {
  const [servers, setServers] = useState<McServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'OWNED' | 'SHARED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Share Modal State
  const [shareServer, setShareServer] = useState<McServer | null>(null);

  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (!u || !t) {
      clearSession();
      window.location.href = '/login';
      return;
    }
    setUser(u);
  }, []);

  const fetchServers = async () => {
    try {
      const token = getToken();
      if (!token) {
        clearSession();
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_BASE}/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        clearSession();
        window.location.href = '/login?expired=true';
        return;
      }

      if (!response.ok) throw new Error('Errore nel caricamento dei server');
      const data = await response.json();
      setServers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('Errore fetch:', err);
      setError('Backend non raggiungibile o sessione scaduta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 8000);
    return () => clearInterval(interval);
  }, []);

  const updateServerStatus = async (serverId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/status?serverId=${serverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const { status } = await response.json();
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status } : s))
        );
      }
    } catch (err) {
      console.error('Errore update stato:', err);
    }
  };

  const handleStartServer = async (serverId: string) => {
    setActionLoading(serverId);
    setActionType('start');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/start/${serverId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'STARTING' } : s))
        );
        toast.info('Server in avvio...', 'Il server sta partendo, attendere qualche secondo.');
        const interval = setInterval(async () => {
          await updateServerStatus(serverId);
          const current = servers.find((s) => s.id === serverId);
          if (current?.status === 'RUNNING') clearInterval(interval);
        }, 2000);
        setTimeout(() => clearInterval(interval), 30000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      toast.error('Errore avvio', err.message);
      setError(`Errore nell'avvio del server: ${err.message}`);
      await updateServerStatus(serverId);
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  const handleRestartServer = async (serverId: string) => {
    setActionLoading(serverId);
    setActionType('restart');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/restart/${serverId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'STARTING' } : s))
        );
        toast.info('Riavvio in corso...', 'Il server si sta riavviando.');
        const interval = setInterval(async () => {
          await updateServerStatus(serverId);
          const current = servers.find((s) => s.id === serverId);
          if (current?.status === 'RUNNING') clearInterval(interval);
        }, 2000);
        setTimeout(() => clearInterval(interval), 35000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      toast.error('Errore riavvio', err.message);
      setError(`Errore nel riavvio del server: ${err.message}`);
      await updateServerStatus(serverId);
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  const handleStopServer = async (serverId: string) => {
    setActionLoading(serverId);
    setActionType('stop');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/stop/${serverId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'STOPPING' } : s))
        );
        toast.warning('Arresto in corso...', 'Il server si sta spegnendo.');
        const interval = setInterval(async () => {
          await updateServerStatus(serverId);
          const current = servers.find((s) => s.id === serverId);
          if (current?.status === 'STOPPED') clearInterval(interval);
        }, 2000);
        setTimeout(() => clearInterval(interval), 15000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      toast.error('Errore arresto', err.message);
      setError(`Errore nello stop del server: ${err.message}`);
      await updateServerStatus(serverId);
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Sei sicuro di voler eliminare permanentemente questo server?')) return;

    setActionLoading(serverId);
    setActionType('delete');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers/${serverId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setServers((prev) => prev.filter((s) => s.id !== serverId));
        toast.success('Server eliminato', 'Il server è stato eliminato correttamente.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      toast.error('Errore eliminazione', err.message);
      setError(`Errore nell'eliminazione del server: ${err.message}`);
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  const toggleServerSelection = (serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedServers.length === 0) return;
    if (!confirm(`Sei sicuro di voler eliminare ${selectedServers.length} server selezionati?`)) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serverIds: selectedServers }),
      });

      if (response.ok) {
        setServers((prev) => prev.filter((s) => !selectedServers.includes(s.id)));
        setSelectedServers([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      setError(`Errore nell'eliminazione: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login?logout=true';
  };

  // Determine role for a server
  const getUserRole = (server: McServer): 'OWNER' | 'MANAGER' | 'OPERATOR' => {
    if (!user) return 'OPERATOR';
    if (server.owner_id === user.id || user.role === 'SUPERADMIN') {
      return 'OWNER';
    }
    const collab = server.collaborators?.find(
      (c) => c.user_id === user.id || c.user?.id === user.id
    );
    if (collab) {
      if (collab.role === 'MANAGER' || collab.user?.plan?.can_edit_shared_servers) {
        return 'MANAGER';
      }
      return 'OPERATOR';
    }
    return 'OPERATOR';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        );
      case 'STARTING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            In Avvio...
          </span>
        );
      case 'STOPPING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />
            In Arresto...
          </span>
        );
      case 'STOPPED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Offline
          </span>
        );
      case 'CREATED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Creato
          </span>
        );
      case 'ERROR':
      case 'CRASHED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Crash / Errore
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            {status}
          </span>
        );
    }
  };

  const getRoleBadge = (role: 'OWNER' | 'MANAGER' | 'OPERATOR') => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Proprietario
          </span>
        );
      case 'MANAGER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Manager
          </span>
        );
      case 'OPERATOR':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            Operatore
          </span>
        );
    }
  };

  const filteredServers = servers.filter((s) => {
    const role = getUserRole(s);
    if (filter === 'OWNED' && role !== 'OWNER') return false;
    if (filter === 'SHARED' && role === 'OWNER') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.subdomain?.toLowerCase().includes(q) ||
        s.mc_version?.toLowerCase().includes(q) ||
        s.mc_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasOperatorServers = servers.some((s) => getUserRole(s) === 'OPERATOR');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block leading-none">
                  OpenHost<span className="text-emerald-400">MC</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Control Panel</span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-zinc-100 hover:text-emerald-400 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block leading-none">
                  OpenHost<span className="text-emerald-400">MC</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Control Panel</span>
              </div>
            </Link>
          </div>

          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            {user?.role === 'SUPERADMIN' && (
              <Link
                href="/admin"
                className="bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-700/50 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Panel</span>
              </Link>
            )}

            <button
              onClick={fetchServers}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700"
              title="Aggiorna lista"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Aggiorna</span>
            </button>

            <Link
              href="/server/new"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-950/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Server</span>
            </Link>

            <button
              onClick={handleLogout}
              className="bg-zinc-800/80 hover:bg-red-500/10 hover:text-red-400 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700/60"
              title="Disconnetti"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci</span>
            </button>
          </div>

          {/* Mobile action bar */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/server/new"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 rounded-lg border border-zinc-700/60"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-md px-4 py-3 space-y-2 overflow-hidden"
            >
              {user?.role === 'SUPERADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-purple-900/30 text-purple-300 border border-purple-700/50 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Pannello Superadmin</span>
                </Link>
              )}
              <button
                onClick={() => {
                  fetchServers();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left bg-zinc-800/80 text-zinc-300 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border border-zinc-700/50"
              >
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <span>Aggiorna Server</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left bg-zinc-800/80 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border border-zinc-700/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnetti ({user?.username || 'Account'})</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between text-xs text-red-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-sm font-bold ml-4 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Informative Operator Banner if user has operator role on servers */}
        {hasOperatorServers && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-200">
            <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-zinc-100 mb-0.5">
                Ruolo: Operatore attivo su alcuni server
              </strong>
              <span>
                I server contrassegnati con il badge Operatore ti consentono di visualizzare lo stato, avviare e riavviare l'istanza. Le impostazioni avanzate e i file richiedono il ruolo Manager (tier Contributor o superiore).
              </span>
            </div>
          </div>
        )}

        {/* Controls & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                filter === 'ALL'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tutti ({servers.length})
            </button>
            <button
              onClick={() => setFilter('OWNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                filter === 'OWNED'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              I miei server
            </button>
            <button
              onClick={() => setFilter('SHARED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                filter === 'SHARED'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Condivisi con me
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca server per nome, tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Multi-delete bulk toolbar */}
        {selectedServers.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs text-red-300 font-semibold">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>{selectedServers.length} server selezionati</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedServers([])}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Elimina Selezionati</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Server Cards Grid */}
        {filteredServers.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800 p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
              <Server className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-200">Nessun server trovato</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Nessun server corrisponde alla ricerca corrente.'
                  : filter === 'SHARED'
                  ? 'Nessun server è stato ancora condiviso con te.'
                  : 'Crea il tuo primo server o accetta un link di invito per iniziare.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/server/new"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Crea Server</span>
              </Link>
              <Link
                href="/share"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Accetta Invito
              </Link>
            </div>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" staggerDelay={0.06}>
            {filteredServers.map((server) => {
              const role = getUserRole(server);
              const isOwner = role === 'OWNER';
              const isOperator = role === 'OPERATOR';
              const isRunning = server.status === 'RUNNING';
              const isStarting = server.status === 'STARTING';
              const isStopping = server.status === 'STOPPING';
              const isStopped = server.status === 'STOPPED' || server.status === 'CREATED';
              const isBusy = actionLoading === server.id;

              const ramGb = server.allocated_ram_mb
                ? (server.allocated_ram_mb / 1024).toFixed(1)
                : server.plan?.ram_mb
                ? (server.plan.ram_mb / 1024).toFixed(1)
                : '2.0';

              const cpuCores = server.allocated_cpu_cores || server.plan?.cpu_cores || 1.0;

              return (
                <StaggerItem key={server.id} className="h-full">
                <motion.div
                  whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl transition-colors flex flex-col justify-between overflow-hidden shadow-lg shadow-black/20 h-full"
                >
                  <div className="p-4 sm:p-5 space-y-4 flex-1">
                    {/* Server Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {isOwner && (
                          <input
                            type="checkbox"
                            checked={selectedServers.includes(server.id)}
                            onChange={() => toggleServerSelection(server.id)}
                            className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-full">
                              {server.name}
                            </h2>
                            {getRoleBadge(role)}
                          </div>
                          <p className="text-xs text-zinc-400 font-mono truncate mt-0.5" title={`${server.subdomain || server.name}.openhostmc.net${server.port ? `:${server.port}` : ''}`}>
                            {server.subdomain || server.name}.openhostmc.net
                            {server.port ? `:${server.port}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">{getStatusBadge(server.status)}</div>
                    </div>

                    {/* Resources & Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-zinc-950/60 p-2 sm:p-2.5 rounded-xl border border-zinc-800/80 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
                          <Layers className="w-3 h-3 shrink-0" />
                          <span className="truncate">Versione</span>
                        </div>
                        <div className="font-mono text-zinc-200 mt-0.5 truncate text-xs font-medium" title={server.mc_version}>
                          {server.mc_version}
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 p-2 sm:p-2.5 rounded-xl border border-zinc-800/80 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
                          <Server className="w-3 h-3 shrink-0" />
                          <span className="truncate">Tipo</span>
                        </div>
                        <div className="font-semibold text-zinc-200 mt-0.5 truncate text-xs" title={server.mc_type}>
                          {server.mc_type}
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 p-2 sm:p-2.5 rounded-xl border border-zinc-800/80 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
                          <HardDrive className="w-3 h-3 shrink-0" />
                          <span className="truncate">RAM</span>
                        </div>
                        <div className="font-semibold text-emerald-400 mt-0.5 truncate text-xs">
                          {ramGb} GB
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 p-2 sm:p-2.5 rounded-xl border border-zinc-800/80 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
                          <Cpu className="w-3 h-3 shrink-0" />
                          <span className="truncate">CPU</span>
                        </div>
                        <div className="font-semibold text-blue-400 mt-0.5 truncate text-xs">
                          {cpuCores} Cores
                        </div>
                      </div>
                    </div>

                    {/* If collaborator, show owner info */}
                    {!isOwner && server.owner && (
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 bg-zinc-950/40 px-3 py-1.5 rounded-lg border border-zinc-800/50 min-w-0">
                        <Crown className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Proprietario del server: <strong className="text-zinc-200">{server.owner.username}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-zinc-950/70 border-t border-zinc-800/80 p-3 sm:p-3.5 space-y-2">
                    {/* Power Controls Row */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {/* Avvia Button */}
                      <button
                        onClick={() => handleStartServer(server.id)}
                        disabled={isBusy || isRunning || isStarting}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm min-w-0 ${
                          isRunning
                            ? 'bg-zinc-800/40 text-zinc-600 border border-zinc-800/40 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Avvia il server"
                      >
                        {isBusy && actionType === 'start' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        )}
                        <span className="truncate">Avvia</span>
                      </button>

                      {/* Riavvia Button */}
                      <button
                        onClick={() => handleRestartServer(server.id)}
                        disabled={isBusy || isStopped}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 min-w-0 ${
                          isRunning
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-blue-400 border-blue-500/30 hover:border-blue-500/50'
                            : 'bg-zinc-900/60 text-zinc-600 border-zinc-800/60 cursor-not-allowed'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Riavvia il server"
                      >
                        {isBusy && actionType === 'restart' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                        ) : (
                          <RotateCw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate">Riavvia</span>
                      </button>

                      {/* Arresta Button */}
                      <button
                        onClick={() => handleStopServer(server.id)}
                        disabled={isBusy || isStopped || isStopping}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 min-w-0 ${
                          isRunning
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-500/50'
                            : 'bg-zinc-900/60 text-zinc-600 border-zinc-800/60 cursor-not-allowed'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Arresta il server"
                      >
                        {isBusy && actionType === 'stop' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 fill-current text-red-400 shrink-0" />
                        )}
                        <span className="truncate">Arresta</span>
                      </button>
                    </div>

                    {/* Secondary Tools & Links Row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-zinc-800/60">
                      {/* Manage Link */}
                      <Link
                        href={`/server-management?serverId=${server.id}`}
                        className="flex-1 py-1.5 sm:py-2 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl text-xs font-semibold transition-colors border border-emerald-500/30 flex items-center justify-center gap-1.5 min-w-0"
                        title="Gestione avanzata e configurazione"
                      >
                        <Sliders className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Gestisci</span>
                      </Link>

                      {/* Console Link */}
                      <Link
                        href={`/console?serverId=${server.id}`}
                        className="flex-1 py-1.5 sm:py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors border border-zinc-700/60 flex items-center justify-center gap-1.5 min-w-0"
                        title="Apri Console RCON"
                      >
                        <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">Console</span>
                      </Link>

                      {/* Share Button (opens modal) */}
                      <button
                        onClick={() => setShareServer(server)}
                        className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-purple-500/20 hover:text-purple-300 rounded-xl text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/60 flex items-center justify-center shrink-0"
                        title="Condividi server"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* Delete button (Owner only) */}
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteServer(server.id)}
                          disabled={isBusy}
                          className="p-1.5 sm:p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20 flex items-center justify-center shrink-0 disabled:opacity-40"
                          title="Elimina server"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
        )}
      </main>

      {/* Share Modal Dialog */}
      {shareServer && (
        <ShareModal
          isOpen={!!shareServer}
          onClose={() => setShareServer(null)}
          serverId={shareServer.id}
          serverName={shareServer.name}
          isOwner={getUserRole(shareServer) === 'OWNER'}
        />
      )}
    </div>
  );
}
