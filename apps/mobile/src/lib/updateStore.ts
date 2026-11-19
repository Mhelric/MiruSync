import { create } from 'zustand';

export interface AppVersionInfo {
  version: string;
  apkUrl: string;
  publishedAt?: string;
  notes?: string[];
}

interface UpdateStore {
  updateInfo: AppVersionInfo | null;
  modalOpen: boolean;
  setUpdateAvailable: (info: AppVersionInfo) => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  updateInfo: null,
  modalOpen: false,
  setUpdateAvailable: (info) => {
    const prev = get().updateInfo;
    if (prev?.version === info.version) return;
    set({ updateInfo: info, modalOpen: true });
  },
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
