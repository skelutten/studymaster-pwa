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
      // Optional OPFS pointer save path (client-only, best-effort)
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

      let opfsPointer: string | undefined;

      // 3) Attempt OPFS write when requested and supported
      if (options?.useOPFS && typeof navigator !== 'undefined' && (navigator as any).storage?.getDirectory) {
        try {
          const root: any = await (navigator as any).storage.getDirectory();
          const mediaDir = await root.getDirectoryHandle('media', { create: true });
          const fileHandle = await mediaDir.getFileHandle(mediaHash, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          opfsPointer = `media/${mediaHash}`;
          logInfo('Media saved to OPFS', { mediaHash, path: opfsPointer, scope: 'media.storeBlob' });
        } catch (e) {
          // Fall back to IndexedDB blob if OPFS fails
          logError(e instanceof Error ? e : new Error(String(e)), { scope: 'media.storeBlob.opfs' });
          opfsPointer = undefined;
        }
      }

      // 4) Persist record: prefer OPFS pointer when available; otherwise store blob in IndexedDB
      await repos.media.put({
        mediaHash,
        blob: opfsPointer ? undefined : blob,
        opfsPointer,
        mimeType,
        byteLength: opfsPointer ? blob.size : blob.size,
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
      if (!row) return null;

      // Prefer in-DB blob when present
      if (row.blob) {
        return URL.createObjectURL(row.blob);
      }

      // Fallback to OPFS pointer when available
      if (row.opfsPointer && typeof navigator !== 'undefined' && (navigator as any).storage?.getDirectory) {
        try {
          const root: any = await (navigator as any).storage.getDirectory();
          // Resolve pointer like "media/<hash>"
          const [dirName, fileName] = String(row.opfsPointer).split('/');
          const mediaDir = await root.getDirectoryHandle(dirName, { create: false });
          const fileHandle = await mediaDir.getFileHandle(fileName, { create: false });
          const file = await fileHandle.getFile();
          return URL.createObjectURL(file);
        } catch (e) {
          logError(e instanceof Error ? e : new Error(String(e)), { scope: 'media.createObjectUrl.opfs' });
          return null;
        }
      }

      return null;
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