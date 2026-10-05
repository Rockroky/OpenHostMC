import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accedi al tuo Account',
  description:
    'Accedi al pannello di controllo OpenHostMC per gestire i tuoi server Minecraft, monitorare le risorse e accedere alla console RCON in tempo reale.',
  alternates: {
    canonical: 'https://openhostmc.com/login',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
