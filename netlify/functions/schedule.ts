import type { Context } from '@netlify/functions';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const SCHEDULE_QUERY = `
  query ($start: Int!, $end: Int!, $page: Int!) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        id
        episode
        airingAt
        media {
          id
          idMal
          title { romaji english native }
          coverImage { large }
          format
          episodes
          isAdult
        }
      }
    }
  }
`;

export default async function handler(_req: Request, _context: Context) {
  const nowSec = Math.floor(Date.now() / 1000);
  // Start from 24h ago so "just aired" & today's earlier episodes appear cleanly
  const start = nowSec - 60 * 60 * 24;
  const end = nowSec + 60 * 60 * 24 * 7;

  const items: unknown[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: SCHEDULE_QUERY,
        variables: { start, end, page },
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: `AniList schedule error: ${res.status}` },
        { status: 502 }
      );
    }

    const json = (await res.json()) as {
      data?: {
        Page?: {
          pageInfo?: { hasNextPage: boolean };
          airingSchedules?: Array<{
            id: number;
            episode: number;
            airingAt: number;
            media: {
              id: number;
              idMal?: number | null;
              title?: { romaji?: string; english?: string; native?: string };
              coverImage?: { large?: string };
              format?: string;
              episodes?: number | null;
              isAdult?: boolean;
            };
          }>;
        };
      };
    };

    const schedules = json.data?.Page?.airingSchedules ?? [];
    for (const s of schedules) {
      if (s.media.isAdult) continue;
      items.push({
        id: s.id,
        episode: s.episode,
        airingAt: s.airingAt,
        media: {
          id: `al:${s.media.id}`,
          alId: s.media.id,
          malId: s.media.idMal ?? undefined,
          title: s.media.title ?? {},
          coverUrl: s.media.coverImage?.large,
          format: s.media.format,
          episodes: s.media.episodes ?? undefined,
        },
      });
    }

    if (!json.data?.Page?.pageInfo?.hasNextPage) break;
  }

  return Response.json(
    { items, generatedAt: Date.now() },
    {
      headers: {
        'Cache-Control': 'public, max-age=900, s-maxage=900',
      },
    }
  );
}
