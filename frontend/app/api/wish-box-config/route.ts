import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';

export const dynamic = 'force-dynamic';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * Wish Box contract address is read at request time so production can use
 * Vercel env without relying only on client build-time inlining.
 * Set either WISH_BOX_ADDRESS (server) or NEXT_PUBLIC_WISH_BOX_ADDRESS.
 */
export async function GET() {
  const raw =
    process.env.WISH_BOX_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_WISH_BOX_ADDRESS?.trim() ||
    '';

  if (!raw || !isAddress(raw)) {
    return NextResponse.json({ address: null as string | null });
  }

  try {
    const normalized = getAddress(raw);
    if (normalized.toLowerCase() === ZERO) {
      return NextResponse.json({ address: null });
    }
    return NextResponse.json({ address: normalized });
  } catch {
    return NextResponse.json({ address: null });
  }
}
