'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Terminal,
  Users,
  ShieldCheck,
  Cpu,
  HardDrive,
  Zap,
  RotateCw,
  Layers,
  Globe,
  Activity,
  Check,
  ChevronDown,
  ArrowRight,
  Play,
  Share2,
  Sparkles,
  Lock,
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Come funziona l\'isolamento dei server tramite Docker?',
    a: 'Ogni istanza Minecraft creata su OpenHostMC viene eseguita in un container Docker dedicato e isolato. In questo modo le risorse (RAM e CPU cores) sono garantite al 100% senza interferenze da altri server, assicurando massima sicurezza e performance costanti.',
  },
  {
    q: 'Come funziona la condivisione del server con altri utenti?',
    a: 'Puoi generare link sicuri di condivisione con un clic. Gli utenti invitati che dispongono di un piano avanzato (Contributor, Premium, Ultra) ottengono il ruolo di Manager per modificare configurazioni e file. Gli utenti con piano Free ottengono il ruolo di Operatore, ideale per avviare e riavviare il server senza accedere a file critici.',
  },
  {
    q: 'Posso installare Mod, Plugin o interi Modpack?',
    a: 'Certamente! OpenHostMC supporta server Paper, Spigot, Fabric, Forge, NeoForge, Quilt e Bedrock. Puoi caricare singoli file .jar oppure archivi .zip di modpack che vengono estratti automaticamente nel percorso corretto.',
  },
  {
    q: 'Come posso monitorare la console dal browser?',
    a: 'La console web integrata sfrutta connessioni WebSocket bidirezionali ad altissima velocità e RCON nativo. Puoi visualizzare lo streaming dei log in tempo reale e inviare comandi (/op, /whitelist, /gamemode) con latenza impercettibile.',
  },
  {
    q: 'Che tipo di protezione DDoS viene applicata?',
    a: 'Tutti i nodi sono protetti da un layer Anycast DDoS enterprise con mitigazione fino a 10Gbps+ per attacchi Layer 4 e Layer 7 specializzati per il protocollo Minecraft, mantenendo il server stabile anche sotto attacco.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '0€',
    period: 'per sempre',
    description: 'Perfetto per giocare con amici intimi e testare configurazioni.',
    specs: {
      servers: 'Fino a 2 server',
      running: '1 server attivo contemporaneo',
      ram: '2 GB RAM dedicata',
      cpu: '1.0 Core CPU',
      storage: '5 GB NVMe SSD',
      collaborators: 'Ruolo Operatore su server condivisi',
    },
    popular: false,
    cta: 'Inizia Gratis',
  },
  {
    name: 'Contributor',
    price: '4.99€',
    period: '/mese',
    description: 'Ideale per community in crescita con server moddati leggeri.',
    specs: {
      servers: 'Fino a 5 server',
      running: '2 server attivi contemporanei',
      ram: '4 GB RAM dedicata',
      cpu: '2.0 Core CPU',
      storage: '15 GB NVMe SSD',
      collaborators: 'Ruolo Manager (Modifica server condivisi)',
    },
    popular: false,
    cta: 'Scegli Contributor',
  },
  {
    name: 'Premium',
    price: '9.99€',
    period: '/mese',
    description: 'La soluzione preferita per modpack pesanti, SMP e server pubblici.',
    specs: {
      servers: 'Fino a 10 server',
      running: '4 server attivi contemporanei',
      ram: '8 GB RAM dedicata',
      cpu: '4.0 Core CPU',
      storage: '30 GB NVMe SSD',
      collaborators: 'Ruolo Manager illimitato & RCON priority',
    },
    popular: true,
    cta: 'Attiva Premium',
  },
  {
    name: 'Ultra',
    price: '19.99€',
    period: '/mese',
    description: 'Potenza estrema per network complessi, minigames e comunità numerose.',
    specs: {
      servers: 'Fino a 20 server',
      running: '10 server attivi contemporanei',
      ram: '16 GB RAM dedicata',
      cpu: '8.0 Core CPU',
      storage: '60 GB NVMe SSD',
      collaborators: 'Manager & Accesso API dedicato',
    },
    popular: false,
    cta: 'Massima Potenza',
  },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              OpenHost<span className="text-emerald-400">MC</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Caratteristiche</a>
            <a href="#preview" className="hover:text-zinc-100 transition-colors">Pannello</a>
            <a href="#plans" className="hover:text-zinc-100 transition-colors">Piani & Prezzi</a>
            <a href="#faq" className="hover:text-zinc-100 transition-colors">FAQ</a>
            <Link href="/share" className="hover:text-zinc-100 transition-colors">Condivisione</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Accedi
                </Link>
                <Link
                  href="/register"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-900/20"
                >
                  Inizia Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Hosting Minecraft Cloud di Nuova Generazione
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            I tuoi server Minecraft, <br className="hidden sm:inline" />
            senza compromessi<span className="text-emerald-400">.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Isolamento in container Docker dedicati, RCON real-time a bassissima latenza, gestione file avanzata e condivisione collaborativa con ruoli Owner, Manager e Operatore.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href={isLoggedIn ? '/dashboard' : '/register'}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Crea il tuo Server Gratis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#preview"
              className="border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-200 px-8 py-3.5 rounded-xl font-medium text-base transition-colors"
            >
              Esplora il Pannello
            </a>
          </div>

          {/* Quick trust metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-16 border-t border-zinc-800/60 mt-16">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-emerald-400">99.98%</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Uptime Medio Garantito</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-white">&lt;12ms</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Latenza Nodo Europeo</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-white">Docker</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Isolamento Container 1:1</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-emerald-400">10 Gbps+</div>
              <div className="text-xs text-zinc-400 mt-1 font-medium">Mitigazione DDoS Anycast</div>
            </div>
          </div>
        </div>
      </section>

      {/* Panel Preview Mockup Section */}
      <section id="preview" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/30 border-y border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Un pannello di controllo pensato per i professionisti
            </h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto">
              Design dark moderno, metriche in tempo reale, gestione file integrata e controllo RCON istantaneo.
            </p>
          </div>

          {/* Panel Mockup Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Window title bar */}
            <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-zinc-500">openhostmc-panel :: server-management</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">WebSocket Connesso</span>
              </div>
            </div>

            {/* Inner Dashboard View */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Server Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">Survival Vanilla SMP</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">mc.openhostmc.net:25565 • Paper 1.21.4</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                    Riavvia
                  </button>
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Console
                  </button>
                  <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-purple-400" />
                    Condividi
                  </button>
                </div>
              </div>

              {/* Resource meters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      Utilizzo CPU
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">18.4%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '18.4%' }} />
                  </div>
                  <span className="text-[11px] text-zinc-500">2 Cores Allocati</span>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-zinc-500" />
                      Memoria RAM
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">2.4 / 4.0 GB</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '60%' }} />
                  </div>
                  <span className="text-[11px] text-zinc-500">Pool isolato JVM</span>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-500" />
                      Giocatori Attivi
                    </span>
                    <span className="font-mono text-white font-bold">14 / 30</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '46%' }} />
                  </div>
                  <span className="text-[11px] text-zinc-500">Whitelist Attiva (Enforced)</span>
                </div>
              </div>

              {/* Console preview snippet */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-1.5 text-zinc-300">
                <div className="text-zinc-500 text-[10px] pb-1 border-b border-zinc-800 uppercase tracking-wider font-semibold">
                  Ultimi log server.log (Live WebSocket)
                </div>
                <div className="text-zinc-400">[14:22:01 INFO]: Preparing start region for level 0</div>
                <div className="text-emerald-400">[14:22:04 INFO]: Time elapsed: 2420 ms - Server started on :25565</div>
                <div className="text-zinc-300">[14:22:15 INFO]: User "AlexDev" logged in with entity id 42 at (120, 68, -45)</div>
                <div className="text-blue-400">[14:22:18 INFO]: RCON connection accepted from collaborator: ModManager</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Tutto ciò di cui hai bisogno per il tuo server
            </h2>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto">
              Costruito con standard di ingegneria moderni per eliminare blocchi, crash e complessità.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Docker Dedicated Pool</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Niente container condivisi che soffrono per i vicini rumorosi. Limiti ferrei di RAM e core CPU dedicati esclusivamente al tuo mondo.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Condivisione con Ruoli</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Invita i tuoi amici e membri dello staff con link univoci. Assegna ruoli Manager (configurazione completa) o Operatore (avvio e riavvio) senza condividere password.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Console Web RCON Nativa</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Console interattiva integrata basata su xterm e WebSocket. Esegui comandi in frazioni di secondo e visualizza i log formattati con codici colore Minecraft.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Mod & Modpack Bulk Upload</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Supporto a Fabric, Forge, Paper, NeoForge e Bedrock. Carica file .jar o archivi .zip con decompressione automatica sul file system del container.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">DDoS Shield Enterprise</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Infrastruttura protetta 24/7 contro flood SYN/UDP, amplificazioni NTP/DNS e exploit mirati al protocollo di Minecraft.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Esportazione & Backup Rapido</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Scarica istantaneamente l'intero mondo di gioco in formato .zip o la cartella mod per conservare al sicuro i tuoi progressi in locale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hosting Plans Section */}
      <section id="plans" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/40 border-t border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Piani trasparenti per ogni esigenza
            </h2>
            <p className="text-zinc-400 text-base max-w-xl mx-auto">
              Inizia subito con il piano gratuito o potenzia la memoria per ospitare modpack esigenti e community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  plan.popular
                    ? 'bg-zinc-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40'
                    : 'bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Più Popolare
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="pt-2 pb-4 border-b border-zinc-800">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-zinc-400 ml-1.5">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{plan.specs.servers}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{plan.specs.running}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <strong className="text-white">{plan.specs.ram}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{plan.specs.cpu}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{plan.specs.storage}</span>
                    </li>
                    <li className="flex items-center gap-2 text-zinc-400">
                      <Users className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{plan.specs.collaborators}</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <Link
                    href={isLoggedIn ? '/dashboard' : '/register'}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center block transition-all ${
                      plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Domande Frequenti
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto">
              Hai dubbi sulle funzionalità o sul funzionamento di OpenHostMC? Ecco le risposte più comuni.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-zinc-100 hover:text-emerald-400 transition-colors"
                >
                  <span className="text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <span className="font-bold text-zinc-200">OpenHostMC</span>
            <span className="text-xs text-zinc-600">© 2026. Tutti i diritti riservati.</span>
          </div>

          <nav className="flex gap-6 text-xs text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Caratteristiche</a>
            <a href="#plans" className="hover:text-zinc-200 transition-colors">Piani</a>
            <a href="#faq" className="hover:text-zinc-200 transition-colors">FAQ</a>
            <Link href="/share" className="hover:text-zinc-200 transition-colors">Condividi Server</Link>
            <Link href="/login" className="hover:text-zinc-200 transition-colors">Accedi</Link>
            <Link href="/register" className="hover:text-zinc-200 transition-colors">Registrati</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}