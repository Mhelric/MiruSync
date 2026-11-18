import type { Context } from '@netlify/functions';

const ANN_RSS_URL = 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us';
const JIKAN_NEWS_URLS = [
  'https://api.jikan.moe/v4/anime/52991/news',
  'https://api.jikan.moe/v4/anime/21/news',
];

let cachedNews: { items: unknown[]; generatedAt: number } | null = null;
let cacheExpiresAt = 0;

function extractRssImage(block: string): string | undefined {
  const match =
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<img[^>]+src=["']([^"']+)["']/i);
  const url = match?.[1]?.trim();
  if (!url) return undefined;
  return url.startsWith('//') ? `https:${url}` : url;
}

function decodeEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function summarizeText(text: string, maxLen = 160): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  if (!articleUrl) return undefined;
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'MiruSync/1.0 (+https://mirusync.vercel.app)',
        Range: 'bytes=0-16384',
      },
      signal: AbortSignal.timeout(900),
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    const url = ogMatch?.[1]?.trim();
    if (!url) return undefined;
    return url.startsWith('//') ? `https:${url}` : url;
  } catch {
    return undefined;
  }
}

async function fetchJikanNews(): Promise<
  Array<{
    id: string;
    title: string;
    link: string;
    snippet: string;
    imageUrl?: string;
    publishedAt: string;
    source: string;
  }>
> {
  const results = await Promise.allSettled(
    JIKAN_NEWS_URLS.map(async (u) => {
      const res = await fetch(u, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: Array<{
          mal_id: number;
          url: string;
          title: string;
          date: string;
          excerpt?: string;
          images?: { jpg?: { image_url?: string } };
        }>;
      };
      return (json.data ?? []).slice(0, 4).map((item) => ({
        id: `mal-news-${item.mal_id}`,
        title: item.title,
        link: item.url,
        snippet: summarizeText(item.excerpt ?? ''),
        imageUrl: item.images?.jpg?.image_url,
        publishedAt: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        source: 'MyAnimeList News',
      }));
    })
  );

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

export default async function handler(_req: Request, _context: Context) {
  if (cachedNews && Date.now() < cacheExpiresAt) {
    return Response.json(cachedNews, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=900',
      },
    });
  }

  try {
    const [annRes, jikanItems] = await Promise.all([
      fetch(ANN_RSS_URL, {
        headers: {
          'User-Agent': 'MiruSync/1.0 (+https://mirusync.vercel.app)',
        },
        signal: AbortSignal.timeout(3500),
      }),
      fetchJikanNews(),
    ]);

    if (!annRes.ok) {
      return Response.json({ error: `RSS fetch failed: ${annRes.status}` }, { status: 502 });
    }

    const xml = await annRes.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    const rawAnn = itemMatches.slice(0, 18).map((raw, idx) => {
      const title = extractTag(raw, 'title');
      const link = extractTag(raw, 'link');
      const pubDate = extractTag(raw, 'pubDate');
      const description = summarizeText(extractTag(raw, 'description'));
      const rssImage = extractRssImage(raw);

      return {
        id: link || `ann-${idx}`,
        title,
        link,
        snippet: description,
        rssImage,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: 'Anime News Network',
      };
    });

    const missingImgIndexes = rawAnn
      .map((item, idx) => (!item.rssImage ? idx : -1))
      .filter((idx) => idx !== -1)
      .slice(0, 6);

    const fetchedImages = await Promise.all(
      missingImgIndexes.map((idx) => fetchOgImage(rawAnn[idx].link))
    );
    const ogByIndex = new Map<number, string | undefined>();
    missingImgIndexes.forEach((idx, i) => ogByIndex.set(idx, fetchedImages[i]));

    const annItems = rawAnn.map(({ rssImage, ...item }, idx) => ({
      ...item,
      imageUrl: rssImage ?? ogByIndex.get(idx),
    }));

    const merged = [...annItems, ...jikanItems].sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    );

    const payload = { items: merged, generatedAt: Date.now() };
    cachedNews = payload;
    cacheExpiresAt = Date.now() + 10 * 60 * 1000;

    return Response.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=900',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to load news' },
      { status: 500 }
    );
  }
}
