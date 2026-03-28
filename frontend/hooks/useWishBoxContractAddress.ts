'use client';

import { useEffect, useState } from 'react';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

/** Resolves Wish Box contract address from /api/wish-box-config (same as Wish Box UI). */
export function useWishBoxContractAddress() {
  const [address, setAddress] = useState<`0x${string}` | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/wish-box-config')
      .then((res) => res.json() as Promise<{ address: string | null }>)
      .then((data) => {
        if (cancelled) return;
        const a = data.address;
        setAddress(a && a.startsWith('0x') ? (a as `0x${string}`) : null);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = address === undefined;
  const isConfigured = Boolean(address && address !== ZERO);

  return { address: address ?? null, loading, isConfigured };
}
