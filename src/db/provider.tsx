import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ReactNode } from 'react';

import { CONTENT } from '@/content/questions';

import { migrate } from './migrations';
import { getMeta, setMeta } from './queries';
import { DATABASE_NAME } from './schema';
import type { Db } from './types';

/** Runs on every launch, before any screen renders. Pragmas + migrations
 *  first (docs/05-Data-Schema.md §3.1), then the two meta keys. */
async function initialise(sqlite: SQLiteDatabase): Promise<void> {
  // The production database satisfies the Db interface structurally; this
  // assignment is where the compiler proves it.
  const db: Db = sqlite;
  await migrate(db);
  if ((await getMeta(db, 'first_launch_at')) === null) {
    await setMeta(db, 'first_launch_at', String(Date.now()));
  }
  await setMeta(db, 'content_version_seen', CONTENT.contentVersion);
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initialise}>
      {children}
    </SQLiteProvider>
  );
}

/** The app's handle on user state. Typed as the narrow Db interface so
 *  screens cannot drift onto expo-sqlite-only APIs that tests cannot execute. */
export function useDb(): Db {
  return useSQLiteContext();
}
