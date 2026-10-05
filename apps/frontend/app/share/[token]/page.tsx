'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Server,
  User,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { getUser, getToken, clearSession } from '../../lib/auth';

interface ServerInfo {
  serverName: string;
  ownerName: string;
  mcType?: string;
  mcVersion?: string;
  planName?: string;
}

export default function ShareAcceptPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setCurrentUser(u);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orchestrator/servers/share/${token}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || 'Invito non valido o scaduto');
        } else {
          setServerInfo({
            serverName: data.serverName,
            ownerName: data.ownerName,
            mcType: data.mcType,
            mcVersion: data.mcVersion,
            planName: data.planName,
          });
        }
      } catch (err: any) {
        setError('Impossibile contattare il server. Verifica la tua connessione.');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    const jwt = getToken();
    if (!jwt) {
      window.location.href = `/login?redirect=/share/${encodeURIComponent(token)}`;
      return;
    }

    try {
      const res = await fetch(`/api/orchestrator/servers/share/${token}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (res.status === 401 || data.statusCode === 401 || data.error === 'Unauthorized') {
          clearSession();
          window.location.href = `/login?expired=true&redirect=/share/${encodeURIComponent(token)}`;
          return;
        }
        setError(data.error || 'Impossibile accettare l\'invito');
      } else {
        window.location.href = `/server-management?serverId=${data.serverId}`;
      }
    } catch (err: any) {
      setError('Errore di comunicazione con il server');
    } finally {
      setAccepting(false);
    }
  };

  const isManager = currentUser?.role === 'SUPERADMIN' || currentUser?.plan?.can_edit_shared_servers;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-zinc-100 hover:text-emerald-400 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">OpenHostMC</span>
          </Link>
          {currentUser ? (
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>Accesso effettuato come <strong className="text-zinc-200">{currentUser.username}</strong></span>
              <Link href="/dashboard" className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-md border border-zinc-700 transition-colors">
                Dashboard
              </Link>
            </div>
          ) : (
            <Link
              href={`/login?redirect=/share/${encodeURIComponent(token)}`}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded-md transition-colors"
            >
              Accedi
            </Link>
          )}
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow top right */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {loading ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm text-zinc-400">Verifica dell'invito in corso...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-zinc-100">Invito non disponibile</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">{error}</p>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 border border-zinc-700 transition-colors"
                >
                  Torna alla Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : serverInfo ? (
            <div className="space-y-6">
              {/* Header Icon + Titles */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Invito Collaboratore
                </div>
                <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Unisciti alla gestione</h1>
                <p className="text-sm text-zinc-400">
                  Sei stato invitato a collaborare a un server Minecraft.
                </p>
              </div>

              {/* Server Details Card */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 border border-zinc-700">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-zinc-100">{serverInfo.serverName}</h2>
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Proprietario: <span className="text-zinc-300 font-medium">{serverInfo.ownerName}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-emerald-400 border border-zinc-700">
                    {serverInfo.mcType || 'PAPER'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-2 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                    <Layers className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Versione</div>
                      <div className="font-mono text-zinc-200">{serverInfo.mcVersion || '1.21.4'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                    <Cpu className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Hosting Tier</div>
                      <div className="text-zinc-200">{serverInfo.planName || 'Standard'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Assignment Notice */}
              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Ruolo che ti verrà assegnato:
                  </span>
                  {currentUser ? (
                    isManager ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                        Manager
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20 text-[11px]">
                        Operatore
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-500 italic">Accesso richiesto</span>
                  )}
                </div>

                <p className="text-zinc-400 leading-relaxed">
                  {currentUser ? (
                    isManager ? (
                      'Il tuo piano ti garantisce accesso Manager completo per configurare file, whitelist, proprietà e console.'
                    ) : (
                      'Con il piano Free avrai accesso Operatore (controllo stato, avvio e riavvio del server).'
                    )
                  ) : (
                    'Gli utenti con tier Plus/Pro ottengono permessi Manager. Gli account Free operano come Operatore (avvio/riavvio).'
                  )}
                </p>
              </div>

              {/* Action Button */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {accepting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Accettazione invito...</span>
                    </>
                  ) : (
                    <>
                      <span>Accetta Invito e Gestisci Server</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
                    Rifiuta o torna alla dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-4 px-6 text-center text-xs text-zinc-600">
        © 2026 OpenHostMC Enterprise Cloud. Gestione permessi granulari & container isolati.
      </footer>
    </div>
  );
}
