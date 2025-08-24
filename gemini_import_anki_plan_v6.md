# Plan: Anki Deck Import via Sandboxed Rendering

**Version:** 6.0 (Final Synthesis)
**Date:** 2025-08-22
**Objective:** To specify a production-grade, secure, and performant Anki import system, incorporating a defense-in-depth security model, a media optimization pipeline, and robust error recovery.

---

## 1. Core Architecture: Defense-in-Depth

We will use a sandboxed `<iframe>` as the core of our rendering strategy, reinforced with multiple layers of security.

1.  **Strict Content Security Policy (CSP):** Each iframe's `srcdoc` will be served with a restrictive CSP header to prevent loading of unauthorized resources.
2.  **Template Sanitization:** All HTML templates will be sanitized with `DOMPurify` before rendering to remove potentially malicious content, even within the sandbox.
3.  **API Rate Limiting:** Communication from the iframe to the parent app via `postMessage` will be rate-limited to prevent message flooding.
4.  **Resource Monitoring:** The main application will monitor iframe load times and provide a mechanism to terminate unresponsive or resource-intensive cards.

---

## 2. Enhanced Data Model Architecture

This versioned schema is designed for performance, migrations, and rich metadata.

```typescript
// In a new `anki_models` database table
interface AnkiModelData {
  modelId: string; // Primary Key
  name: string;
  stylingCSS: string;
  cardTemplates: AnkiTemplate[];
  modelVersion: number; // For schema migrations
  metadata: { importBatch: string; tags?: string[] };
}

interface AnkiTemplate {
  name: string;
  frontTemplate: string;
  backTemplate: string;
  templateHash: string; // Hash of content for change detection
}

// In the main `cards` database table, under the `ankiData` property
interface AnkiCardData {
  modelId: string;
  templateName: string;
  fieldData: { [key: string]: string };
  cardKind: 'basic' | 'cloze' | 'image-occlusion';
  mediaRefs: MediaReference[]; // Rich media metadata
  renderCacheKey?: string; // Key for caching the rendered HTML
  parseErrors?: string[]; // Non-fatal errors during parsing
}

// Stored in a new `media` table, linked to cards
interface MediaReference {
  filename: string; // Original filename
  mimeType: string;
  size: number;
  status: 'pending' | 'optimizing' | 'uploading' | 'complete' | 'failed';
  permanentUrl?: string;
  thumbnailUrl?: string; // For image previews
}
```

---

## 3. Advanced Rendering & Communication

### 3.1. The Rendering Pipeline
An abstracted `RenderingPipeline` class will handle card rendering.

1.  **Check Cache:** Check for a pre-rendered version of the card using `renderCacheKey`.
2.  **JIT Template Processing:** If not cached, process the templates to handle `{{placeholders}}` and `{{cloze}}` syntax.
3.  **Sanitize:** Run the resulting HTML through a configured `DOMPurify` instance.
4.  **Resolve Media:** A `MediaService` will provide permanent URLs for all media in the `mediaRefs` array, uploading them just-in-time if necessary.
5.  **Assemble `srcdoc`:** Construct the final HTML, injecting a strict CSP, the model's CSS, the card's HTML, and the versioned bootstrap script.

### 3.2. Versioned Bootstrap Script & Protocol
A versioned `bootstrap.js` script will be injected into every iframe to act as a standard API bridge.

*   **Features:** It will include rate-limiting for `postMessage` calls and `try...catch` blocks to report errors back to the parent app.
*   **Protocol:** A type-safe protocol with message IDs will be used for request-response correlation.
    *   `App -> Iframe`: `{ type: 'EXECUTE_COMMAND', command: 'showAnswer', messageId: '...' }`
    *   `Iframe -> App`: `{ type: 'ANKI_EVENT', event: 'answerShown', correlationId: '...' }` or `{ type: 'ERROR', message: '...' }`

---

## 4. Media Management System

A dedicated `MediaService` will manage the entire lifecycle of media files.

1.  **Optimization:** Before uploading, the service will optimize media to save bandwidth and storage.
    *   **Images:** Convert to WebP, resize to max dimensions, generate thumbnails.
    *   **Audio:** Convert to a modern, efficient codec like Opus.
2.  **Resilient Uploads:** The service will manage an upload queue with automatic retries and exponential backoff for network failures.
3.  **Status Tracking:** The `MediaReference` object in the database will be updated as the media is processed, from `pending` to `optimized` to `complete`.

---

## 5. Import Flow: The Import Orchestrator

A new `AnkiImportOrchestrator` class will manage the import process in phases.

1.  **Validation:** Perform a quick validation of the `.apkg` file before processing.
2.  **Chunked Parsing:** The orchestrator will use a **Web Worker** to parse the deck in small chunks to keep the UI responsive, reporting progress along the way.
3.  **Deduplication:** Check for existing notes/models to avoid duplicates.
4.  **Transactional Import:** All database writes (models, cards) will be wrapped in a single transaction with rollback capability to ensure data integrity.
5.  **Media Queuing:** Once the card data is imported, the associated media files are added to the `MediaService` queue for background processing.

---

## 6. Error Recovery & Performance Monitoring

*   **Error Recovery:** If a card fails to render in the sandbox, an `ErrorRecoverySystem` will attempt fallback strategies (e.g., rendering a simplified version, or showing a user-friendly error message with a "skip card" button).
*   **Performance Monitoring:** A `PerformanceMonitor` class will track key metrics:
    *   Card render times (ms).
    *   Render cache hit rate (%).
    *   Import throughput (cards/sec).
    *   This data can be used to identify slow cards or performance regressions.

---

## 7. Implementation Timeline (Phased)

*   **Phase 1: Foundation (W1-2):** Data models, secure sandbox with CSP, versioned bootstrap script.
*   **Phase 2: Core Processing (W3-4):** Chunked parser in web worker, render caching, deduplication logic.
*   **Phase 3: Media Pipeline (W5):** Media optimization and JIT upload service.
*   **Phase 4: UI/UX (W6):** Progressive import interface with progress tracking and error display.
*   **Phase 5: Monitoring & Hardening (W7):** Implement performance monitoring and error recovery systems.
*   **Phase 6: Testing & Security Audit (W8):** Full security audit, performance benchmarking, and release.
