import { Attribution } from 'ox/erc8021';
import type { Hex } from 'viem';

/**
 * Base Builder Code (ERC-8021) — set in Vercel as NEXT_PUBLIC_BASE_BUILDER_CODE or rely on default.
 * @see https://docs.base.org/base-chain/builder-codes/app-developers
 */
const BUILDER_CODE =
  (process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ?? 'bc_qsi5c9nq').trim();

export const BUILDER_CODE_DATA_SUFFIX: Hex | undefined =
  BUILDER_CODE.length > 0
    ? Attribution.toDataSuffix({ codes: [BUILDER_CODE] })
    : undefined;

/** Spread onto `writeContract` / `writeContractAsync` so `args` tuple types stay inferred. */
export function builderCodeTxOpts(): { dataSuffix: Hex } | object {
  return BUILDER_CODE_DATA_SUFFIX
    ? { dataSuffix: BUILDER_CODE_DATA_SUFFIX }
    : {};
}
