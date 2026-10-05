'use client';

import { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  UserX,
  Shield,
  ShieldAlert,
  Users,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface Collaborator {
  id: string;
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  role: 'MANAGER' | 'OPERATOR';
  planName?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
  isOwner: boolean;
}

export default function ShareModal({
  isOpen,
  onClose,
  serverId,
  serverName,
  isOwner,
}: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch active collaborators
  const fetchCollaborators = async () => {
    if (!serverId) return;
    setLoadingCollabs(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orchestrator/servers/${serverId}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators || []);
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    } finally {
      setLoadingCollabs(false);
    }
  };

  useEffect(() => {
    if (isOpen && serverId) {
      fetchCollaborators();
      setShareToken(null);
      setCopied(false);
      setActionError(null);
    }
  }, [isOpen, serverId]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orchestrator/servers/${serverId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.details || data.error || 'Errore nella generazione del link');
      }
      setShareToken(data.token);
    } catch (err: any) {
      setActionError(err.message || 'Impossibile creare il link di invito');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFullShareUrl = () => {
    if (!shareToken) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${shareToken}`;
    }
    return `/share/${shareToken}`;
  };

  const handleCopy = () => {
    const url = getFullShareUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRemoveCollaborator = async (targetUserId: string, username: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${username} dai collaboratori?`)) return;

    setRemovingId(targetUserId);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orchestrator/servers/${serverId}/collaborators/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Impossibile rimuovere il collaboratore');
      }
      setCollaborators((prev) => prev.filter((c) => c.userId !== targetUserId));
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Condividi Server</h3>
              <p className="text-xs text-zinc-400 truncate max-w-xs">{serverName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {actionError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Tier policy informative banner */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              Politica di Accesso & Ruoli
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Gli utenti con tier minimo (Contributor, Premium o Ultra) avranno accesso <strong className="text-zinc-200">Manager</strong> per modificare file e configurazioni. Gli utenti con piano Free avranno accesso <strong className="text-zinc-200">Operatore</strong> (solo avvio e riavvio rapido).
            </p>
          </div>

          {/* Invite Link Generator (Only for owner or superadmin) */}
          {isOwner ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Link di Invito Univoco
              </label>

              {!shareToken ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/30"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generazione link in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Genera Nuovo Link di Condivisione</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                    <input
                      type="text"
                      readOnly
                      value={getFullShareUrl()}
                      className="bg-transparent text-xs font-mono text-zinc-300 px-2 flex-1 outline-none select-all"
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copia Link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Il link è valido per 7 giorni. Condividilo con chi desideri invitare.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Solo il proprietario del server può generare nuovi link di invito.</span>
            </div>
          )}

          {/* Active Collaborators Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Collaboratori Attivi ({collaborators.length})
              </h4>
              <button
                onClick={fetchCollaborators}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                title="Ricarica lista"
              >
                <RefreshCw className={`w-3 h-3 ${loadingCollabs ? 'animate-spin' : ''}`} />
                Aggiorna
              </button>
            </div>

            {loadingCollabs ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-600" />
                Caricamento collaboratori...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-xs text-zinc-500 space-y-1">
                <p className="font-medium text-zinc-400">Nessun collaboratore aggiunto</p>
                <p>Genera e invia il link di invito per iniziare a gestire il server in team.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => {
                  const isManagerRole = collab.role === 'MANAGER';
                  return (
                    <div
                      key={collab.userId}
                      className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-200 uppercase shrink-0">
                          {collab.username?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-200 truncate">
                              {collab.username}
                            </span>
                            {isManagerRole ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20 text-[10px]">
                                Manager
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20 text-[10px]">
                                Operatore (Avvio/Riavvio)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate flex items-center gap-2">
                            <span>{collab.email}</span>
                            <span>•</span>
                            <span>{new Date(collab.createdAt).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleRemoveCollaborator(collab.userId, collab.username)}
                          disabled={removingId === collab.userId}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Rimuovi accesso"
                        >
                          {removingId === collab.userId ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
