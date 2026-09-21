/**
 * Tiny synchronous key-value store for the two prefs that must be known
 * BEFORE first paint — theme and language — so there is no flash of the wrong
 * one. Backed by expo-sqlite/kv-store on native. prefs-store.web.ts is the
 * browser counterpart (Metro picks it by platform extension).
 */
import Storage from 'expo-sqlite/kv-store';

export const prefsStore = {
  get(key: string): string | null {
    return Storage.getItemSync(key);
  },
  set(key: string, value: string): void {
    Storage.setItemSync(key, value);
  },
  remove(key: string): void {
    Storage.removeItemSync(key);
  },
};
