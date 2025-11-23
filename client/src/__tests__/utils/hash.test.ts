import { describe, it, expect } from 'vitest';
import { hashArrayBufferSHA256, hashBlobSHA256 } from '../../utils/hash';

function hexToLower(s: string) {
  return s.toLowerCase();
}

describe('hash utils (SHA-256)', () => {
  it('hashArrayBufferSHA256 computes correct digest for "hello"', async () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('hello').buffer;
    const hex = await hashArrayBufferSHA256(buffer);
    // Precomputed SHA-256 for "hello"
    const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    expect(hexToLower(hex)).toBe(expected);
  });

  it('hashBlobSHA256 computes same digest as array buffer for exactly the same bytes', async () => {
    // Use explicit bytes to avoid environment-specific string/Blob differences
    const encoder = new TextEncoder();
    const bytes = encoder.encode('hello'); // Uint8Array
    const blob = new Blob([bytes], { type: 'application/octet-stream' });

    // Hash blob
    const hexBlob = await hashBlobSHA256(blob);

    // Hash the exact same byte sequence
    const hexBuf = await hashArrayBufferSHA256(bytes.buffer);

    expect(hexToLower(hexBlob)).toBe(hexToLower(hexBuf));
  });
});