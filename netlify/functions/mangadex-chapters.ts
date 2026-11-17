import type { Context } from '@netlify/functions';

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const title = url.searchParams.get('title')?.trim();
  if (!title) {
    return Response.json({ error: 'Missing title parameter' }, { status: 400 });
  }

  try {
    const searchRes = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: { 'User-Agent': 'MiruSync/1.0' } }
    );
    if (!searchRes.ok) {
      return Response.json({ chapters: [] });
    }
    const searchJson = (await searchRes.json()) as {
      data?: { id: string }[];
    };
    const mangaId = searchJson.data?.[0]?.id;
    if (!mangaId) {
      return Response.json({ chapters: [] });
    }

    const chRes = await fetch(
      `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[publishAt]=desc&limit=5&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: { 'User-Agent': 'MiruSync/1.0' } }
    );
    if (!chRes.ok) {
      return Response.json({ chapters: [] });
    }
    const chJson = (await chRes.json()) as {
      data?: Array<{
        id: string;
        attributes: {
          chapter?: string | null;
          title?: string | null;
          publishAt: string;
        };
      }>;
    };

    const chapters = (chJson.data ?? []).map((c) => ({
      id: c.id,
      chapter: c.attributes.chapter ?? '?',
      title: c.attributes.title ?? '',
      publishedAt: c.attributes.publishAt,
      url: `https://mangadex.org/chapter/${c.id}`,
    }));

    return Response.json(
      { mangaId, chapters },
      { headers: { 'Cache-Control': 'public, max-age=900' } }
    );
  } catch {
    return Response.json({ chapters: [] });
  }
}
