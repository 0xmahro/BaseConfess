export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_URL ?? 'https://baseconfess.fun';

  return Response.json({
    accountAssociation: {
      // These are filled after domain verification on https://www.base.dev/preview?tab=account
      header:    '',
      payload:   '',
      signature: '',
    },
    miniapp: {
      version:              '1',
      name:                 'BaseConfess',
      homeUrl:              APP_URL,
      iconUrl:              `${APP_URL}/icon.png`,
      splashImageUrl:       `${APP_URL}/splash.png`,
      splashBackgroundColor: '#fdf2f8',
      subtitle:             'Anonymous on-chain confessions',
      description:          'Post anonymous confessions on Base. Vote, tip, and engage — all on-chain.',
      primaryCategory:      'social',
      tags:                 ['confession', 'base', 'onchain', 'social', 'anonymous'],
      heroImageUrl:         `${APP_URL}/og.png`,
      tagline:              'Your secret lives on Base forever',
      ogTitle:              'BaseConfess',
      ogDescription:        'Anonymous on-chain confessions on Base',
      ogImageUrl:           `${APP_URL}/og.png`,
      noindex:              false,
    },
  });
}
