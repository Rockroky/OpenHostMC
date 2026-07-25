'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  plan_id: string | null;
  plan?: {
    id: string;
    name: string;
  };
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  ram_mb: number;
}

interface Stats {
  totalUsers: number;
  totalServers: number;
  activeServers: number;
  totalRamUsedMb: number;
}

const API_BASE = '/api/orchestrator';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for auth and role
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'SUPERADMIN') {
      setError('Accesso negato. Questa pagina è riservata ai SuperAdmin.');
      setLoading(false);
      return;
    }

    setIsSuperAdmin(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      const [usersRes, plansRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers }),
        fetch(`${API_BASE}/admin/plans`, { headers }),
        fetch(`${API_BASE}/admin/stats`, { headers }),
      ]);

      if (!usersRes.ok || !plansRes.ok || !statsRes.ok) {
        throw new Error('Errore durante il recupero dei dati');
      }

      const usersData = await usersRes.json();
      const plansData = await plansRes.json();
      const statsData = await statsRes.json();

      setUsers(usersData.users);
      setPlans(plansData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Errore di connessione al backend');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (!response.ok) throw new Error('Errore durante l\'aggiornamento del piano');

      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_id: planId } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-xl font-bold">{error}</div>
        <button 
          onClick={() => router.push('/dashboard')}
          className="bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-lg transition-colors"
        >
          Torna alla Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-400">Gestione globale di OpenHostMC</p>
          </div>
          <button 
            onClick={fetchData}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold transition-colors"
          >
            Aggiorna Dati
          </button>
        </header>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Utenti Totali" value={stats.totalUsers} icon="👥" />
            <StatCard title="Server Totali" value={stats.totalServers} icon="🖥️" />
            <StatCard title="Server Attivi" value={stats.activeServers} icon="🟢" />
            <StatCard title="RAM Usata" value={`${(stats.totalRamUsedMb / 1024).toFixed(1)} GB`} icon="🧠" />
          </div>
        )}

        {/* Users Table */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold">Utenti Registrati</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/50 text-zinc-400 text-sm uppercase">
                  <th className="px-6 py-4 font-medium">Username / Email</th>
                  <th className="px-6 py-4 font-medium">Ruolo</th>
                  <th className="px-6 py-4 font-medium">Piano Attuale</th>
                  <th className="px-6 py-4 font-medium">Data Iscrizione</th>
                  <th className="px-6 py-4 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{user.username}</div>
                      <div className="text-sm text-zinc-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.role === 'SUPERADMIN' ? 'bg-purple-500/20 text-purple-400' :
                        user.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-700/50 text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.plan_id || ''} 
                        onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <option value="">Nessun Piano</option>
                        {plans.map(plan => (
                          <option key={plan.id} value={plan.id}>{plan.name} ({plan.ram_mb} MB)</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-zinc-500 hover:text-white transition-colors">
                        Dettagli
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex items-center gap-4">
      <div className="text-3xl bg-zinc-800 w-12 h-12 flex items-center justify-center rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-zinc-400 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
