import type { ContentConfig } from '../models';

// Science Alive fork (#332): the last edits of an activity, written to
// localStorage when the page hides. localStorage writes finish at once, so
// they survive a tab that closes or navigates away before the IndexedDB
// autosave (1.5 s after typing stops, then async) has run. The next load of
// the activity applies a copy newer than its saved project, saves it, and
// clears it.

export interface PendingEdit {
  config: ContentConfig;
  ts: number;
}

const prefix = '__wattson_activity_pending__:';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const local = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null; // storage blocked
  }
};

export const writePending = (
  activityId: string,
  config: ContentConfig,
  store: KeyValueStore | null = local(),
  now = Date.now(),
) => {
  try {
    store?.setItem(prefix + activityId, JSON.stringify({ config, ts: now }));
  } catch {
    // quota exceeded or storage blocked: the async autosave is still tried
  }
};

export const readPending = (
  activityId: string,
  store: KeyValueStore | null = local(),
): PendingEdit | null => {
  try {
    const raw = store?.getItem(prefix + activityId);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value.ts !== 'number' ||
      !value.config ||
      typeof value.config !== 'object'
    ) {
      return null;
    }
    return value as PendingEdit;
  } catch {
    return null;
  }
};

export const clearPending = (activityId: string, store: KeyValueStore | null = local()) => {
  try {
    store?.removeItem(prefix + activityId);
  } catch {
    // storage blocked
  }
};

/** The pending copy when it is newer than the saved project (or there is none), else null. */
export const newerPending = (
  pending: PendingEdit | null,
  savedLastModified: number | undefined,
): PendingEdit | null =>
  pending && (savedLastModified === undefined || pending.ts > savedLastModified) ? pending : null;
