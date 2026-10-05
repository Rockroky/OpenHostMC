import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crea un Account Gratuito',
  description:
    'Registrati gratuitamente su OpenHostMC e lancia il tuo server Minecraft in pochi secondi. Container Docker dedicati, supporto mod/plugin e gestione multi-utente.',
  alternates: {
    canonical: 'https://openhostmc.com/register',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
