import { useSyncExternalStore } from 'react';

export type CardStyle = 'glass' | 'solid';
export type RadiusStyle = 'rounded' | 'sharp';
export type TextScale = 'compact' | 'normal' | 'large';

export interface AppearancePrefs {
  cardStyle: CardStyle;
  radiusStyle: RadiusStyle;
  textScale: TextScale;
}

const STORAGE_KEY = 'mirusync_mobile_appearance';

const DEFAULT_PREFS: AppearancePrefs = {
  cardStyle: 'glass',
  radiusStyle: 'rounded',
  textScale: 'normal',
};

function loadPrefs(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      cardStyle: parsed.cardStyle === 'solid' ? 'solid' : 'glass',
      radiusStyle: parsed.radiusStyle === 'sharp' ? 'sharp' : 'rounded',
      textScale:
        parsed.textScale === 'compact' || parsed.textScale === 'large'
          ? parsed.textScale
          : 'normal',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

let state: AppearancePrefs = loadPrefs();
const listeners = new Set<() => void>();

export function applyAppearanceToDom(prefs: AppearancePrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-card-style', prefs.cardStyle);
  root.setAttribute('data-radius', prefs.radiusStyle);
  root.setAttribute('data-text-scale', prefs.textScale);
}

applyAppearanceToDom(state);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppearancePrefs {
  return state;
}

export function updateAppearancePrefs(partial: Partial<AppearancePrefs>): void {
  state = { ...state, ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
  applyAppearanceToDom(state);
  for (const listener of listeners) listener();
}

export function useAppearancePrefs(): AppearancePrefs {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
