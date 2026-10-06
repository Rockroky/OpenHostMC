'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  Star,
} from 'lucide-react';
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  AnimatedCounter,
} from './components/ui/animations';

interface FaqItem {
  q: string;
  a: string;
}

const TESTIMONIALS = [
  {
    name: 'Marco Rossi',
    role: 'Founder, CraftItalia SMP',
    avatar: 'M',
    quote: 'La migrazione su OpenHostMC ha azzerato il lag. Il pannello Docker e la console via WebSocket ci consentono di gestire oltre 50 giocatori online contemporaneamente senza intoppi.',
    rating: 5,
    plan: 'Premium',
  },
  {
    name: 'Davide Esposito',
    role: 'Lead Modder, Pixelmon Italia',
    avatar: 'D',
    quote: 'Caricare modpack pesanti con decompressione automatica fa risparmiare ore di lavoro. La suddivisione trasparente dei ruoli Owner e Manager è impareggiabile.',
    rating: 5,
    plan: 'Ultra',
  },
  {
    name: 'Elena Bianchi',
    role: 'Community Host',
    avatar: 'E',
    quote: 'Ho iniziato con il piano gratuito per giocare con gli amici: in meno di 30 secondi il server era pronto. Interfaccia pulita, moderna e velocissima.',
    rating: 5,
    plan: 'Contributor',
  },
];

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

// Animated particle dots for hero background
const HeroParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Server className="w-5 h-5" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              OpenHost<span className="text-emerald-400">MC</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400" aria-label="Navigazione principale">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Caratteristiche</a>
            <a href="#preview" className="hover:text-zinc-100 transition-colors">Pannello</a>
            <a href="#plans" className="hover:text-zinc-100 transition-colors">Piani & Prezzi</a>
            <a href="#testimonials" className="hover:text-zinc-100 transition-colors">Recensioni</a>
            <a href="#faq" className="hover:text-zinc-100 transition-colors">FAQ</a>
            <Link href="/share" className="hover:text-zinc-100 transition-colors">Condivisione</Link>
          </nav>

          <motion.div
            className="hidden md:flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isLoggedIn ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Accedi
                </Link>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/register"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-900/20"
                  >
                    Inizia Gratis
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl overflow-hidden px-4 py-4 space-y-4"
            >
              <nav className="flex flex-col space-y-2 text-sm font-medium text-zinc-300" aria-label="Navigazione mobile">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  Caratteristiche
                </a>
                <a
                  href="#preview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  Pannello
                </a>
                <a
                  href="#plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  Piani & Prezzi
                </a>
                <a
                  href="#testimonials"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  Recensioni
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  FAQ
                </a>
                <Link
                  href="/share"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition-colors"
                >
                  Condivisione Server
                </Link>
              </nav>

              <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-center flex items-center justify-center gap-2"
                  >
                    <span>Vai alla Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-2 text-sm font-medium text-zinc-300 hover:text-white border border-zinc-800 rounded-lg bg-zinc-900/60 transition-colors"
                    >
                      Accedi
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-900/20"
                    >
                      Inizia Gratis
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Animated particles */}
        <HeroParticles />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Hosting Minecraft Cloud di Nuova Generazione
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
              I tuoi server Minecraft, <br className="hidden sm:inline" />
              senza compromessi<span className="text-emerald-400">.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Isolamento in container Docker dedicati, RCON real-time a bassissima latenza, gestione file avanzata e condivisione collaborativa con ruoli Owner, Manager e Operatore.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={isLoggedIn ? '/dashboard' : '/register'}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Crea il tuo Server Gratis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.a
                href="#preview"
                className="border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-200 px-8 py-3.5 rounded-xl font-medium text-base transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Esplora il Pannello
              </motion.a>
            </div>
          </FadeIn>

          {/* Quick trust metrics with animated counters */}
          <StaggerContainer
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-16 border-t border-zinc-800/60 mt-16"
            staggerDelay={0.1}
          >
            {[
              { value: '99.98%', label: 'Uptime Medio Garantito', color: 'text-emerald-400' },
              { value: '<12ms', label: 'Latenza Nodo Europeo', color: 'text-white' },
              { value: 'Docker', label: 'Isolamento Container 1:1', color: 'text-white' },
              { value: '10 Gbps+', label: 'Mitigazione DDoS Anycast', color: 'text-emerald-400' },
            ].map((metric, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60"
                  whileHover={{ borderColor: 'rgba(16,185,129,0.3)', scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`text-2xl font-extrabold ${metric.color}`}>{metric.value}</div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">{metric.label}</div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Panel Preview Mockup Section */}
      <section id="preview" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/30 border-y border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-8">
          <FadeIn className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Un pannello di controllo pensato per i professionisti
            </h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto">
              Design dark moderno, metriche in tempo reale, gestione file integrata e controllo RCON istantaneo.
            </p>
          </FadeIn>

          {/* Panel Mockup Card */}
          <FadeIn delay={0.15} direction="up">
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
                  <motion.span
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
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
                          <motion.span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
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
                  {[
                    { icon: Cpu, label: 'Utilizzo CPU', value: '18.4%', width: '18.4%', color: 'bg-emerald-500', sub: '2 Cores Allocati', valueColor: 'text-emerald-400' },
                    { icon: Zap, label: 'Memoria RAM', value: '2.4 / 4.0 GB', width: '60%', color: 'bg-emerald-500', sub: 'Pool isolato JVM', valueColor: 'text-emerald-400' },
                    { icon: Users, label: 'Giocatori Attivi', value: '14 / 30', width: '46%', color: 'bg-blue-500', sub: 'Whitelist Attiva (Enforced)', valueColor: 'text-white' },
                  ].map((meter, i) => (
                    <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <meter.icon className="w-3.5 h-3.5 text-zinc-500" />
                          {meter.label}
                        </span>
                        <span className={`font-mono font-bold ${meter.valueColor}`}>{meter.value}</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <motion.div
                          className={`${meter.color} h-full rounded-full`}
                          initial={{ width: '0%' }}
                          whileInView={{ width: meter.width }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500">{meter.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Console preview snippet */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-1.5 text-zinc-300">
                  <div className="text-zinc-500 text-[10px] pb-1 border-b border-zinc-800 uppercase tracking-wider font-semibold">
                    Ultimi log server.log (Live WebSocket)
                  </div>
                  {[
                    { text: '[14:22:01 INFO]: Preparing start region for level 0', color: 'text-zinc-400' },
                    { text: '[14:22:04 INFO]: Time elapsed: 2420 ms - Server started on :25565', color: 'text-emerald-400' },
                    { text: '[14:22:15 INFO]: User "AlexDev" logged in with entity id 42 at (120, 68, -45)', color: 'text-zinc-300' },
                    { text: '[14:22:18 INFO]: RCON connection accepted from collaborator: ModManager', color: 'text-blue-400' },
                  ].map((line, i) => (
                    <motion.div
                      key={i}
                      className={line.color}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                    >
                      {line.text}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Enterprise Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-16">
          <FadeIn className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Tutto ciò di cui hai bisogno per il tuo server
            </h2>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto">
              Costruito con standard di ingegneria moderni per eliminare blocchi, crash e complessità.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.08}>
            {[
              { icon: Cpu, color: 'emerald', title: 'Docker Dedicated Pool', desc: 'Niente container condivisi che soffrono per i vicini rumorosi. Limiti ferrei di RAM e core CPU dedicati esclusivamente al tuo mondo.' },
              { icon: Users, color: 'blue', title: 'Condivisione con Ruoli', desc: 'Invita i tuoi amici e membri dello staff con link univoci. Assegna ruoli Manager (configurazione completa) o Operatore (avvio e riavvio) senza condividere password.' },
              { icon: Terminal, color: 'purple', title: 'Console Web RCON Nativa', desc: 'Console interattiva integrata basata su xterm e WebSocket. Esegui comandi in frazioni di secondo e visualizza i log formattati con codici colore Minecraft.' },
              { icon: HardDrive, color: 'amber', title: 'Mod & Modpack Bulk Upload', desc: 'Supporto a Fabric, Forge, Paper, NeoForge e Bedrock. Carica file .jar o archivi .zip con decompressione automatica sul file system del container.' },
              { icon: ShieldCheck, color: 'red', title: 'DDoS Shield Enterprise', desc: 'Infrastruttura protetta 24/7 contro flood SYN/UDP, amplificazioni NTP/DNS e exploit mirati al protocollo di Minecraft.' },
              { icon: Activity, color: 'emerald', title: 'Esportazione & Backup Rapido', desc: 'Scarica istantaneamente l\'intero mondo di gioco in formato .zip o la cartella mod per conservare al sicuro i tuoi progressi in locale.' },
            ].map((feat, i) => {
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                red: 'bg-red-500/10 border-red-500/20 text-red-400',
              };
              return (
                <StaggerItem key={i}>
                  <motion.div
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 space-y-4 h-full"
                    whileHover={{ borderColor: 'rgba(63,63,70,0.8)', y: -3, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[feat.color]}`}>
                      <feat.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feat.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{feat.desc}</p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Hosting Plans Section */}
      <section id="plans" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/40 border-t border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-16">
          <FadeIn className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Piani trasparenti per ogni esigenza
            </h2>
            <p className="text-zinc-400 text-base max-w-xl mx-auto">
              Inizia subito con il piano gratuito o potenzia la memoria per ospitare modpack esigenti e community.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
            {PLANS.map((plan) => (
              <StaggerItem key={plan.name}>
                <motion.div
                  className={`relative rounded-2xl p-6 flex flex-col justify-between transition-colors duration-200 h-full ${
                    plan.popular
                      ? 'bg-zinc-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40'
                      : 'bg-zinc-900/70 border border-zinc-800'
                  }`}
                  whileHover={{
                    scale: 1.025,
                    y: -4,
                    boxShadow: plan.popular
                      ? '0 20px 60px rgba(16,185,129,0.2)'
                      : '0 20px 60px rgba(0,0,0,0.4)',
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
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
                      {Object.values(plan.specs).map((spec, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {i < 5 ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          {i === 2 ? <strong className="text-white">{spec}</strong> : <span>{spec}</span>}
                        </li>
                      ))}
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
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/20 border-t border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-16">
          <FadeIn className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Cosa dicono i nostri utenti
            </h2>
            <p className="text-zinc-400 text-base max-w-xl mx-auto">
              Migliaia di giocatori e amministratori di server Minecraft si affidano a OpenHostMC ogni giorno.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.08}>
            {TESTIMONIALS.map((t, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 h-full"
                  whileHover={{ y: -3, borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating)].map((_, r) => (
                        <Star key={r} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{t.name}</div>
                        <div className="text-xs text-zinc-500">{t.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Piano {t.plan}
                    </span>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeIn className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Domande Frequenti
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto">
              Hai dubbi sulle funzionalità o sul funzionamento di OpenHostMC? Ecco le risposte più comuni.
            </p>
          </FadeIn>

          <StaggerContainer className="space-y-4" staggerDelay={0.06}>
            {FAQS.map((faq, idx) => (
              <StaggerItem key={idx}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-colors">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-zinc-100 hover:text-emerald-400 transition-colors"
                  >
                    <span className="text-base">{faq.q}</span>
                    <motion.div
                      animate={{ rotate: openFaq === idx ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ChevronDown
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          openFaq === idx ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
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

          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-400" aria-label="Navigazione footer">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Caratteristiche</a>
            <a href="#plans" className="hover:text-zinc-200 transition-colors">Piani</a>
            <a href="#testimonials" className="hover:text-zinc-200 transition-colors">Recensioni</a>
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