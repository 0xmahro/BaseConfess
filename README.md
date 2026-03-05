# BaseConfess – On-Chain Anonymous Confessions

Post anonymous confessions on Base. Vote, tip, and engage — all on-chain.

---

## Quick Start

### 1. Deploy the Smart Contract

Deploy `contracts/Confessions.sol` to **Base Mainnet** (or Base Sepolia for testing).

After deployment, update the contract address in **two places**:

| File | Variable |
|------|----------|
| `frontend/lib/config.ts` | `CONTRACT_ADDRESS` |
| `backend/config/contract.ts` | `CONTRACT_ADDRESS` |

---

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL editor and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** (for frontend) and **service role key** (for backend)

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Fill in the values in .env.local
npm install
npm run dev
```

**Environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   # https://cloud.walletconnect.com
```

---

### 4. Backend Event Listener Setup

```bash
cd backend
cp .env.example .env
# Fill in the values in .env
npm install
npm run dev
```

**Environment variables:**

```
RPC_URL=https://mainnet.base.org
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

---

## Architecture Overview

```
User
 │
 ├─ Writes confession text
 ├─ Frontend hashes text (keccak256)
 ├─ Sends tx: postConfession(hash) + 0.000025 ETH fee
 │
Smart Contract (Base)
 │
 ├─ Emits ConfessionPosted event
 ├─ Emits ConfessionVoted event
 ├─ Emits ConfessionTipped event
 │
Backend Event Listener (Node.js + viem)
 │
 └─ Writes to Supabase
       │
       └─ Frontend reads from Supabase (feed + votes + tips)
```

---

## Voting

- Like: `vote(confessionId, 1)`
- Dislike: `vote(confessionId, -1)`
- One wallet can overwrite their own vote
- Tracked on-chain + mirrored to Supabase by backend listener

## Tips

- Any ETH amount > 0
- Sent directly to the confession owner on-chain
- `tip(confessionId)` with ETH value
- Tracked in Supabase `tips` table

## Feed Algorithm

```
score = likes - dislikes + tips_received
```

Confessions are sorted by score (descending).
