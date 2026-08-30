'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);

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
      
      console.log('Sending request to backend:', payload);

      const response = await fetch(`${API_BASE}/servers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend error data:', errorData);
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Success result:', result);
      
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
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              ← Torna alla Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Crea Nuovo Server</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 font-medium">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-zinc-100 mb-2">Nome del Server</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Es: Il mio server"
                maxLength={64}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="mc_version" className="block text-sm font-semibold text-zinc-100 mb-2">Versione Minecraft</label>
              <select
                id="mc_version"
                name="mc_version"
                value={formData.mc_version}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                <option value="1.8.9">1.8.9</option>
                <option value="1.12.2">1.12.2</option>
                <option value="1.16.5">1.16.5</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.21.4">1.21.4 (Consigliato)</option>
              </select>
            </div>

            <div>
              <label htmlFor="mc_type" className="block text-sm font-semibold text-zinc-100 mb-2">Tipo di Server</label>
              <select
                id="mc_type"
                name="mc_type"
                value={formData.mc_type}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                <option value="PAPER">Paper (Consigliato)</option>
                <option value="VANILLA">Vanilla</option>
                <option value="FORGE">Forge</option>
                <option value="FABRIC">Fabric</option>
                <option value="SPIGOT">Spigot</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="allocated_ram_mb" className="block text-sm font-semibold text-zinc-100 mb-2">RAM Assegnata (MB)</label>
                <input
                  type="number"
                  id="allocated_ram_mb"
                  name="allocated_ram_mb"
                  value={formData.allocated_ram_mb}
                  onChange={handleChange}
                  min={512}
                  step={512}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="allocated_cpu_cores" className="block text-sm font-semibold text-zinc-100 mb-2">CPU Cores</label>
                <input
                  type="number"
                  id="allocated_cpu_cores"
                  name="allocated_cpu_cores"
                  value={formData.allocated_cpu_cores}
                  onChange={handleChange}
                  min={0.5}
                  step={0.5}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <p className="text-sm text-zinc-300">
                <span className="font-semibold">Nota sulle Risorse:</span> Puoi distribuire liberamente la RAM e CPU totali del tuo piano tra i tuoi server.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/dashboard"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors text-center"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Creazione in corso...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
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
