import { createPublicClient, http, webSocket } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const rpcUrl = process.env.RPC_URL;

if (!rpcUrl) {
  throw new Error('Missing RPC_URL in environment');
}

// Use WebSocket transport if URL starts with ws:// or wss:// for real-time events.
// Fall back to HTTP polling otherwise.
const isWebSocket = rpcUrl.startsWith('ws://') || rpcUrl.startsWith('wss://');

const chain = rpcUrl.includes('sepolia') ? baseSepolia : base;

export const publicClient = createPublicClient({
  chain,
  transport: isWebSocket ? webSocket(rpcUrl) : http(rpcUrl),
  pollingInterval: 4_000,
});

console.log(`[client] Connected to ${chain.name} via ${isWebSocket ? 'WebSocket' : 'HTTP polling'}`);
