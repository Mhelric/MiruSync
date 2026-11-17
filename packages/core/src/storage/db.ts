import Dexie, { type Table } from 'dexie';
import type { EntryUpdate, ListEntry, MediaType } from '../providers/types';

export interface CachedListRow {
  key: string; // `${userId}:${type}`
  userId: string;
  type: MediaType;
  entries: ListEntry[];
  updatedAt: number;
}

export interface PendingEditRow {
  id?: number;
  userId: string;
  update: EntryUpdate;
  createdAt: number;
}

class MiruSyncDB extends Dexie {
  listCache!: Table<CachedListRow, string>;
  pendingEdits!: Table<PendingEditRow, number>;

  constructor() {
    super('mirusync_db');
    this.version(1).stores({
      listCache: 'key, userId, type, updatedAt',
      pendingEdits: '++id, userId, createdAt',
    });
  }
}

export const db = new MiruSyncDB();
