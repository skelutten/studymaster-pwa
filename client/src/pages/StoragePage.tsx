import React, { useEffect, useMemo, useState } from 'react';
import { storageManager, type StorageUsage, type PurgeReport } from '../services/storage/StorageManager';

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return 'N/A';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${sizes[i]}`;
}

const StoragePage: React.FC = () => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState<null | 'unused' | 'all'>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await storageManager.getUsage();
      setUsage(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onPurgeUnused = async () => {
    setPurging('unused');
    setError(null);
    setMessage(null);
    try {
      const report: PurgeReport = await storageManager.purgeUnusedMedia();
      setMessage(`Removed ${report.removedCount} items, freed ${formatBytes(report.removedBytes)}. Kept ${report.keptCount}.`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurging(null);
    }
  };

  const onPurgeAll = async () => {
    if (!confirm('This will remove ALL locally stored media. Cards may not render media until re-imported. Continue?')) {
      return;
    }
    setPurging('all');
    setError(null);
    setMessage(null);
    try {
      const report: PurgeReport = await storageManager.purgeAllMedia();
      setMessage(`Removed ${report.removedCount} items, freed ${formatBytes(report.removedBytes)}.`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurging(null);
    }
  };

  const est = usage?.estimate;
  const quotaPct = useMemo(() => {
    if (!est?.quota || !est?.usage) return null;
    return Math.min(100, Math.round((est.usage / est.quota) * 100));
  }, [est?.quota, est?.usage]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Storage Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage local storage (IndexedDB/OPFS). Media is stored on-device; server is optional.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Media Storage</h2>
            <button
              onClick={reload}
              disabled={loading}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Media bytes</dt>
              <dd className="text-gray-900 dark:text-gray-100">{formatBytes(usage?.mediaBytes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Media items</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.mediaCount ?? '—'}</dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-3">
            <button
              onClick={onPurgeUnused}
              disabled={purging !== null}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {purging === 'unused' ? 'Purging unused…' : 'Purge Unused Media'}
            </button>
            <button
              onClick={onPurgeAll}
              disabled={purging !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {purging === 'all' ? 'Purging all…' : 'Purge ALL Media'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">Database Overview</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Decks</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.decksCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Cards</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.cardsCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Reviews</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.reviewsCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Achievements</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.achievementsCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Challenges</dt>
              <dd className="text-gray-900 dark:text-gray-100">{usage?.challengesCount ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">Browser Storage Estimate</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Quota</dt>
            <dd className="text-gray-900 dark:text-gray-100">{formatBytes(est?.quota)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Usage</dt>
            <dd className="text-gray-900 dark:text-gray-100">{formatBytes(est?.usage)}</dd>
          </div>
          {quotaPct !== null && quotaPct !== undefined && (
            <div className="mt-2">
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded bg-gradient-to-r from-blue-500 to-purple-600"
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{quotaPct}% of quota used</div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default StoragePage;