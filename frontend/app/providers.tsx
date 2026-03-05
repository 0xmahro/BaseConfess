'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import '@rainbow-me/rainbowkit/styles.css';
import { useState, useEffect } from 'react';

// Auto-connects the farcasterMiniApp connector when inside a mini app context.
function MiniAppAutoConnect() {
  const { isConnected }          = useAccount();
  const { connect, connectors }  = useConnect();

  useEffect(() => {
    sdk.context
      .then((ctx) => {
        if (ctx && !isConnected) {
          const miniAppConnector = connectors.find((c) => c.id === 'farcasterMiniApp');
          if (miniAppConnector) {
            connect({ connector: miniAppConnector });
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
