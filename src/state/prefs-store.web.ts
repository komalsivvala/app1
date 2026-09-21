/**
 * Web counterpart of prefs-store.ts. `localStorage` is synchronous, which is
 * the property this store exists for; expo-sqlite's synchronous API on web
 * would need SharedArrayBuffer and COOP/COEP headers for the same thing.
 * Every access is guarded: private windows and blocked storage throw.
 */
function ls(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export const prefsStore = {
  get(key: string): string | null {
    try {
      return ls()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      ls()?.setItem(key, value);
    } catch {
      /* storage unavailable — the pref simply does not persist */
    }
  },
  remove(key: string): void {
    try {
      ls()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
