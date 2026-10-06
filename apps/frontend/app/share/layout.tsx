import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Condivisione Server & Inviti',
  description:
    'Inserisci il token o link di invito per unirti come collaboratore Manager o Operatore su un server Minecraft condiviso.',
  alternates: {
    canonical: 'https://openhostmc.com/share',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
