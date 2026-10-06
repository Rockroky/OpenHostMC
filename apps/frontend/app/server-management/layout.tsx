import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestione Server & Configurazione',
  description:
    'Configura parametri di gioco, file server.properties, whitelist giocatori, caricamento mod e streaming console RCON in tempo reale.',
  alternates: {
    canonical: 'https://openhostmc.com/server-management',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServerManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
