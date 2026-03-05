'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppContext {
  user?: { fid: number; username?: string; displayName?: string };
}

export function useMiniApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [context, setContext]     = useState<MiniAppContext | null>(null);
  const [isReady, setIsReady]     = useState(false);

  useEffect(() => {
    sdk.context
      .then((ctx) => {
        if (ctx) {
          setIsMiniApp(true);
          setContext(ctx as MiniAppContext);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  return { isMiniApp, context, isReady };
}
