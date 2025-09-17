/**
 * MediaStorageService
 * - Client-side media persistence with SHA-256 deduplication
 * - Uses IndexedDB via repositories for storage
 * - OPFS pointer support can be added later (Phase 1 enhancement)
 */

import { repos } from '../data';
import type { MediaRow } from '../data/db';
import { hashBlobSHA256 } from '../utils/hash';
import { logError, logInfo } from '../services/errorTrackingService';

export class MediaStorageService {
  /**
   * Store a Blob in media store with SHA-256 deduplication.
   * Returns the mediaHash (content hash).
   */
  async storeBlob(
    blob: Blob,
    mimeType: string,
    options?: {
      // Placeholder for future OPFS pointer save path or strategy
      useOPFS?: boolean;
      validationMeta?: Record<string, unknown>;
      securityFlags?: MediaRow['securityFlags'];
    }
  ): Promise<string> {
    try {
      // 1) Compute content hash for deduplication
      const mediaHash = await hashBlobSHA256(blob);

      // 2) Short-circuit if already present
      if (await repos.media.has(mediaHash)) {
        logInfo('Media dedup hit', { mediaHash, size: blob.size, mimeType, scope: 'media.storeBlob' });
        return mediaHash;
      }

      // 3) Persist blob (OPFS integration can be added later; for now, IndexedDB Blob)
      await repos.media.put({
        mediaHash,
        blob,
        mimeType,
        byteLength: blob.size,
        validationMeta: options?.validationMeta,
        securityFlags: options?.securityFlags,
      });

      return mediaHash;
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { scope: 'media.storeBlob' });
      throw err;
    }
  }

  /**
   * Ensure a MediaRow exists for a given hash (null if missing)
   */
  async get(mediaHash: string): Promise<MediaRow | null> {
    try {
      return await repos.media.get(mediaHash);
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { scope: 'media.get' });
      return null;
    }
  }

  /**
   * Create an object URL for a stored blob (caller must revoke when done).
   * Returns null if not available (e.g., OPFS pointer without blob present).
   */
  async createObjectUrl(mediaHash: string): Promise<string | null> {
    try {
      const row = await repos.media.get(mediaHash);
      if (!row?.blob) return null;
      return URL.createObjectURL(row.blob);
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { scope: 'media.createObjectUrl' });
      return null;
    }
  }

  /**
   * Revoke a previously created object URL
   */
  revokeObjectUrl(url: string): void {
    try {
      URL.revokeObjectURL(url);
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { scope: 'media.revokeObjectUrl' });
    }
  }
}

// Singleton
export const mediaStorage = new MediaStorageService();
export default MediaStorageService;