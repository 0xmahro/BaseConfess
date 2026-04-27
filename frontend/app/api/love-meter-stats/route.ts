import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { LOVE_METER_CONTRACT_ADDRESS, getLoveMeterDeployBlock } from '@/lib/config';

export const dynamic = 'force-dynamic';

const LOG_CHUNK_BLOCKS = BigInt(1999);
const LOG_MIN_CHUNK_BLOCKS = BigInt(80);
const LOG_RETRY_MAX = 2;
const BLOCKS_24H_APPROX = BigInt(45000);

const loveTestedEvent = parseAbiItem(
  'event LoveTested(address indexed user, bytes32 indexed name1Hash, bytes32 indexed name2Hash, uint8 percent, uint256 paid)'
);

function rpcUrl() {
  // Keep Love Meter stats independent from leaderboard RPC overrides.
  // Some providers used for leaderboard rebuild have very small eth_getLogs range limits.
  return (
    process.env.LOVE_METER_RPC_URL ??
    process.env.NEXT_PUBLIC_LOVE_METER_RPC_URL ??
    'https://mainnet.base.org'
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function countLogs(client: any, fromBlock: bigint, toBlock: bigint) {
  if (fromBlock > toBlock) return 0;
  let total = 0;
  const queue: { from: bigint; to: bigint; attempt: number }[] = [
    { from: fromBlock, to: toBlock, attempt: 0 },
  ];

  while (queue.length > 0) {
    const cur = queue.pop()!;
    if (cur.from > cur.to) continue;

    try {
      const boundedTo =
        cur.from + LOG_CHUNK_BLOCKS > cur.to ? cur.to : cur.from + LOG_CHUNK_BLOCKS;
      const logs = await client.getLogs({
        address: LOVE_METER_CONTRACT_ADDRESS,
        event: loveTestedEvent,
        fromBlock: cur.from,
        toBlock: boundedTo,
      });
      total += logs.length;
      if (boundedTo < cur.to) {
        queue.push({ from: boundedTo + BigInt(1), to: cur.to, attempt: 0 });
      }
    } catch {
      const span = cur.to - cur.from;
      if (span > LOG_MIN_CHUNK_BLOCKS) {
        const mid = cur.from + span / BigInt(2);
        queue.push({ from: mid + BigInt(1), to: cur.to, attempt: 0 });
        queue.push({ from: cur.from, to: mid, attempt: 0 });
        continue;
      }
      if (cur.attempt < LOG_RETRY_MAX) {
        await delay(250 * (cur.attempt + 1));
        queue.push({ ...cur, attempt: cur.attempt + 1 });
        continue;
      }
      throw new Error('getLogs failed at minimal range');
    }
  }

  return total;
}

export async function GET() {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl()),
    });

    const latest = await client.getBlockNumber();
    const deployBlock = getLoveMeterDeployBlock();
    const fromAll = deployBlock ?? BigInt(0);
    const from24hCandidate =
      latest >= BLOCKS_24H_APPROX ? latest - BLOCKS_24H_APPROX : BigInt(0);
    const from24h = deployBlock && deployBlock > from24hCandidate ? deployBlock : from24hCandidate;

    const [total, last24h] = await Promise.all([
      countLogs(client, fromAll, latest),
      countLogs(client, from24h, latest),
    ]);

    return NextResponse.json({
      ok: true,
      total,
      last24h,
      latestBlock: latest.toString(),
      fromAll: fromAll.toString(),
      from24h: from24h.toString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

