import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { formatMediaTitle, type ListEntry } from '@mirusync/core';

interface WidgetItem {
  title: string;
  episode: number;
  time: string;
}

function isInQuietHours(
  epochMs: number,
  quietHours: { start: string; end: string } | null
): boolean {
  if (!quietHours) return false;
  const [sh, sm] = quietHours.start.split(':').map(Number);
  const [eh, em] = quietHours.end.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return false;

  const dt = new Date(epochMs);
  const mins = dt.getHours() * 60 + dt.getMinutes();
  const startMins = sh * 60 + (sm || 0);
  const endMins = eh * 60 + (em || 0);

  if (startMins <= endMins) {
    return mins >= startMins && mins <= endMins;
  }
  return mins >= startMins || mins <= endMins;
}

export async function syncAiringNotificationsAndWidget(
  animeList: ListEntry[],
  notificationsEnabled: boolean,
  quietHours: { start: string; end: string } | null,
  titleLang: 'romaji' | 'english' | 'native' = 'romaji'
): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  const endOfTodaySec = nowSec + 24 * 3600;

  const upcoming = animeList
    .filter(
      (e) =>
        (e.status === 'CURRENT' || e.status === 'REPEATING' || e.status === 'PLANNING') &&
        e.media.nextAiring &&
        e.media.nextAiring.airingAt > nowSec
    )
    .sort((a, b) => a.media.nextAiring!.airingAt - b.media.nextAiring!.airingAt);

  const widgetItems: WidgetItem[] = upcoming
    .filter((e) => e.media.nextAiring!.airingAt <= endOfTodaySec)
    .slice(0, 4)
    .map((e) => ({
      title: formatMediaTitle(e.media, titleLang),
      episode: e.media.nextAiring!.episode,
      time: new Date(e.media.nextAiring!.airingAt * 1000).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));

  try {
    await Preferences.set({
      key: 'airing_today_widget',
      value: JSON.stringify(widgetItems),
    });
  } catch {
    // Ignore on web preview where Preferences plugin may be unavailable
  }

  if (!notificationsEnabled) return;

  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt') {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const toSchedule = upcoming
      .filter((e) => {
        const ms = e.media.nextAiring!.airingAt * 1000;
        return e.media.nextAiring!.airingAt <= nowSec + 7 * 86400 && !isInQuietHours(ms, quietHours);
      })
      .slice(0, 15)
      .map((e, idx) => ({
        id: 10000 + idx,
        title: `${formatMediaTitle(e.media, titleLang)} — Ep ${e.media.nextAiring!.episode}`,
        body: 'New episode is airing now!',
        schedule: { at: new Date(e.media.nextAiring!.airingAt * 1000) },
      }));

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch {
    // Ignore when running outside Capacitor native runtime
  }
}
