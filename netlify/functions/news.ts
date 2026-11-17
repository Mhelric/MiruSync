import type { Context } from '@netlify/functions';

const ANN_RSS_URL = 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us';

function decodeEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

export default async function handler(_req: Request, _context: Context) {
  try {
    const res = await fetch(ANN_RSS_URL, {
      headers: {
        'User-Agent': 'MiruSync/1.0 (+https://mirusync.netlify.app)',
      },
    });

    if (!res.ok) {
      return Response.json({ error: `RSS fetch failed: ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    const items = itemMatches.slice(0, 30).map((raw, idx) => {
      const title = extractTag(raw, 'title');
      const link = extractTag(raw, 'link');
      const pubDate = extractTag(raw, 'pubDate');
      const description = extractTag(raw, 'description').slice(0, 220);

      return {
        id: link || `ann-${idx}`,
        title,
        link,
        snippet: description,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: 'Anime News Network',
      };
    });

    return Response.json(
      { items, generatedAt: Date.now() },
      {
        headers: {
          'Cache-Control': 'public, max-age=900, s-maxage=900',
        },
      }
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to load news' },
      { status: 500 }
    );
  }
}
