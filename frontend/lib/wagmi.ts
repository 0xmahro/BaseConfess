import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const rainbowConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, coinbaseWallet, injectedWallet, rainbowWallet],
    },
  ],
  {
    appName:   'BaseConfess',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'localdev',
  }
);

export const wagmiConfig = createConfig({
  connectors: [
    farcasterMiniApp(),
    ...rainbowConnectors,
  ],
  chains: [base, baseSepolia],
  transports: {
    [base.id]:        http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
