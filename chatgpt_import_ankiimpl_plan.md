Implementation Plan: Anki Deck Import via Sandboxed Rendering

Version: 6.0 (Final Synthesis)
Date: 2025-08-22

1. Core Architecture: Defense-in-Depth
1.1. Sandboxed Iframe Security

Implementation Tasks

Configure iframe with attributes:

<iframe sandbox="allow-scripts allow-same-origin" srcdoc="..."></iframe>


No allow-forms, allow-top-navigation, allow-popups.

CSP policy injected in srcdoc:

Content-Security-Policy:
default-src 'none'; 
script-src 'self'; 
style-src 'self' 'unsafe-inline'; 
img-src data: blob:;
media-src blob:;


Disable inline event handlers (onclick=...) in sanitization stage.

1.2. Template Sanitization

Use DOMPurify in strict mode with custom hooks to strip:

javascript: URIs

Inline CSS with url()

<iframe>, <object>, <embed> elements.

1.3. API Rate Limiting

Add a message throttler in bootstrap.js:

Max 20 messages / sec.

Excess messages are dropped and logged.

1.4. Resource Monitoring

Parent app monitors:

Iframe load timeout (>2s fallback).

Frame memory usage (if supported by browser).

Kill & replace iframe if frozen/unresponsive.

2. Data Model Architecture
2.1. Database Schema (Postgres / SQLite)

Create anki_models, anki_cards, anki_media tables with JSONB columns for flexible metadata.

Index:

modelId (primary key).

(templateHash, modelId) composite index for deduplication.

2.2. Versioning

Maintain a schema_version table for migrations.

Use automated migrations (e.g., Prisma / Knex migrations).

3. Rendering & Communication
3.1. RenderingPipeline Class

Modules:

Cache Layer: Redis or IndexedDB (for offline) keyed by renderCacheKey.

Template Engine:

Custom parser for {{field}} and {{cloze}} expansion.

Cloze expansion outputs <span class="cloze">...</span>.

DOMPurify sanitizer instance.

MediaResolver:

Replace {{media:filename}} with permanent URLs from MediaService.

Assembler:

Build final srcdoc with CSP, CSS, sanitized HTML, and injected bootstrap.js.

3.2. Bootstrap Script

Written in TypeScript, compiled to ES5 for compatibility.

Features:

Request/response protocol with unique messageId.

Error handling wrapper:

try { /* user code */ } 
catch (err) { postMessage({type: 'ERROR', message: err.message}); }


Throttled postMessage.

4. Media Management System
4.1. Optimization Pipeline

Images:

Convert with sharp (Node.js).

Resize max 2048px.

WebP + thumbnail (256px).

Audio:

Convert to Opus with FFmpeg.

Videos (optional):

Transcode to MP4 H.265 or WebM VP9.

Generate preview thumbnail.

4.2. Upload & Retry

Background worker (bullmq or in-browser queue).

Exponential backoff retry strategy (1s, 5s, 25s, ...).

Status updates stored in DB (pending → optimizing → uploading → complete/failed).

5. Import Orchestrator
5.1. Validation

Use anki-apkg-export parser or custom SQLite extractor.

Check for required tables (col, notes, cards, revlog, media).

5.2. Chunked Parsing

Use Web Worker:

Parse in batches of ~100 cards.

Post progress events ({done, total}).

Keep UI responsive.

5.3. Deduplication

On import, check templateHash and modelId.

Skip identical models/cards already in DB.

5.4. Transactional Import

Wrap model + card inserts in a single SQL transaction.

Roll back if error occurs.

5.5. Media Queuing

Extract media files to temp storage.

Push to MediaService queue for background processing.

6. Error Recovery & Monitoring
6.1. Error Recovery

If iframe render fails:

Retry with stripped CSS.

If still fails → show fallback card:

"This card could not be rendered. [Skip]"


Collect logs in DB for debugging.

6.2. Performance Monitoring

PerformanceMonitor class:

Collects:

Render latency (performance.now() diff).

Cache hit ratio.

Import throughput (cards/sec).

Export metrics via Prometheus / Web UI dashboard.

7. Implementation Timeline
Phase	Duration	Deliverables
Phase 1: Foundation	W1-2	DB schema, sandboxed iframe w/ CSP, bootstrap.js v1
Phase 2: Core Processing	W3-4	Web Worker parser, render caching, deduplication logic
Phase 3: Media Pipeline	W5	MediaService with optimization + upload queue
Phase 4: UI/UX	W6	Import progress UI, error display, retry controls
Phase 5: Monitoring & Hardening	W7	PerformanceMonitor, ErrorRecoverySystem
Phase 6: Testing & Security Audit	W8	Security audit, benchmarks, bugfixes, final release