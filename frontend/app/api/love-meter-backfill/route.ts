import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { LOVE_METER_CONTRACT_ADDRESS, getLoveMeterDeployBlock } from '@/lib/config';
import { supabaseServer } from '@/lib/supabaseServer';

const LOG_CHUNK_BLOCKS = BigInt(1999);

const loveTestedEvent = parseAbiItem(
  'event LoveTested(address indexed user, bytes32 indexed name1Hash, bytes32 indexed name2Hash, uint8 percent, uint256 paid)'
);

function rpcUrl() {
  return (
    process.env.LOVE_METER_RPC_URL ??
    process.env.NEXT_PUBLIC_LOVE_METER_RPC_URL ??
    process.env.BASE_RPC_URL ??
    'https://mainnet.base.org'
  );
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

    let from = deploy;
    let inserted = 0;
    const blockTs = new Map<bigint, number>();

    while (from <= latest) {
      const to = from + LOG_CHUNK_BLOCKS > latest ? latest : from + LOG_CHUNK_BLOCKS;
      const logs = await client.getLogs({
        address: LOVE_METER_CONTRACT_ADDRESS,
        event: loveTestedEvent,
        fromBlock: from,
        toBlock: to,
      });

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
      toBlock: latest.toString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'Backfill failed.', message: msg }, { status: 500 });
  }
}

