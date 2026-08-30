'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ShareAcceptPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverInfo, setServerInfo] = useState<{serverName: string, ownerName: string} | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`http://localhost:3005/servers/share/${token}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setServerInfo({
            serverName: data.serverName,
            ownerName: data.ownerName
          });
        }
      } catch (err) {
        setError('Errore di connessione al server');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    
    const jwt = localStorage.getItem('token');
    if (!jwt) {
      // Reindirizza al login con parametro di ritorno
      router.push(`/login?redirect=/share/${token}`);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3005/servers/share/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (data.error) {
        if (data.statusCode === 401 || data.error === 'Unauthorized') {
          // Token scaduto o non valido
          localStorage.removeItem('token');
          router.push(`/login?redirect=/share/${token}`);
        } else {
          setError(data.error);
        }
      } else {
        // Successo
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Errore di connessione al server');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-xl animate-pulse">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤝</div>
          <h1 className="text-2xl font-bold mb-2">Invito Server</h1>
          {error ? (
            <p className="text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </p>
          ) : serverInfo ? (
            <div>
              <p className="text-zinc-300 mb-4">
                Sei stato invitato a collaborare sul server:
              </p>
              <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 mb-6">
                <p className="font-bold text-xl text-green-400">{serverInfo.serverName}</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Proprietario: <span className="text-zinc-300">{serverInfo.ownerName}</span>
                </p>
              </div>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                {accepting ? 'Accettazione...' : 'Accetta Invito'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
