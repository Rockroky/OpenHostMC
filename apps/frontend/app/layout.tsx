import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://openhostmc.com"),
  title: {
    default: "OpenHostMC - Hosting Minecraft Gratuito e ad Alte Prestazioni",
    template: "%s | OpenHostMC",
  },
  description:
    "Piattaforma di hosting server Minecraft moderno con container Docker dedicati, gestione collaborativa in tempo reale, supporto Paper, Spigot, Forge, Fabric e console RCON.",
  keywords: [
    "hosting minecraft",
    "server minecraft gratis",
    "hosting server minecraft italia",
    "paper mc hosting",
    "forge server hosting",
    "aternos alternativa",
    "hosting condiviso minecraft",
    "spigot hosting",
    "fabric server hosting",
    "purpur mc hosting",
    "minecraft rcon web console",
    "docker minecraft server",
    "free minecraft server hosting",
  ],
  authors: [{ name: "OpenHostMC Team", url: "https://openhostmc.com" }],
  creator: "OpenHostMC",
  publisher: "OpenHostMC",
  applicationName: "OpenHostMC",
  category: "Game Server Hosting",
  alternates: {
    canonical: "https://openhostmc.com",
    languages: {
      "it-IT": "https://openhostmc.com",
      "en-US": "https://openhostmc.com/en",
    },
  },
  openGraph: {
    title: "OpenHostMC - Hosting Minecraft Gratuito e ad Alte Prestazioni",
    description:
      "Piattaforma di hosting server Minecraft moderno con container Docker dedicati, gestione collaborativa in tempo reale, supporto Paper, Spigot, Forge, Fabric e console RCON.",
    url: "https://openhostmc.com",
    siteName: "OpenHostMC",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenHostMC - Hosting Minecraft Gratuito e ad Alte Prestazioni con Docker e Console Web",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenHostMC - Hosting Minecraft Gratuito e ad Alte Prestazioni",
    description:
      "Piattaforma di hosting server Minecraft moderno con container Docker dedicati, gestione collaborativa in tempo reale, supporto Paper, Spigot, Forge, Fabric e console RCON.",
    creator: "@OpenHostMC",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://openhostmc.com/#organization",
    name: "OpenHostMC",
    url: "https://openhostmc.com",
    logo: "https://openhostmc.com/logo.png",
    sameAs: ["https://github.com/OpenHostMC"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@openhostmc.com",
      availableLanguage: ["Italian", "English"],
    },
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://openhostmc.com/#website",
    url: "https://openhostmc.com",
    name: "OpenHostMC",
    description:
      "Piattaforma di hosting server Minecraft moderno con container Docker dedicati, gestione collaborativa in tempo reale, supporto Paper, Spigot, Forge, Fabric e console RCON.",
    publisher: {
      "@id": "https://openhostmc.com/#organization",
    },
    inLanguage: "it-IT",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://openhostmc.com/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://openhostmc.com/#software",
    name: "OpenHostMC Server Platform",
    applicationCategory: "GameApplication",
    operatingSystem: "All",
    description:
      "Piattaforma di hosting server Minecraft moderno con container Docker dedicati, gestione collaborativa in tempo reale, supporto Paper, Spigot, Forge, Fabric e console RCON.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Tier Gratuito con container Docker dedicati e console web",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "128",
    },
  };

  return (
    <html lang="it" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
