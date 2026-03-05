import 'dotenv/config';
import { publicClient }           from './lib/publicClient.js';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract.js';
import { handleConfessionPosted }  from './handlers/confessionPosted.js';
import { handleConfessionVoted }   from './handlers/confessionVoted.js';
import { handleConfessionTipped }  from './handlers/confessionTipped.js';

// Guard: warn if contract address hasn't been configured yet
if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
  console.warn(
    '\n⚠️  CONTRACT_ADDRESS is still the placeholder.\n' +
    '   Edit backend/config/contract.ts and set your deployed contract address.\n'
  );
}

console.log('[listener] Starting BaseConfess event listener...');
console.log(`[listener] Contract: ${CONTRACT_ADDRESS}`);

// ── ConfessionPosted ─────────────────────────────────────────────────────────
const unwatchPosted = publicClient.watchContractEvent({
  address:   CONTRACT_ADDRESS,
  abi:       CONTRACT_ABI,
  eventName: 'ConfessionPosted',
  onLogs: async (logs) => {
    for (const log of logs) {
      const { confessionId, user, confessionHash, timestamp } = log.args as {
        confessionId: bigint;
        user: `0x${string}`;
        confessionHash: `0x${string}`;
        timestamp: bigint;
      };
      await handleConfessionPosted({ confessionId, user, confessionHash, timestamp });
    }
  },
  onError: (error) => {
    console.error('[ConfessionPosted watcher] Error:', error.message);
  },
});

// ── ConfessionVoted ──────────────────────────────────────────────────────────
const unwatchVoted = publicClient.watchContractEvent({
  address:   CONTRACT_ADDRESS,
  abi:       CONTRACT_ABI,
  eventName: 'ConfessionVoted',
  onLogs: async (logs) => {
    for (const log of logs) {
      const { confessionId, voter, vote } = log.args as {
        confessionId: bigint;
        voter: `0x${string}`;
        vote: number;
      };
      await handleConfessionVoted({ confessionId, voter, vote });
    }
  },
  onError: (error) => {
    console.error('[ConfessionVoted watcher] Error:', error.message);
  },
});

// ── ConfessionTipped ─────────────────────────────────────────────────────────
const unwatchTipped = publicClient.watchContractEvent({
  address:   CONTRACT_ADDRESS,
  abi:       CONTRACT_ABI,
  eventName: 'ConfessionTipped',
  onLogs: async (logs) => {
    for (const log of logs) {
      const { confessionId, from, to, amount } = log.args as {
        confessionId: bigint;
        from: `0x${string}`;
        to: `0x${string}`;
        amount: bigint;
      };
      await handleConfessionTipped({ confessionId, from, to, amount });
    }
  },
  onError: (error) => {
    console.error('[ConfessionTipped watcher] Error:', error.message);
  },
});

console.log('[listener] Watching for ConfessionPosted, ConfessionVoted, ConfessionTipped events...');

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = () => {
  console.log('\n[listener] Shutting down...');
  unwatchPosted();
  unwatchVoted();
  unwatchTipped();
  process.exit(0);
};

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
