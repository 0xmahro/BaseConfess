import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { LOVE_METER_CONTRACT_ADDRESS, getLoveMeterDeployBlock } from '@/lib/config';
import { supabaseServer } from '@/lib/supabaseServer';

const LOG_CHUNK_BLOCKS = BigInt(1999);
const LOG_MIN_CHUNK_BLOCKS = BigInt(80);
const LOG_RETRY_MAX = 2;

const loveTestedEvent = parseAbiItem(
  'event LoveTested(address indexed user, bytes32 indexed name1Hash, bytes32 indexed name2Hash, uint8 percent, uint256 paid)'
);

function rpcUrl() {
  return (
    process.env.LOVE_METER_RPC_URL ??
    process.env.NEXT_PUBLIC_LOVE_METER_RPC_URL ??
    'https://mainnet.base.org'
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLogsResilient(client: any, fromBlock: bigint, toBlock: bigint) {
  const out: any[] = [];
  const queue: { from: bigint; to: bigint; attempt: number }[] = [
    { from: fromBlock, to: toBlock, attempt: 0 },
  ];

  while (queue.length > 0) {
    const cur = queue.pop()!;
    if (cur.from > cur.to) continue;

    try {
      const logs = await client.getLogs({
        address: LOVE_METER_CONTRACT_ADDRESS,
        event: loveTestedEvent,
        fromBlock: cur.from,
        toBlock: cur.to,
      });
      out.push(...logs);
    } catch (e) {
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
      throw e;
    }
  }
  return out;
}

function requireSecret(req: Request) {
  const hdr = req.headers.get('x-leaderboard-secret') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const qp = new URL(req.url).searchParams.get('secret') ?? '';
  const got = (hdr || bearer || qp).trim();
  const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();
  if (!want || !got || got !== want) throw new Error('Unauthorized');
}

export async function POST(req: Request) {
  try {
    requireSecret(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = supabaseServer();
    const client = createPublicClient({ chain: base, transport: http(rpcUrl()) });
    const latest = await client.getBlockNumber();
    const deploy = getLoveMeterDeployBlock() ?? BigInt(0);

    const url = new URL(req.url);
    const maxBlocksRaw = url.searchParams.get('maxBlocks');
    const maxBlocks = maxBlocksRaw && /^\d+$/.test(maxBlocksRaw) ? BigInt(maxBlocksRaw) : null;
    const backfillTo = maxBlocks ? (deploy + maxBlocks < latest ? deploy + maxBlocks : latest) : latest;

    let from = deploy;
    let inserted = 0;
    const blockTs = new Map<bigint, number>();

    while (from <= backfillTo) {
      const to = from + LOG_CHUNK_BLOCKS > backfillTo ? backfillTo : from + LOG_CHUNK_BLOCKS;
      const logs = await getLogsResilient(client, from, to);

      for (const log of logs) {
        const txHash = log.transactionHash?.toLowerCase();
        const user = (log.args as any)?.user as string | undefined;
        const percent = Number((log.args as any)?.percent ?? 0);
        const blockNumber = log.blockNumber;
        if (!txHash || !user || blockNumber == null) continue;

        let ts = blockTs.get(blockNumber);
        if (ts == null) {
          const b = await client.getBlock({ blockNumber });
          ts = Number(b.timestamp);
          blockTs.set(blockNumber, ts);
        }

        const { error } = await sb.from('love_meter_tests').upsert(
          {
            tx_hash: txHash,
            wallet: user.toLowerCase(),
            percent,
            created_at: new Date(ts * 1000).toISOString(),
          },
          { onConflict: 'tx_hash' }
        );
        if (!error) inserted += 1;
      }

      from = to + BigInt(1);
    }

    return NextResponse.json({
      ok: true,
      inserted,
      fromBlock: deploy.toString(),
      toBlock: backfillTo.toString(),
      latest: latest.toString(),
      rpc: rpcUrl(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'Backfill failed.', message: msg }, { status: 500 });
  }
}

