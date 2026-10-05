import type { Metadata } from 'next';
import Link from 'next/link';
import { Server, Users, KeyRound, Terminal, ShieldCheck, ArrowRight } from 'lucide-react';
import ShareTokenForm from './ShareTokenForm';

export const metadata: Metadata = {
  title: 'Condivisione Server Minecraft e Collaborazione Multi-utente | OpenHostMC',
  description:
    'Collabora alla gestione dei server Minecraft in team con permessi granulari su OpenHostMC. Condividi l\'accesso alla console web e ai file di configurazione in sicurezza.',
  alternates: {
    canonical: 'https://openhostmc.com/share',
  },
  openGraph: {
    title: 'Condivisione Server Minecraft - OpenHostMC',
    description:
      'Gestisci server Minecraft con il tuo team: assegna permessi sicuri, monitora la console e collabora in tempo reale.',
    url: 'https://openhostmc.com/share',
  },
};

export default function ShareOverviewPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 text-zinc-100 hover:text-emerald-400 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">OpenHostMC</span>
          </Link>
          <nav aria-label="Navigazione principale" className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Registrati
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Users className="w-3.5 h-3.5" />
            Gestione Collaborativa
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Gestisci Server Minecraft <span className="text-emerald-400">Insieme al Tuo Team</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Hai ricevuto un link di invito per gestire un server Minecraft ospitato su OpenHostMC? Inserisci il token o l'URL completo per accettarlo con il tuo account.
          </p>

          <ShareTokenForm />
        </section>

        {/* Feature Articles */}
        <section aria-labelledby="features-heading" className="py-16 px-4 sm:px-6 lg:px-8 bg-zinc-900/40 border-t border-zinc-800">
          <div className="max-w-6xl mx-auto">
            <h2 id="features-heading" className="text-2xl sm:text-3xl font-bold text-center mb-12 text-zinc-100">
              Come Funziona la Collaborazione
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-100">Permessi Granulari per Ruoli</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Definisci chi può riavviare il server, modificare i file di configurazione, installare plugin o visualizzare solo lo stato live.
                </p>
              </article>
              <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-100">Console RCON in Tempo Reale</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Accedi simultaneamente alla console con gli altri membri dello staff per eseguire comandi e monitorare i log live via WebSocket.
                </p>
              </article>
              <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-100">Massima Sicurezza</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Nessuna necessità di condividere password personali del server. Ogni collaboratore usa il proprio account protetto da crittografia.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4 sm:px-6 lg:px-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-500 text-sm">
          <p>© 2026 OpenHostMC Enterprise Cloud. Tutti i diritti riservati.</p>
          <nav aria-label="Navigazione footer" className="flex gap-6">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Accedi</Link>
            <Link href="/register" className="hover:text-zinc-300 transition-colors">Registrati</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
