'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">⛏️</span>
            <span className="text-2xl font-bold text-green-500">OpenHostMC</span>
          </div>
          <div className="flex gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Vai alla Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                  Accedi
                </Link>
                <Link href="/register" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Registrati
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Hosting Minecraft Enterprise
              <span className="text-green-500">.</span>
            </h1>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Isolamento totale, prestazioni elevate e gestione semplificata per i tuoi server Minecraft.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" className="bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105">
                Entra nella Dashboard
              </Link>
              <Link href="/register" className="border border-zinc-700 hover:border-zinc-600 px-8 py-4 rounded-xl text-lg font-medium transition-colors">
                Prova Gratuita
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Caratteristiche Principali</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">Isolamento Totale</h3>
                <p className="text-zinc-400">Container Docker dedicati per ogni server, massima sicurezza e performance.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="text-5xl mb-4">⚙️</div>
                <h3 className="text-xl font-bold mb-2">Limiti RAM/CPU</h3>
                <p className="text-zinc-400">Controllo preciso sulle risorse, scegli il piano che fa per te.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="text-5xl mb-4">📟</div>
                <h3 className="text-xl font-bold mb-2">Console Web</h3>
                <p className="text-zinc-400">Accesso completo alla console e gestione da qualsiasi browser.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
          <p>© 2024 OpenHostMC. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}