'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface McServer {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  port: number | null;
  mc_version: string;
  mc_type: string;
  created_at: string;
  plan?: {
    ram_mb: number;
  };
}

const API_BASE = '/api/orchestrator';  // Usa il proxy di Next.js per evitare problemi CORS

export default function DashboardPage() {
  const [servers, setServers] = useState<McServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, []);

  // Carica la lista dei server dall'orchestrator
  const fetchServers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/servers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Errore nel caricamento dei server');
      const data = await response.json();
      setServers(data);
      setError(null);
    } catch (err: any) {
      console.error('Errore fetch:', err);
      setError('Backend non raggiungibile o sessione scaduta.');
    } finally {
      setLoading(false);
    }
  };

  const updateServerStatus = async (serverId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/status?serverId=${serverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/start/${serverId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      if (response.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'STARTING' } : s))
        );
        // Polling per aggiornare lo stato ogni 2 secondi
        const interval = setInterval(async () => {
          await updateServerStatus(serverId);
          const current = servers.find((s) => s.id === serverId);
          if (current?.status === 'RUNNING') clearInterval(interval);
        }, 2000);
        setTimeout(() => clearInterval(interval), 30000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error('Errore avvio:', err);
      setError(`Errore nell'avvio del server: ${err.message}`);
      await updateServerStatus(serverId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopServer = async (serverId: string) => {
    setActionLoading(serverId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/stop/${serverId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      if (response.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'STOPPING' } : s))
        );
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
      console.error('Errore stop:', err);
      setError(`Errore nello stop del server: ${err.message}`);
      await updateServerStatus(serverId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo server?')) return;
    
    setActionLoading(serverId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers/${serverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setServers((prev) => prev.filter((s) => s.id !== serverId));
        alert('Server eliminato con successo');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error('Errore eliminazione:', err);
      setError(`Errore nell'eliminazione del server: ${err.message}`);
    } finally {
      setActionLoading(null);
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
    if (selectedServers.length === 0) {
      alert('Seleziona almeno un server da eliminare');
      return;
    }
    
    if (!confirm(`Sei sicuro di voler eliminare ${selectedServers.length} server?`)) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers/bulk-delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serverIds: selectedServers }),
      });
      
      if (response.ok) {
        setServers((prev) => prev.filter((s) => !selectedServers.includes(s.id)));
        setSelectedServers([]);
        alert('Server eliminati con successo');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error('Errore eliminazione multipla:', err);
      setError(`Errore nell'eliminazione dei server: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    // Rimuovi token da localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Rimuovi cookie impostando max-age a 0
    document.cookie = 'token=; path=/; max-age=0';
    // Reindirizza al login
    router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; text: string; icon: string }> = {
      RUNNING: { color: 'bg-green-600', text: '🟢 Online', icon: '✅' },
      STARTING: { color: 'bg-yellow-600', text: '🟡 Avvio...', icon: '⏳' },
      STOPPING: { color: 'bg-orange-600', text: '🟠 Arresto...', icon: '⏸️' },
      STOPPED: { color: 'bg-zinc-600', text: '⚫ Offline', icon: '⭕' },
      CREATED: { color: 'bg-blue-600', text: '🔵 Creato', icon: '🆕' },
      ERROR: { color: 'bg-red-600', text: '🔴 Errore', icon: '❌' },
      CRASHED: { color: 'bg-red-800', text: '💥 Crash', icon: '⚠️' },
    };
    const c = config[status] || config.STOPPED;
    return (
      <span className={`${c.color} px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2`}>
        <span>{c.icon}</span>
        <span>{c.text}</span>
      </span>
    );
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Caricamento dei tuoi server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">I tuoi Server</h1>
              <p className="text-zinc-400 text-sm mt-1">Gestisci e monitora i tuoi server Minecraft</p>
            </div>
            <div className="flex gap-3">
              {user?.role === 'SUPERADMIN' && (
                <Link
                  href="/admin"
                  className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  👑 Admin
                </Link>
              )}
              <button
                onClick={fetchServers}
                className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔄 Aggiorna
              </button>
              <Link
                href="/server/new"
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ✨ Nuovo Server
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🚪 Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold">Errore</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-delete bar */}
      {selectedServers.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗑️</span>
              <span className="font-semibold">
                {selectedServers.length} server selezionati
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedServers([])}
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isDeleting ? '⏳ Eliminazione...' : '🗑️ Elimina Selezionati'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {servers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Nessun server ancora</h3>
            <p className="text-zinc-400 mb-4">Crea il tuo primo server Minecraft per iniziare</p>
            <Link
              href="/server/new"
              className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-medium inline-block transition-colors"
            >
              Crea Server
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {servers.map((server) => (
              <div key={server.id} className="bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedServers.includes(server.id)}
                        onChange={() => toggleServerSelection(server.id)}
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <h2 className="text-2xl font-bold mb-1">{server.name}</h2>
                        <p className="text-zinc-400 text-sm">{server.name}</p>
                      </div>
                    </div>
                    {getStatusBadge(server.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                      <p className="text-zinc-400">Versione</p>
                      <p className="font-mono">{server.mc_version}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Tipo</p>
                      <p>{server.mc_type}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">RAM</p>
                      <p>{server.plan ? (server.plan.ram_mb / 1024).toFixed(1) : '—'} GB</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Porta</p>
                      <p className="font-mono">{server.port ? `:${server.port}` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStartServer(server.id)}
                      disabled={actionLoading === server.id || server.status === 'RUNNING' || server.status === 'STARTING'}
                      className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {actionLoading === server.id && server.status !== 'RUNNING' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          <span>Avvio...</span>
                        </span>
                      ) : (
                        '▶️ Avvia'
                      )}
                    </button>
                    <button
                      onClick={() => handleStopServer(server.id)}
                      disabled={actionLoading === server.id || server.status === 'STOPPED' || server.status === 'STOPPING' || server.status === 'CREATED'}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {actionLoading === server.id && server.status !== 'STOPPED' && server.status !== 'CREATED' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          <span>Arresto...</span>
                        </span>
                      ) : (
                        '⏹️ Ferma'
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteServer(server.id)}
                      disabled={actionLoading === server.id}
                      className="bg-red-800 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
                      title="Elimina server"
                    >
                      🗑️
                    </button>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/servers/${server.id}/console`}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-center py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        📟 Console
                      </Link>
                      <Link
                        href={`/dashboard/servers/${server.id}/management`}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-center py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        ⚙️ Gestisci
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Rimosso export default duplicato
