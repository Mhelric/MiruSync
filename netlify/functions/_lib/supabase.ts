export interface UpsertUserInput {
  id: string;
  provider: 'mal' | 'anilist';
  provider_user_id: string;
  username: string;
  avatar_url?: string;
  score_format: string;
}

export async function upsertSupabaseUser(input: UpsertUserInput): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // Allow local OAuth testing even before Supabase env vars are added
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  const userRes = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...input,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!userRes.ok) {
    const text = await userRes.text();
    throw new Error(`Supabase user upsert failed: ${userRes.status} ${text}`);
  }

  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/user_settings?on_conflict=user_id`,
    {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        user_id: input.id,
      }),
    }
  );

  if (!settingsRes.ok) {
    const text = await settingsRes.text();
    throw new Error(`Supabase settings init failed: ${settingsRes.status} ${text}`);
  }
}
