import type { Context } from '@netlify/functions';

export default async function handler(_req: Request, _context: Context) {
  return Response.json(
    {
      version: '1.1.0',
      apkUrl: 'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk',
      publishedAt: '2026-11-18',
      notes: [
        'Overhauled Glassmorphism UI & Custom MiruSync Logo',
        'Miruro-style Weekly Release Calendar with Live Clock',
        'Rich Anime & Manga Details (Trailers, Characters, Relations, Rankings)',
      ],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
