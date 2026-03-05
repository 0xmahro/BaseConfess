export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_URL ?? 'https://baseconfess.fun';

  return Response.json({
    accountAssociation: {
      header:    'eyJmaWQiOjEwMTY1NTYsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg5NjJGRWE4RDA2Q0Q4OEE5Njg0MjU5YkUyNjkyNTk3OEQ4OTBGQjc4In0',
      payload:   'eyJkb21haW4iOiJiYXNlY29uZmVzcy5mdW4ifQ',
      signature: 'f0YfhJMATbRiHL5EgiQlVgnR2cRUKQqonLUW3jZ3TIt+JbJpkYLFOalkURug+QxEM6FtitFQw57CT5nI6gAhsxs=',
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
      tagline:              'Confess on Base. Stay anon.',
      ogTitle:              'BaseConfess',
      ogDescription:        'Anonymous on-chain confessions on Base',
      ogImageUrl:           `${APP_URL}/og.png`,
      noindex:              false,
    },
  });
}
