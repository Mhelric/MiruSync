import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { API_BASE } from './mobileAuth';

let registeredForUser: string | null = null;

export async function registerMobilePush(
  userId: string,
  supabaseJwt?: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!userId || registeredForUser === userId) return;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    await PushNotifications.createChannel({
      id: 'mirusync_releases',
      name: 'Episode & Chapter Releases',
      description: 'Notifications when followed anime or manga release new updates',
      importance: 4,
      visibility: 1,
    });

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (token) => {
      if (!token?.value) return;
      registeredForUser = userId;
      try {
        await fetch(`${API_BASE}/api/user-sync`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(supabaseJwt ? { Authorization: `Bearer ${supabaseJwt}` } : {}),
          },
          body: JSON.stringify({
            pushPlatform: 'android',
            pushSubscription: { token: token.value },
          }),
        });
      } catch {
        // Will retry on next app session
      }
    });

    await PushNotifications.register();
  } catch {
    // Ignore when FCM / Play Services is unavailable
  }
}
