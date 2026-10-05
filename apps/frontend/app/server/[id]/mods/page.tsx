'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Package,
  FileCode,
  Trash2,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { getToken, clearSession } from '../../../lib/auth';

interface ModFile {
  name: string;
  isDirectory: boolean;
  size: number;
  mtime: string;
}

const API_BASE = '/api/orchestrator';

export default function ModsPage({ params }: { params: { id: string } }) {
  const serverId = params.id;
  const [mods, setMods] = useState<ModFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMods();
  }, [serverId]);

  const fetchMods = async () => {
    try {
      const token = getToken();
      if (!token) {
        clearSession();
        window.location.href = `/login?redirect=${encodeURIComponent(`/server/${serverId}/mods`)}`;
        return;
      }
      const response = await fetch(`${API_BASE}/files/list/${serverId}?path=mods`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        clearSession();
        window.location.href = `/login?expired=true&redirect=${encodeURIComponent(`/server/${serverId}/mods`)}`;
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMods(Array.isArray(data) ? data.filter((f: any) => !f.isDirectory) : []);
      }
    } catch (err) {
      console.error('Error fetching mods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/files/mods/upload-bulk/${serverId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Errore durante l'upload dei file");

      await fetchMods();
      setSuccess('File caricati ed estratti con successo!');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadAll = () => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/files/mods/export/${serverId}?token=${token}`, '_blank');
  };

  const handleDeleteMod = async (modName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare ${modName}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/files/delete/${serverId}?path=mods/${encodeURIComponent(modName)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMods((prev) => prev.filter((m) => m.name !== modName));
      }
    } catch (err) {
      console.error('Error deleting mod:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href={`/server-management?serverId=${serverId}`}
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Gestione Server</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <h1 className="text-lg font-bold text-white">Mod & Modpack</h1>
          </div>
          <button
            onClick={handleDownloadAll}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 border border-zinc-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Scarica Tutto (.zip)</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-zinc-900 border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-10 text-center space-y-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Carica Mod o Modpack</h2>
            <p className="text-xs text-zinc-400 mt-1">Trascina qui i file .jar o .zip, oppure selezionali dal tuo computer</p>
          </div>
          <input
            type="file"
            multiple
            accept=".jar,.zip"
            onChange={handleFileUpload}
            className="hidden"
            id="mod-upload"
          />
          <div>
            <label
              htmlFor="mod-upload"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-md shadow-emerald-950/20"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Caricamento in corso...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Seleziona File (.jar, .zip)</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Mod List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Mod Installate ({mods.length})
            </h2>
            <button
              onClick={fetchMods}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Aggiorna</span>
            </button>
          </div>
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-600" />
              <p>Caricamento mod in corso...</p>
            </div>
          ) : mods.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 italic">
              Nessuna mod installata nella cartella /mods.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {mods.map((mod) => (
                <div
                  key={mod.name}
                  className="p-4 flex justify-between items-center hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{mod.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {(mod.size / (1024 * 1024)).toFixed(2)} MB • {new Date(mod.mtime).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMod(mod.name)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                    title="Elimina mod"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rimuovi</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
