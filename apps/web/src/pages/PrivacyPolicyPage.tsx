import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to MiruSync
        </Link>

        <div className="flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-50">
            MiruSync Privacy Policy
          </h1>
        </div>
        <p className="text-xs font-mono text-slate-400">
          Last updated: November 2026
        </p>

        <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-base font-semibold text-slate-100">
            1. Information We Collect
          </h2>
          <p>
            MiruSync authenticates exclusively via official MyAnimeList or AniList
            OAuth2. We never collect or store your password. We store your
            provider user ID, username, avatar URL, app preferences, followed
            title IDs, and push notification tokens so your settings and alerts
            stay synced across your devices.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-base font-semibold text-slate-100">
            2. How We Use Data
          </h2>
          <p>
            Your data is used solely to display and update your anime/manga lists,
            sync your preferences in real time, and deliver episode or chapter
            notifications you opt into. We do not sell or share your data with
            advertisers.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-base font-semibold text-slate-100">
            3. Data Deletion
          </h2>
          <p>
            You can delete all MiruSync cloud data (settings, push tokens,
            followed titles, and notification history) at any time from{' '}
            <strong>Settings → Delete MiruSync Cloud Data</strong>. This does
            not affect your MyAnimeList or AniList account.
          </p>
        </section>
      </div>
    </main>
  );
}
