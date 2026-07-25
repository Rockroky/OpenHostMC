'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/orchestrator/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Errore durante la registrazione');
      }

      router.push('/login?registered=true');
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
          <p className="text-zinc-400">Crea il tuo account gratuito</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Email</label>
            <input 
              type="email" 
              placeholder="latua@email.com" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Username</label>
            <input 
              type="text" 
              placeholder="Steve123" 
              required 
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Conferma Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
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
            ) : 'Registrati'}
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500">
          Hai già un account? <Link href="/login" className="text-green-500 hover:underline">Accedi</Link>
        </div>
      </div>
    </div>
  );
}
