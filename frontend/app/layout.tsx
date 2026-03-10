import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_URL ?? 'https://baseconfess.fun';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:       'BaseConfess – Anonymous On-Chain Confessions',
    description: 'Post anonymous confessions on Base. Vote, tip, and engage — all on-chain.',
    icons: {
      icon:  '/favicon.png',
      apple: '/icon.png',
    },
    openGraph: {
      title:       'BaseConfess',
      description: 'Anonymous on-chain confessions on Base network.',
      type:        'website',
      images:      [`${APP_URL}/og.png`],
    },
    other: {
      'base:app_id': '69b029e5e7933b90182b8cdd',
      'fc:miniapp': JSON.stringify({
        version:  'next',
        imageUrl: `${APP_URL}/og.png`,
        button: {
          title:  'Open BaseConfess',
          action: {
            type:                 'launch_miniapp',
            name:                 'BaseConfess',
            url:                  APP_URL,
            splashImageUrl:       `${APP_URL}/splash.png`,
            splashBackgroundColor: '#fdf2f8',
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
