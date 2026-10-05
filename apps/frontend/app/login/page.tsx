'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Server, AlertCircle, ArrowRight, Lock, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import { setSession } from '../lib/auth';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');
  const isLoggedOut = searchParams?.get('logout') === 'true';
  const isExpired = searchParams?.get('expired') === 'true';
  const isRegistered = searchParams?.get('registered') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orchestrator/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Credenziali non valide o utente non trovato');
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('Token di autenticazione non ricevuto dal server.');
      }

      // Salva sessione sincronizzata (localStorage + cookie a 7 giorni + evento globale)
      setSession(data.access_token, data.user);

      // Destinazione finale
      let target = '/dashboard';
      if (data.requiresSetup) {
        target = '/admin/setup';
      } else if (redirectUrl && redirectUrl.startsWith('/') && redirectUrl !== '/login') {
        target = redirectUrl;
      }

      // Reindirizzamento nativo per invalidare le cache di prefetch del router
      window.location.href = target;
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore durante l’accesso.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 w-full max-w-md relative overflow-hidden">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-inner">
            <Server className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OpenHostMC</h1>
          <p className="text-xs text-zinc-400">Accedi al pannello di controllo Minecraft</p>
        </div>

        {isRegistered && !error && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Registrazione completata con successo! Inserisci i tuoi dati per accedere.</span>
          </div>
        )}

        {isLoggedOut && !error && (
          <div className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Disconnessione effettuata con successo.</span>
          </div>
        )}

        {isExpired && !error && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>La tua sessione è scaduta. Accedi nuovamente per continuare.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="nome@openhostmc.it"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Autenticazione...</span>
              </>
            ) : (
              <>
                <span>Accedi</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          Non hai ancora un account?{' '}
          <Link
            href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
            className="text-emerald-400 hover:underline font-semibold"
          >
            Registrati gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}