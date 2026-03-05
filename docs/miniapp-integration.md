# BaseConfess — MiniApp Integration Research

## Nedir?

Farcaster Mini Apps ve Base App Mini Apps, web uygulamalarını mobil native deneyimine yakın bir şekilde
Farcaster / Base sosyal feed'inde çalıştırmaya imkân tanır. Uygulama aynı URL'de hem normal web hem
de mini app olarak çalışabilir.

---

## Gerekli Paketler

| Paket | Amaç |
|---|---|
| `@farcaster/miniapp-sdk` | SDK, context, `ready()`, wallet provider |
| `@farcaster/miniapp-wagmi-connector` | Wagmi connector (EIP-1193 köprüsü) |

```bash
npm install @farcaster/miniapp-sdk @farcaster/miniapp-wagmi-connector
```

---

## Nasıl Çalışır?

### 1. Context Tespiti

```typescript
import { sdk } from '@farcaster/miniapp-sdk';

const context = await sdk.context;
// context null ise → normal web
// context doluysa → mini app içinde çalışıyoruz
// context.user.fid → Farcaster kullanıcı ID'si
```

### 2. `sdk.actions.ready()`

Splash screen'i kaldırır, uygulamayı gösterir. Mini app içindeyken **uygulama yüklenince** çağrılmalıdır.

```typescript
useEffect(() => {
  sdk.actions.ready();
}, []);
```

### 3. Wallet Bağlantısı

Mini app içinde kullanıcının cüzdanı **otomatik bağlanır**. RainbowKit'e gerek yoktur.

```typescript
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Wagmi config'e eklenir, context içinde otomatik bağlanır
connectors: [farcasterMiniApp(), ...rainbowKitConnectors]
```

### 4. Web vs Mini App Stratejisi

```
Mini App Context (sdk.context truthy)
  → farcasterMiniApp connector ile auto-connect
  → RainbowKit ConnectButton gizlenir

Web Context (sdk.context null)
  → RainbowKit ConnectButton gösterilir
  → MetaMask, Coinbase, injected wallets çalışır
```

---

## Manifest Dosyası

`https://your-domain.com/.well-known/farcaster.json` adresinde barındırılmalıdır.

### Next.js Route

```typescript
// app/.well-known/farcaster.json/route.ts
export async function GET() {
  return Response.json({
    accountAssociation: { header: "", payload: "", signature: "" }, // Step 5'te doldurulur
    miniapp: {
      version: "1",
      name: "BaseConfess",
      homeUrl: "https://your-domain.com",
      iconUrl: "https://your-domain.com/icon.png",
      splashImageUrl: "https://your-domain.com/splash.png",
      splashBackgroundColor: "#fdf2f8",
      primaryCategory: "social",
      tags: ["confession", "base", "onchain"],
    }
  });
}
```

### Önemli Alanlar

| Alan | Açıklama |
|---|---|
| `accountAssociation` | Domain sahipliği doğrulaması (Base Build ile oluşturulur) |
| `homeUrl` | Uygulamanın açılacağı URL |
| `iconUrl` | 512×512 PNG, HTTPS |
| `splashImageUrl` | 200×200 PNG, loading ekranı |
| `splashBackgroundColor` | Splash arka plan rengi |
| `webhookUrl` | Bildirim webhook'u (opsiyonel) |

---

## Embed Metadata (fc:miniapp)

`layout.tsx`'e eklenir, sosyal paylaşımda rich embed için:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  return {
    other: {
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: 'https://your-domain.com/og.png',
        button: {
          title: 'Open BaseConfess',
          action: {
            type: 'launch_miniapp',
            name: 'BaseConfess',
            url: 'https://your-domain.com',
            splashImageUrl: 'https://your-domain.com/splash.png',
            splashBackgroundColor: '#fdf2f8',
          },
        },
      }),
    },
  };
}
```

---

## Yayınlama Adımları

1. **Deploy** — Vercel'e push, URL'yi al (örn. `baseconfess.vercel.app`)
2. **Env** — `NEXT_PUBLIC_URL=https://baseconfess.vercel.app` ekle
3. **Account Association** — [base.dev/preview](https://www.base.dev/preview?tab=account) → domain gir → imzala → `farcaster.json`'a yapıştır
4. **Redeploy** — Güncel manifest ile tekrar deploy
5. **Preview** — [base.dev/preview](https://www.base.dev/preview) → URL'yi test et
6. **Publish** — Base App'te URL'yi post olarak paylaş

---

## Kaynaklar

- [Farcaster Mini Apps Docs](https://miniapps.farcaster.xyz/)
- [Wallet Entegrasyonu](https://miniapps.farcaster.xyz/docs/guides/wallets)
- [Base Build Preview Tool](https://www.base.dev/preview)
- [Miniapp Wagmi Connector](https://www.npmjs.com/package/@farcaster/miniapp-wagmi-connector)
