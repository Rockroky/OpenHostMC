'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSetupPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('Qual è il nome del tuo primo animale domestico?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
    if (user.setup_completed) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Le password non corrispondono.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orchestrator/auth/complete-admin-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword, securityQuestion, securityAnswer }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Errore durante il setup.');
      }

      const data = await response.json();
      setRecoveryKey(data.recoveryKey);
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.setup_completed = true;
        localStorage.setItem('user', JSON.stringify(user));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (recoveryKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
        <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl border border-green-500/50 flex flex-col gap-6 w-full max-w-lg">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-green-500">Setup Completato! 🎉</h1>
            <p className="text-zinc-400">
              Il tuo account admin è ora sicuro. Qui sotto c'è la tua <strong className="text-white">Chiave di Recupero Univoca</strong>.
            </p>
          </div>
          
          <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 text-center">
            <code className="text-2xl font-mono text-green-400 tracking-wider select-all">
              {recoveryKey}
            </code>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-sm font-medium text-center">
            ⚠️ ATTENZIONE: Questa chiave non verrà mai più mostrata. Salvala ORA.
          </div>

          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-600 hover:bg-green-500 p-4 rounded-xl font-bold transition-all text-white shadow-lg shadow-green-900/20"
          >
            Ho salvato la chiave, vai alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col gap-6 w-full max-w-md">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-red-500">Azione Richiesta</h1>
          <p className="text-zinc-400 text-sm">
            Imposta una password sicura e una domanda di sicurezza.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Nuova Password</label>
            <input 
              type="password" 
              required 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Conferma Password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500" 
            />
          </div>

          <div className="space-y-1 mt-4 border-t border-zinc-800 pt-4">
            <label className="text-sm text-zinc-400 ml-1">Domanda di Sicurezza</label>
            <select 
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option>Qual è il nome del tuo primo animale domestico?</option>
              <option>In quale città sei nato?</option>
              <option>Qual è il nome da nubile di tua madre?</option>
              <option>Qual è la marca della tua prima auto?</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-400 ml-1">Risposta</label>
            <input 
              type="text" 
              required 
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-green-500" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 p-4 rounded-xl font-bold mt-4"
          >
            {loading ? 'Salvataggio...' : 'Completa Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
