'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import '@rainbow-me/rainbowkit/styles.css';
import { useState, useEffect } from 'react';

// Docs: "If a user already has a connected wallet the connector will
// automatically connect to it." For first-time / no-session cases we
// call connect() explicitly once the mini app context is confirmed.
function MiniAppAutoConnect() {
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (connectors.length === 0) return;

    sdk.context
      .then((ctx) => {
        if (!ctx) return; // not inside a mini app — skip

        // farcasterMiniApp() is first in wagmiConfig.connectors
        const miniAppConnector =
          connectors.find((c) => c.id === 'farcasterMiniApp') ?? connectors[0];

        connect({ connector: miniAppConnector });
      })
      .catch(() => {});
  // re-run only when the connectors list changes (practically once)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors.length]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:           '#ec4899',
            accentColorForeground: 'white',
            borderRadius:          'large',
            fontStack:             'system',
            overlayBlur:           'small',
          })}
          modalSize="compact"
        >
          <MiniAppAutoConnect />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
