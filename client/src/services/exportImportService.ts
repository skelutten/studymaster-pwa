import db, {
  ensureDBOpen,
  type SettingRow,
  type UserRow,
  type DeckRow,
  type CardRow,
  type ReviewRow,
  type MediaRow,
  type AchievementRow,
  type ChallengeRow,
  type LeaderboardCacheRow,
  type MediaAnalyticsRow,
  type UserOnlineLinkRow,
  type SyncQueueRow
} from '../data/db';
import { logError, logInfo } from './errorTrackingService';

export type ExportBundle = {
  version: number; // export format version
  exportedAt: number;
  tables: {
    settings?: SettingRow;
    users?: UserRow[];
    decks?: DeckRow[];
    cards?: CardRow[];
    reviews?: ReviewRow[];
    media?: Omit<MediaRow, 'blob'>[]; // blobs omitted in JSON export
    achievements?: AchievementRow[];
    challenges?: ChallengeRow[];
    leaderboardCache?: LeaderboardCacheRow[];
    mediaAnalytics?: MediaAnalyticsRow[];
    userOnlineLinks?: UserOnlineLinkRow[];
    // Ephemeral/operational
    syncQueue?: SyncQueueRow[];
  };
};

export type ImportOptions = {
  includeEphemeral?: boolean; // default false (skip syncQueue)
  overwriteSettings?: boolean; // default true
};

export type ImportResult = {
  ok: boolean;
  counts: {
    users?: number;
    decks?: number;
    cards?: number;
    reviews?: number;
    media?: number;
    achievements?: number;
    challenges?: number;
    leaderboardCache?: number;
    mediaAnalytics?: number;
    userOnlineLinks?: number;
    syncQueue?: number;
  };
};

/**
 * Export all local data (JSON). Media blobs are excluded (manifest only).
 * Intended for backup/migration between browsers/devices.
 */
export async function exportAll(): Promise<ExportBundle> {
  await ensureDBOpen();

  const [settingsRow, users, decks, cards, reviews, mediaRows, achievements, challenges, leaderboardCache, mediaAnalytics, userOnlineLinks] =
    await Promise.all([
      db.settings.get('settings'),
      db.users.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.reviews.toArray(),
      db.media.toArray(),
      db.achievements.toArray(),
      db.challenges.toArray(),
      db.leaderboardCache.toArray(),
      db.mediaAnalytics?.toArray?.() ?? [],
      db.userOnlineLinks?.toArray?.() ?? [],
    ]);

  // Strip Blob from media; keep metadata and pointers
  const mediaNoBlob: Omit<MediaRow, 'blob'>[] = mediaRows.map(({ blob, ...rest }) => rest);

  const bundle: ExportBundle = {
    version: 1,
    exportedAt: Date.now(),
    tables: {
      settings: settingsRow ?? { id: 'settings', createdAt: Date.now(), updatedAt: Date.now() },
      users,
      decks,
      cards,
      reviews,
      media: mediaNoBlob,
      achievements,
      challenges,
      leaderboardCache,
      mediaAnalytics,
      userOnlineLinks,
      // syncQueue intentionally omitted by default (ephemeral)
    },
  };

  logInfo('Export created', {
    scope: 'exportImport.exportAll',
    counts: {
      users: users.length,
      decks: decks.length,
      cards: cards.length,
      reviews: reviews.length,
      media: mediaNoBlob.length,
    },
  });

  return bundle;
}

/**
 * Create a JSON Blob from current export
 */
export async function exportToBlob(): Promise<Blob> {
  const data = await exportAll();
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Trigger a browser download of the export JSON.
 * Returns the Blob for cases where programmatic handling is preferred.
 */
export async function downloadExport(filename?: string): Promise<Blob> {
  const blob = await exportToBlob();
  try {
    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || defaultExportFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    logError(e instanceof Error ? e : new Error(String(e)), { scope: 'exportImport.downloadExport' });
  }
  return blob;
}

function defaultExportFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `studymaster-export-${stamp}.json`;
}

/**
 * Import a JSON bundle produced by exportAll().
 * Uses bulkPut to upsert records. Media blobs are not restored (manifest only).
 */
export async function importAll(bundle: ExportBundle, options?: ImportOptions): Promise<ImportResult> {
  await ensureDBOpen();

  if (!bundle || typeof bundle !== 'object' || !bundle.tables) {
    throw new Error('Invalid import bundle');
  }

  const includeEphemeral = options?.includeEphemeral === true;
  const overwriteSettings = options?.overwriteSettings !== false;

  const counts: ImportResult['counts'] = {};

  // Prepare table arrays (default to empty)
  const t = bundle.tables;

  await db.transaction(
    'rw',
    [
      db.settings,
      db.users,
      db.decks,
      db.cards,
      db.reviews,
      db.media,
      db.achievements,
      db.challenges,
      db.leaderboardCache,
      db.mediaAnalytics,
      db.userOnlineLinks,
      db.syncQueue
    ],
    async () => {
      // settings
      if (t.settings && overwriteSettings) {
        await db.settings.put(t.settings);
      }

      // users
      if (Array.isArray(t.users) && t.users.length) {
        await db.users.bulkPut(t.users);
        counts.users = t.users.length;
      }

      // decks
      if (Array.isArray(t.decks) && t.decks.length) {
        await db.decks.bulkPut(t.decks);
        counts.decks = t.decks.length;
      }

      // cards
      if (Array.isArray(t.cards) && t.cards.length) {
        await db.cards.bulkPut(t.cards);
        counts.cards = t.cards.length;
      }

      // reviews
      if (Array.isArray(t.reviews) && t.reviews.length) {
        await db.reviews.bulkPut(t.reviews);
        counts.reviews = t.reviews.length;
      }

      // media (metadata only)
      if (Array.isArray(t.media) && t.media.length) {
        // cast since blob is omitted in input
        await (db.media as any).bulkPut(t.media as any);
        counts.media = t.media.length;
      }

      // achievements
      if (Array.isArray(t.achievements) && t.achievements.length) {
        await db.achievements.bulkPut(t.achievements);
        counts.achievements = t.achievements.length;
      }

      // challenges
      if (Array.isArray(t.challenges) && t.challenges.length) {
        await db.challenges.bulkPut(t.challenges);
        counts.challenges = t.challenges.length;
      }

      // leaderboardCache (optional)
      if (Array.isArray(t.leaderboardCache) && t.leaderboardCache.length) {
        await db.leaderboardCache.bulkPut(t.leaderboardCache);
        counts.leaderboardCache = t.leaderboardCache.length;
      }

      // mediaAnalytics (optional)
      if (Array.isArray(t.mediaAnalytics) && t.mediaAnalytics.length) {
        await db.mediaAnalytics.bulkPut(t.mediaAnalytics);
        counts.mediaAnalytics = t.mediaAnalytics.length;
      }

      // userOnlineLinks (optional)
      if (Array.isArray(t.userOnlineLinks) && t.userOnlineLinks.length) {
        await db.userOnlineLinks.bulkPut(t.userOnlineLinks);
        counts.userOnlineLinks = t.userOnlineLinks.length;
      }

      // syncQueue (ephemeral, opt-in)
      if (includeEphemeral && Array.isArray(t.syncQueue) && t.syncQueue.length) {
        await db.syncQueue.bulkPut(t.syncQueue);
        counts.syncQueue = t.syncQueue.length;
      }
    }
  );

  logInfo('Import completed', { scope: 'exportImport.importAll', counts });
  return { ok: true, counts };
}

/**
 * Import from a File (JSON export)
 */
export async function importFromFile(file: File, options?: ImportOptions): Promise<ImportResult> {
  const text = await file.text();
  let data: ExportBundle;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON file');
  }
  return importAll(data, options);
}

export const exportImport = {
  exportAll,
  exportToBlob,
  downloadExport,
  importAll,
  importFromFile,
};

export default exportImport;