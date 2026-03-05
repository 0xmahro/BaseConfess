import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title:       'BaseConfess – Anonymous On-Chain Confessions',
  description: 'Post anonymous confessions on Base. Vote, tip, and engage — all on-chain.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title:       'BaseConfess',
    description: 'Anonymous on-chain confessions on Base network.',
    type:        'website',
  },
};

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
