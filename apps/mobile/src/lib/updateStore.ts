import { useSyncExternalStore } from 'react';

export interface AppVersionInfo {
  version: string;
  apkUrl: string;
  publishedAt?: string;
  notes?: string[];
}

interface UpdateState {
  updateInfo: AppVersionInfo | null;
  modalOpen: boolean;
}

let state: UpdateState = {
  updateInfo: null,
  modalOpen: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UpdateState {
  return state;
}

export function setUpdateAvailable(info: AppVersionInfo): void {
  if (state.updateInfo?.version === info.version) return;
  state = { updateInfo: info, modalOpen: true };
  emit();
}

export function openUpdateModal(): void {
  if (state.modalOpen) return;
  state = { ...state, modalOpen: true };
  emit();
}

export function closeUpdateModal(): void {
  if (!state.modalOpen) return;
  state = { ...state, modalOpen: false };
  emit();
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
