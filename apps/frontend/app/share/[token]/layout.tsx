import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accetta Invito Collaborazione Server',
  description:
    "Accetta l'invito di collaborazione per gestire un server Minecraft su OpenHostMC.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShareTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
