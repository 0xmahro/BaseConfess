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

function legacyContractAddress(): `0x${string}` | null {
  const raw = (process.env.LEGACY_CONFESSIONS_ADDRESS ?? '').trim();
  if (!raw) return null;
  // Minimal validation: 0x + 40 hex chars
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  return raw as `0x${string}`;
}

function requireSecret(req: Request) {
  const hdr =
    req.headers.get('x-leaderboard-secret') ??
    req.headers.get('x-leaderboard-token') ??
    '';

  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';

  const url = new URL(req.url);
  const qp = url.searchParams.get('secret') ?? '';

  const got = (hdr || bearer || qp).trim();
  const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();
  if (!want || !got || got !== want) throw new Error('Unauthorized');
}

type Acc = {
  user: string;
  confessionCount: number;
  likes: number;
  tipsWei: string; // bigint as string for JSON
  score: number;
};

function mergeAcc(into: Map<string, Acc>, add: Acc) {
  const key = add.user.toLowerCase();
  const cur = into.get(key);
  if (!cur) {
    into.set(key, { ...add, user: key });
    return;
  }
  cur.confessionCount += add.confessionCount;
  cur.likes += add.likes;
  cur.tipsWei = (BigInt(cur.tipsWei) + BigInt(add.tipsWei)).toString();
  cur.score += add.score;
}

async function scanContract(opts: {
  // PublicClient typing varies by chain (e.g. deposit txs on Base). Keep this helper generic.
  client: any;
  address: `0x${string}`;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const { client, address, fromBlock, toBlock } = opts;

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
  const lastVote = new Map<string, number>(); // `${contract}:${confessionId}:${voter}` -> -1|1

  let from = fromBlock;
  while (from <= toBlock) {
    const to = from + LOG_CHUNK_BLOCKS > toBlock ? toBlock : from + LOG_CHUNK_BLOCKS;

    const [postedLogs, votedLogs, tippedLogs] = await Promise.all([
      client.getLogs({ address, event: evPosted, fromBlock: from, toBlock: to }),
      client.getLogs({ address, event: evVoted, fromBlock: from, toBlock: to }),
      client.getLogs({ address, event: evTipped, fromBlock: from, toBlock: to }),
    ]);

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
      if (owner === voter) continue;

      const k = `${address}:${confessionId.toString()}:${voter}`;
      const prev = lastVote.get(k);
      lastVote.set(k, vote);

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

  return acc;
}

export async function POST(req: Request) {
  try {
    requireSecret(req);
  } catch {
    const hdr =
      req.headers.get('x-leaderboard-secret') ??
      req.headers.get('x-leaderboard-token') ??
      '';
    const auth = req.headers.get('authorization') ?? '';
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
    const url = new URL(req.url);
    const qp = url.searchParams.get('secret') ?? '';

    const got = (hdr || bearer || qp).trim();
    const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();

    return NextResponse.json(
      {
        error: 'Unauthorized',
        debug: {
          secretConfigured: Boolean(want),
          configuredLength: want.length,
          providedLength: got.length,
        },
      },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const timeframe = parseTimeframe(url.searchParams.get('timeframe'));

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl()),
  });

  const latest = await client.getBlockNumber();
  const deployFloorEnv = process.env.CONFESSIONS_DEPLOY_BLOCK;
  const deployFloor =
    deployFloorEnv && /^\d+$/.test(deployFloorEnv) ? BigInt(deployFloorEnv) : BigInt(0);

  const legacyAddr = legacyContractAddress();
  const legacyDeployEnv = process.env.LEGACY_CONFESSIONS_DEPLOY_BLOCK;
  const legacyDeploy =
    legacyDeployEnv && /^\d+$/.test(legacyDeployEnv) ? BigInt(legacyDeployEnv) : BigInt(0);

  let fromBlock = deployFloor;
  if (timeframe === 'daily') {
    fromBlock = latest >= BLOCKS_24H_APPROX ? latest - BLOCKS_24H_APPROX : BigInt(0);
  } else if (timeframe === 'weekly') {
    const blocks7d = BLOCKS_24H_APPROX * BigInt(7);
    fromBlock = latest >= blocks7d ? latest - blocks7d : BigInt(0);
  }
  if (fromBlock < deployFloor) fromBlock = deployFloor;

  const accAll = new Map<string, Acc>();

  // New contract scan
  const accNew = await scanContract({
    client,
    address: CONTRACT_ADDRESS,
    fromBlock,
    toBlock: latest,
  });
  for (const v of accNew.values()) mergeAcc(accAll, v);

  // Legacy contract scan (optional)
  let legacyFromBlock = fromBlock;
  if (legacyAddr) {
    if (legacyFromBlock < legacyDeploy) legacyFromBlock = legacyDeploy;
    const accLegacy = await scanContract({
      client,
      address: legacyAddr,
      fromBlock: legacyFromBlock,
      toBlock: latest,
    });
    for (const v of accLegacy.values()) mergeAcc(accAll, v);
  }

  const entries = Array.from(accAll.values())
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
    return NextResponse.json(
      {
        error: 'Failed to write cache.',
        supabase: {
          message: error.message,
          details: (error as any).details ?? null,
          hint: (error as any).hint ?? null,
          code: (error as any).code ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    timeframe,
    fromBlock: fromBlock.toString(),
    toBlock: latest.toString(),
    count: entries.length,
    legacyIncluded: Boolean(legacyAddr),
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';
  const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();
  const configured = Boolean(want);
  if (!debug) {
    return NextResponse.json({ ok: true, configured }, { status: 200 });
  }
  return NextResponse.json(
    {
      ok: true,
      configured,
      configuredLength: want.length,
      hasServiceRoleKey: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()),
      hasSupabaseUrl: Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()),
    },
    { status: 200 }
  );
}

