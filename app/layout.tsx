import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

/* Self-hosted Poppins — elimina o @import via fonts.bunny.net (que adicionava
   um roundtrip extra render-blocking). next/font baixa no build, inline no
   CSS crítico, sem flash de fonte e sem CLS. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Modo Caverna Quiz',
  description:
    'Um protocolo simples, direto ao ponto, feito pra quem está cansado de se sabotar e quer resultados reais.',
};

export const viewport: Viewport = {
  themeColor: '#171717',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" translate="no" className={poppins.variable} suppressHydrationWarning>
      <head>
        {/* Logo da hero (LCP) — fetcha em paralelo com o HTML */}
        <link rel="preload" as="image" href="/lgtop.png" fetchPriority="high" />

        {/* Vídeo do hero — preload pra começar o download junto com o HTML
            em vez de esperar o React montar o <video> via dangerouslySetInnerHTML */}
        <link
          rel="preload"
          as="video"
          href="https://pub-f557a695ac5548528149455a91995189.r2.dev/-%20Main%20Tmeline_1_2.mp4"
          fetchPriority="high"
        />

        {/* Origens dos embeds das próximas etapas — preconnect aquece
            DNS+TCP+TLS antecipadamente, cortando ~200-500ms na hora que
            o usuário avança e o vídeo/script é injetado */}
        <link rel="dns-prefetch" href="https://pub-f557a695ac5548528149455a91995189.r2.dev" />
        <link rel="preconnect"   href="https://pub-f557a695ac5548528149455a91995189.r2.dev" />

        <link rel="dns-prefetch" href="https://desafio.modocaverna.com" />
        <link rel="preconnect"   href="https://desafio.modocaverna.com" />

        <link rel="dns-prefetch" href="https://scripts.converteai.net" />
        <link rel="preconnect"   href="https://scripts.converteai.net" />

        <link rel="dns-prefetch" href="https://images.converteai.net" />
        <link rel="preconnect"   href="https://images.converteai.net" />

        <link rel="dns-prefetch" href="https://payment.ticto.app" />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
