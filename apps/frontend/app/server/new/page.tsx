'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Server, AlertCircle, RefreshCw, Plus, ArrowLeft, Cpu, HardDrive } from 'lucide-react';
import { getUser, getToken, clearSession } from '../../lib/auth';

const API_BASE = '/api/orchestrator';  // Usa il proxy di Next.js per evitare problemi CORS

interface FormData {
  name: string;
  mc_version: string;
  mc_type: string;
  allocated_ram_mb: number;
  allocated_cpu_cores: number;
}

export default function CreateServerPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    mc_version: '1.21.4',
    mc_type: 'PAPER',
    allocated_ram_mb: 2048,
    allocated_cpu_cores: 1.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name.startsWith('allocated_') ? Number(value) : value 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started', formData);

    if (!formData.name.trim()) {
      setError('Il nome del server è obbligatorio');
      return;
    }

    const user = getUser();
    const token = getToken();
    
    if (!user || !token) {
      clearSession();
      window.location.href = '/login?redirect=/server/new';
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        mc_version: formData.mc_version,
        mc_type: formData.mc_type,
        allocated_ram_mb: formData.allocated_ram_mb,
        allocated_cpu_cores: formData.allocated_cpu_cores,
        owner_id: user.id,
        plan_id: user.planId || user.plan_id,
      };

      const response = await fetch(`${API_BASE}/servers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        clearSession();
        window.location.href = '/login?expired=true&redirect=/server/new';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.details || result.error);
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Torna alla Dashboard</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <h1 className="text-lg font-bold text-white">Crea Nuovo Server</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-xs font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Nome del Server
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Es. Survival Friends SMP"
                maxLength={64}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="mc_version" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Versione Minecraft
              </label>
              <select
                id="mc_version"
                name="mc_version"
                value={formData.mc_version}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                disabled={loading}
              >
                <option value="1.21.4">1.21.4 (Più Recente & Consigliato)</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.16.5">1.16.5</option>
                <option value="1.12.2">1.12.2</option>
                <option value="1.8.9">1.8.9</option>
              </select>
            </div>

            <div>
              <label htmlFor="mc_type" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Piattaforma Server
              </label>
              <select
                id="mc_type"
                name="mc_type"
                value={formData.mc_type}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                disabled={loading}
              >
                <option value="PAPER">Paper (Alte prestazioni, Consigliato)</option>
                <option value="VANILLA">Vanilla (Ufficiale Mojang)</option>
                <option value="FORGE">Forge (Supporto Mod)</option>
                <option value="FABRIC">Fabric (Modding Moderno)</option>
                <option value="SPIGOT">Spigot</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="allocated_ram_mb" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  RAM (MB)
                </label>
                <input
                  type="number"
                  id="allocated_ram_mb"
                  name="allocated_ram_mb"
                  value={formData.allocated_ram_mb}
                  onChange={handleChange}
                  min={512}
                  step={512}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="allocated_cpu_cores" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  CPU Cores
                </label>
                <input
                  type="number"
                  id="allocated_cpu_cores"
                  name="allocated_cpu_cores"
                  value={formData.allocated_cpu_cores}
                  onChange={handleChange}
                  min={0.5}
                  step={0.5}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-200 block">Distribuzione Risorse:</span>
              <p>Puoi suddividere la RAM e i core CPU complessivi del tuo piano tra i vari server creati.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl text-xs font-semibold transition-colors text-center text-zinc-300"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-4 py-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Crea Server</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
