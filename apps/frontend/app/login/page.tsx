'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orchestrator/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Credenziali non valide');
      }

      const data = await response.json();
      
      // Salva token in localStorage per compatibilità e in cookie per il middleware
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Imposta cookie con max-age di 15 minuti (900 secondi) per auto-logout
      document.cookie = `token=${data.access_token}; path=/; max-age=900; SameSite=Lax`;

      // Reindirizza tutti gli utenti (incluso superadmin) a dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col gap-6 w-full max-w-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-green-500">OpenHostMC</h1>
          <p className="text-zinc-400">Accedi alla tua istanza Minecraft</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Email</label>
            <input 
              type="email" 
              placeholder="admin@openhostmc.it" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 p-4 rounded-xl font-bold transition-all mt-2 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'Accedi'}
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500">
          Non hai un account? <Link href="/register" className="text-green-500 hover:underline">Registrati</Link>
        </div>
      </div>
    </div>
  );
}