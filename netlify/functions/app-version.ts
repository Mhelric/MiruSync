import type { Context } from '@netlify/functions';

const FALLBACK_VERSION = {
  version: '1.1.0',
  apkUrl: 'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk',
  publishedAt: '2026-11-18',
  notes: [
    'Persistent release signing for conflict-free APK updates',
    'Capacitor Local Notifications & Airing Today Home-Screen Widget',
    'Unified MyAnimeList & AniList tracker with offline queue',
  ],
};

interface GitHubReleaseResponse {
  tag_name?: string;
  published_at?: string;
  body?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
}

export default async function handler(_req: Request, _context: Context) {
  try {
    const res = await fetch(
      'https://api.github.com/repos/Mhelric/MiruSync/releases/latest',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MiruSync-AppVersion-Check',
        },
      }
    );

    if (res.ok) {
      const release = (await res.json()) as GitHubReleaseResponse;
      const version = (release.tag_name ?? '').replace(/^v/i, '').trim();
      if (version) {
        const apkAsset = release.assets?.find((a) =>
          a.name?.toLowerCase().endsWith('.apk')
        );
        const notes = (release.body ?? '')
          .split(/\r?\n/)
          .map((line) => line.replace(/^[-*]\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 5);

        return Response.json(
          {
            version,
            apkUrl:
              apkAsset?.browser_download_url ?? FALLBACK_VERSION.apkUrl,
            publishedAt: release.published_at?.slice(0, 10) ?? FALLBACK_VERSION.publishedAt,
            notes: notes.length > 0 ? notes : FALLBACK_VERSION.notes,
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=15, s-maxage=15',
            },
          }
        );
      }
    }
  } catch {
    // Fall back to static metadata if GitHub API is unreachable
  }

  return Response.json(FALLBACK_VERSION, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
