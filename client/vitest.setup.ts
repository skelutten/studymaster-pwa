import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
// Test-only: normalize JSZip.file setter inputs when data is ArrayBuffer to avoid "Can't read the data of 'X'".
import JSZip from 'jszip';

(() => {
  try {
    const JSZipAny: any = JSZip as any;
    const proto = JSZipAny?.prototype;
    const originalFile = proto?.file;

    if (typeof originalFile === 'function' && !(globalThis as any).__JSZIP_FILE_PATCHED2__) {
      JSZipAny.prototype.file = function (name: any, data?: any, options?: any) {
        // Getter semantics: 1 arg -> return JSZipObject (has async())
        if (arguments.length === 1) {
          return originalFile.call(this, name);
        }

        // Setter semantics: normalize payloads:
        // - If ArrayBuffer/TypedArray: convert to Uint8Array
        // - If content looks like UTF-8 text/XML (e.g., SVG), convert to string and set binary=false
        try {
          let normalized: Uint8Array | undefined;
          if (data instanceof ArrayBuffer) {
            normalized = new Uint8Array(data);
          } else if (ArrayBuffer.isView(data)) {
            normalized = data instanceof Uint8Array ? data : new Uint8Array((data as ArrayBufferView).buffer);
          }

          // Special case: ordinal filenames like "0", "1", "2" should always be treated as binary
          const isOrdinalName = typeof name === 'string' && /^\d+$/.test(name);

          if (normalized) {
            if (isOrdinalName) {
              // Force binary for ordinal media entries inside .apkg zips
              data = normalized;
              if (options == null) {
                options = { binary: true, compression: 'STORE' };
              } else if (typeof options === 'object') {
                options = { ...(options as any), binary: true, compression: (options as any).compression ?? 'STORE' };
              }
            } else {
              // Heuristic: treat as text when starts with ASCII '<' (0x3C), likely XML/SVG
              const looksLikeXml = normalized.length > 0 && normalized[0] === 0x3C /* '<' */;
              if (looksLikeXml) {
                try {
                  const text = new TextDecoder('utf-8').decode(normalized);
                  data = text;
                  if (options == null) {
                    options = { binary: false, compression: 'STORE' };
                  } else if (typeof options === 'object') {
                    options = { ...(options as any), binary: false, compression: (options as any).compression ?? 'STORE' };
                  }
                } catch {
                  // Fallback to binary if decoding fails
                  data = normalized;
                  if (options == null) {
                    options = { binary: true, compression: 'STORE' };
                  } else if (typeof options === 'object') {
                    options = { ...(options as any), binary: (options as any).binary ?? true, compression: (options as any).compression ?? 'STORE' };
                  }
                }
              } else {
                // Default: binary Uint8Array
                data = normalized;
                if (options == null) {
                  options = { binary: true, compression: 'STORE' };
                } else if (typeof options === 'object') {
                  options = { ...(options as any), binary: (options as any).binary ?? true, compression: (options as any).compression ?? 'STORE' };
                }
              }
            }
          }
        } catch {
          // swallow; delegate anyway
        }

        // Always call with options to preserve binary hint after normalization
        return originalFile.call(this, name, data, options);
      };

      (globalThis as any).__JSZIP_FILE_PATCHED2__ = true;
    }
  } catch {
    // no-op in environments where JSZip is not available
  }
})();