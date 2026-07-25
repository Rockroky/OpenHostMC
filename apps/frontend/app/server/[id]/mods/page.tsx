'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const router = useRouter();

  useEffect(() => {
    fetchMods();
  }, [serverId]);

  const fetchMods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/files/list/${serverId}?path=mods`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMods(data.filter((f: any) => !f.isDirectory));
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

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/files/mods/upload-bulk/${serverId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Errore durante l\'upload');

      const result = await response.json();
      console.log('Upload result:', result);
      
      await fetchMods();
      alert('Upload completato con successo!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownloadAll = () => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/files/mods/export/${serverId}?token=${token}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              ← Torna alla Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Gestione Mod & Modpack</h1>
          </div>
          <button 
            onClick={handleDownloadAll}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded font-bold transition-colors flex items-center gap-2"
          >
            📥 Scarica Tutto (.zip)
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload Area */}
        <div className="bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <div className="text-5xl">📦</div>
          <h2 className="text-xl font-bold">Carica Mod o Modpack</h2>
          <p className="text-zinc-400">Trascina qui i file .jar o .zip, oppure clicca per selezionarli</p>
          <input 
            type="file" 
            multiple 
            accept=".jar,.zip" 
            onChange={handleFileUpload}
            className="hidden" 
            id="mod-upload"
          />
          <label 
            htmlFor="mod-upload"
            className="inline-block bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-bold cursor-pointer transition-colors"
          >
            {uploading ? 'Caricamento...' : 'Seleziona File'}
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Mod List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Mod Installate ({mods.length})</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-zinc-500 italic">Caricamento...</div>
          ) : mods.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 italic">Nessuna mod installata.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {mods.map((mod) => (
                <div key={mod.name} className="p-4 flex justify-between items-center hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="font-bold">{mod.name}</div>
                      <div className="text-xs text-zinc-500">{(mod.size / (1024 * 1024)).toFixed(2)} MB • {new Date(mod.mtime).toLocaleString()}</div>
                    </div>
                  </div>
                  <button className="text-zinc-500 hover:text-red-500 transition-colors">
                    🗑️ Rimuovi
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
