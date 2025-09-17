/**
 * Media hashing utilities for deduplication (Phase 1)
 * Uses WebCrypto SubtleCrypto to compute SHA-256 digests.
 */

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let hex = '';
  for (let i = 0; i < view.length; i++) {
    const h = view[i].toString(16).padStart(2, '0');
    hex += h;
  }
  return hex;
}

/**
 * Compute SHA-256 hash of an ArrayBuffer and return lowercase hex string.
 */
export async function hashArrayBufferSHA256(buffer: ArrayBuffer): Promise<string> {
  const anyCrypto = (globalThis as any).crypto;
  if (!anyCrypto?.subtle?.digest) {
    throw new Error('WebCrypto SubtleCrypto not available for hashing');
  }
  const digest = await anyCrypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(digest);
}

/**
 * Compute SHA-256 hash of a Blob (e.g., media file) and return lowercase hex string.
 */
export async function hashBlobSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return hashArrayBufferSHA256(buffer);
}