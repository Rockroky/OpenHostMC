import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Gestione Server',
  description:
    'Gestisci tutti i tuoi server Minecraft da un unico pannello centralizzato. Monitora stato, memoria, CPU, giocatori connessi e condividi l\'accesso in tempo reale.',
  alternates: {
    canonical: 'https://openhostmc.com/dashboard',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
