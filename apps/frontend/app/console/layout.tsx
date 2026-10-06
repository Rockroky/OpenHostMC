import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Console Web RCON Live',
  description:
    'Console interattiva in tempo reale per monitorare i log ed eseguire comandi sul server Minecraft tramite RCON e WebSocket.',
  alternates: {
    canonical: 'https://openhostmc.com/console',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
