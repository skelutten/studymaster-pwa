/**
 * Data layer entrypoint
 * - Exports a singleton set of repositories backed by IndexedDB (Dexie)
 * - Keep this the only import point for repos from UI/stores
 */

import { createIndexedDBRepositories } from './repositories';

export const repos = createIndexedDBRepositories();

export type { Repositories } from './repositories';