import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { supabaseServer } from '@/lib/supabaseServer';
import { CONTRACT_ADDRESS } from '@/lib/config';

type Timeframe = 'daily' | 'weekly' | 'all';

const LOG_CHUNK_BLOCKS = BigInt(1999);
const BLOCKS_24H_APPROX = BigInt(45000);

const evPosted = parseAbiItem(
  'event ConfessionPosted(uint256 indexed confessionId, address indexed user, bytes32 confessionHash, uint256 timestamp)'
);
const evVoted = parseAbiItem(
  'event ConfessionVoted(uint256 indexed confessionId, address indexed voter, int8 vote)'
);
const evTipped = parseAbiItem(
  'event ConfessionTipped(uint256 indexed confessionId, address indexed from, address indexed to, uint256 amount)'
);

function parseTimeframe(v: string | null): Timeframe {
  if (v === 'daily' || v === 'weekly' || v === 'all') return v;
  return 'weekly';
}

function rpcUrl() {
  return process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
}

function requireSecret(req: Request) {
  const got = req.headers.get('x-leaderboard-secret') ?? '';
  const want = process.env.LEADERBOARD_REBUILD_SECRET ?? '';
  if (!want || got !== want) throw new Error('Unauthorized');
}

type Acc = {
  user: string;
  confessionCount: number;
  likes: number;
  tipsWei: string; // bigint as string for JSON
  score: number;
};

export async function POST(req: Request) {
  try {
    requireSecret(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const timeframe = parseTimeframe(url.searchParams.get('timeframe'));

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl()),
  });

  const latest = await client.getBlockNumber();
  const deployFloorEnv = process.env.CONFESSIONS_DEPLOY_BLOCK;
  const deployFloor = deployFloorEnv && /^\d+$/.test(deployFloorEnv) ? BigInt(deployFloorEnv) : BigInt(0);

  let fromBlock = deployFloor;
  if (timeframe === 'daily') {
    fromBlock = latest >= BLOCKS_24H_APPROX ? latest - BLOCKS_24H_APPROX : BigInt(0);
  } else if (timeframe === 'weekly') {
    const blocks7d = BLOCKS_24H_APPROX * BigInt(7);
    fromBlock = latest >= blocks7d ? latest - blocks7d : BigInt(0);
  }
  if (fromBlock < deployFloor) fromBlock = deployFloor;

  const blockTs = new Map<bigint, number>();
  const getBlockTs = async (bn: bigint) => {
    const cached = blockTs.get(bn);
    if (cached != null) return cached;
    const b = await client.getBlock({ blockNumber: bn });
    const ts = Number(b.timestamp);
    blockTs.set(bn, ts);
    return ts;
  };

  const acc = new Map<string, Acc>();
  const touch = (addr: string): Acc => {
    const a = addr.toLowerCase();
    const cur = acc.get(a);
    if (cur) return cur;
    const next: Acc = { user: a, confessionCount: 0, likes: 0, tipsWei: '0', score: 0 };
    acc.set(a, next);
    return next;
  };
  const addTips = (a: Acc, amount: bigint) => {
    const cur = BigInt(a.tipsWei);
    a.tipsWei = (cur + amount).toString();
  };

  const confessionOwner = new Map<bigint, string>(); // confessionId -> owner
  const lastVote = new Map<string, number>(); // `${confessionId}:${voter}` -> -1|1

  // Scan logs in chunks
  let from = fromBlock;
  while (from <= latest) {
    const to = from + LOG_CHUNK_BLOCKS > latest ? latest : from + LOG_CHUNK_BLOCKS;

    const [postedLogs, votedLogs, tippedLogs] = await Promise.all([
      client.getLogs({ address: CONTRACT_ADDRESS, event: evPosted, fromBlock: from, toBlock: to }),
      client.getLogs({ address: CONTRACT_ADDRESS, event: evVoted, fromBlock: from, toBlock: to }),
      client.getLogs({ address: CONTRACT_ADDRESS, event: evTipped, fromBlock: from, toBlock: to }),
    ]);

    // Warm timestamp cache for blocks we touched (only for potential future use / debugging).
    const blocks = new Set<bigint>();
    for (const l of postedLogs) blocks.add(l.blockNumber!);
    for (const l of votedLogs) blocks.add(l.blockNumber!);
    for (const l of tippedLogs) blocks.add(l.blockNumber!);
    await Promise.all(Array.from(blocks).map((bn) => getBlockTs(bn)));

    for (const l of postedLogs) {
      const args = l.args as any;
      const confessionId = args.confessionId as bigint;
      const owner = (args.user as string).toLowerCase();
      confessionOwner.set(confessionId, owner);
      const u = touch(owner);
      u.confessionCount += 1;
      u.score += 1;
    }
    for (const l of votedLogs) {
      const args = l.args as any;
      const confessionId = args.confessionId as bigint;
      const voter = (args.voter as string).toLowerCase();
      const vote = Number(args.vote);
      if (vote !== 1 && vote !== -1) continue;

      const owner = confessionOwner.get(confessionId);
      if (!owner) continue;
      if (owner === voter) continue; // ignore self votes for leaderboard

      const k = `${confessionId.toString()}:${voter}`;
      const prev = lastVote.get(k);
      lastVote.set(k, vote);

      // We only score likes (+3). Handle flips: +1->-1 removes like, -1->+1 adds like.
      if (prev === 1 && vote !== 1) {
        const u = touch(owner);
        u.likes = Math.max(0, u.likes - 1);
        u.score = Math.max(0, u.score - 3);
      } else if (prev !== 1 && vote === 1) {
        const u = touch(owner);
        u.likes += 1;
        u.score += 3;
      }
    }
    for (const l of tippedLogs) {
      const args = l.args as any;
      const toAddr = (args.to as string).toLowerCase();
      const amount = args.amount as bigint;
      const u = touch(toAddr);
      addTips(u, amount);
      u.score += 5;
    }

    from = to + BigInt(1);
  }

  const entries = Array.from(acc.values())
    .sort((a, b) => (b.score - a.score) || (b.confessionCount - a.confessionCount) || a.user.localeCompare(b.user))
    .map((e, idx) => ({
      rank: idx + 1,
      user: e.user,
      score: e.score,
      confessionCount: e.confessionCount,
      likes: e.likes,
      tipsWei: e.tipsWei,
      badge: idx + 1 <= 10 ? 'Elite Soul' : idx + 1 <= 100 ? 'Active Soul' : null,
    }));

  const sb = supabaseServer();
  const { error } = await sb
    .from('leaderboard_cache')
    .upsert(
      {
        timeframe,
        updated_at: new Date().toISOString(),
        entries,
        from_block: fromBlock.toString(),
        to_block: latest.toString(),
      } as any,
      { onConflict: 'timeframe' }
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to write cache.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    timeframe,
    fromBlock: fromBlock.toString(),
    toBlock: latest.toString(),
    count: entries.length,
  });
}

