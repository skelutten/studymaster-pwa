# Plan: Anki Deck Import via Sandboxed Rendering

**Version:** 6.0 (Enhanced)
**Date:** 2025-08-23
**Objective:** Production-ready, secure, and performant Anki import system with robust error handling, optimized media management, and future-proof architecture.

---

## 1. Core Architecture: Defense-in-Depth Security Model

We maintain the sandbox approach but strengthen it with multiple security layers and performance optimizations.

### Security Layers:
1. **Strict CSP (Content Security Policy)** in iframe
2. **Sanitization** of templates before rendering
3. **Rate limiting** on API calls from sandboxed content
4. **Resource quotas** for memory/CPU usage monitoring

---

## 2. Enhanced Data Model Architecture

```typescript
// Version tracking for schema migrations
interface SchemaVersion {
  version: string;
  migratedAt: Date;
}

// Enhanced model with metadata and versioning
interface AnkiModelData {
  modelId: string; // Primary Key
  name: string;
  stylingCSS: string;
  cardTemplates: AnkiTemplate[];
  modelVersion: number; // Track model updates
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    originalDeckName?: string;
    tags?: string[];
    importBatch?: string; // Group related imports
  };
}

interface AnkiTemplate {
  name: string;
  frontTemplate: string;
  backTemplate: string;
  templateHash: string; // For change detection
  sanitizedFront?: string; // Pre-sanitized version for performance
  sanitizedBack?: string;
}

// Enhanced card data with rendering cache
interface AnkiCardData {
  modelId: string;
  templateName: string;
  fieldData: { [key: string]: string };
  cardKind: 'basic' | 'cloze' | 'type' | 'image-occlusion';
  mediaRefs: MediaReference[]; // Enhanced media tracking
  renderCache?: {
    frontHtml?: string;
    backHtml?: string;
    cacheKey: string; // Based on field data hash
    cachedAt: Date;
  };
  parseErrors?: string[]; // Track non-fatal issues
  importMetadata: {
    originalNoteId?: string;
    importedAt: Date;
    importBatch: string;
  };
}

interface MediaReference {
  filename: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'uploaded' | 'failed' | 'optimized';
  permanentUrl?: string;
  thumbnailUrl?: string; // For images
  processingMetadata?: {
    originalSize: number;
    optimizedSize: number;
    format: string;
  };
}
```

---

## 3. Advanced Rendering & Communication Strategy

### 3.1. Versioned Bootstrap Script System

```typescript
interface BootstrapConfig {
  version: string;
  features: string[]; // Enable/disable features per card
  security: {
    allowedOrigins: string[];
    maxMessageSize: number;
    rateLimitMs: number;
  };
}

// Bootstrap script with feature detection
const BOOTSTRAP_SCRIPT = `
(function() {
  const VERSION = '1.0.0';
  const config = ${JSON.stringify(bootstrapConfig)};
  
  // Rate limiting
  let lastMessage = 0;
  function rateLimited(fn) {
    return function(...args) {
      const now = Date.now();
      if (now - lastMessage < config.security.rateLimitMs) return;
      lastMessage = now;
      fn.apply(this, args);
    };
  }
  
  // Enhanced API with error boundaries
  window.anki = {
    version: VERSION,
    showAnswer: rateLimited(() => {
      try {
        postMessage({ type: 'ANKI_EVENT', event: 'showAnswer' });
      } catch (e) {
        console.error('Bootstrap error:', e);
      }
    }),
    grade: rateLimited((grade) => {
      postMessage({ type: 'ANKI_EVENT', event: 'grade', payload: { grade } });
    }),
    reportError: (error) => {
      postMessage({ type: 'ERROR', error: error.toString() });
    }
  };
  
  // Automatic error catching
  window.addEventListener('error', (e) => {
    window.anki.reportError(e.error || e.message);
  });
})();
`;
```

### 3.2. Enhanced Message Protocol

```typescript
// Bidirectional type-safe messaging
enum MessageType {
  // App -> Iframe
  EXECUTE_COMMAND = 'EXECUTE_COMMAND',
  UPDATE_FIELD = 'UPDATE_FIELD',
  APPLY_THEME = 'APPLY_THEME',
  
  // Iframe -> App
  ANKI_EVENT = 'ANKI_EVENT',
  ERROR = 'ERROR',
  METRICS = 'METRICS',
  READY = 'READY',
}

interface Message<T = any> {
  type: MessageType;
  payload: T;
  timestamp: number;
  messageId: string; // For request-response correlation
}
```

### 3.3. Optimized Rendering Pipeline

```typescript
class RenderingPipeline {
  private renderCache = new Map<string, string>();
  private mediaCache = new Map<string, string>();
  private sanitizer: DOMPurify;
  
  async renderCard(card: AnkiCardData, model: AnkiModelData): Promise<RenderedCard> {
    // Check cache first
    const cacheKey = this.generateCacheKey(card, model);
    if (this.renderCache.has(cacheKey)) {
      return { html: this.renderCache.get(cacheKey)!, fromCache: true };
    }
    
    // Parallel processing
    const [frontHtml, backHtml, mediaUrls] = await Promise.all([
      this.processTemplate(model.cardTemplates[0].frontTemplate, card),
      this.processTemplate(model.cardTemplates[0].backTemplate, card),
      this.resolveMedia(card.mediaRefs)
    ]);
    
    // Sanitize with strict policy
    const sanitizedFront = this.sanitizer.sanitize(frontHtml, {
      ALLOWED_TAGS: ['div', 'span', 'img', 'audio', 'video', 'b', 'i', 'u', 'br', 'p'],
      ALLOWED_ATTR: ['src', 'alt', 'class', 'id', 'style'],
      ALLOW_DATA_ATTR: false
    });
    
    // Build final HTML with CSP
    const finalHtml = this.assembleSrcdoc({
      front: sanitizedFront,
      back: backHtml,
      css: model.stylingCSS,
      mediaUrls,
      csp: "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline';"
    });
    
    // Cache the result
    this.renderCache.set(cacheKey, finalHtml);
    
    return { html: finalHtml, fromCache: false };
  }
}
```

---

## 4. Media Management System

```typescript
class MediaService {
  private uploadQueue: Queue<MediaUploadJob>;
  private optimizer: MediaOptimizer;
  
  async processMedia(mediaRefs: MediaReference[]): Promise<ProcessedMedia[]> {
    const results = [];
    
    for (const ref of mediaRefs) {
      // Check if already processed
      if (ref.status === 'optimized') {
        results.push(ref);
        continue;
      }
      
      // Optimize based on type
      const optimized = await this.optimizeMedia(ref);
      
      // Queue for upload with retry logic
      const uploaded = await this.uploadWithRetry(optimized, {
        maxRetries: 3,
        backoff: 'exponential'
      });
      
      results.push(uploaded);
    }
    
    return results;
  }
  
  private async optimizeMedia(ref: MediaReference): Promise<MediaReference> {
    if (ref.mimeType.startsWith('image/')) {
      // Convert to WebP, resize if needed
      return this.optimizer.optimizeImage(ref, {
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'webp',
        quality: 85
      });
    } else if (ref.mimeType.startsWith('audio/')) {
      // Convert to optimized format
      return this.optimizer.optimizeAudio(ref, {
        format: 'opus',
        bitrate: 128
      });
    }
    return ref;
  }
}
```

---

## 5. Import Flow with Progressive Enhancement

```typescript
class AnkiImportOrchestrator {
  private parser: AnkiParser;
  private validator: ImportValidator;
  private mediaService: MediaService;
  
  async importDeck(file: File, options: ImportOptions): Promise<ImportResult> {
    // Phase 1: Quick validation
    const validation = await this.validator.quickValidate(file);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    
    // Phase 2: Parse in chunks (web worker)
    const parseResult = await this.parseInChunks(file, {
      chunkSize: 100, // Process 100 cards at a time
      onProgress: options.onProgress
    });
    
    // Phase 3: Deduplicate and conflict resolution
    const deduped = await this.deduplicateCards(parseResult.cards);
    
    // Phase 4: Import with transaction and rollback capability
    const transaction = await this.db.transaction();
    try {
      // Import models first
      const modelMap = await this.importModels(parseResult.models, transaction);
      
      // Import cards in batches
      const cardResults = await this.importCardBatches(deduped, modelMap, {
        batchSize: 50,
        onBatchComplete: options.onBatchComplete
      });
      
      // Queue media for background processing
      await this.queueMediaProcessing(parseResult.media);
      
      await transaction.commit();
      return { success: true, imported: cardResults };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  private async parseInChunks(file: File, options: ChunkOptions): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/ankiParser.js');
      const results: ParseResult = { cards: [], models: [], media: [] };
      
      worker.onmessage = (e) => {
        if (e.data.type === 'CHUNK_COMPLETE') {
          results.cards.push(...e.data.cards);
          options.onProgress?.(e.data.progress);
        } else if (e.data.type === 'PARSE_COMPLETE') {
          resolve(results);
          worker.terminate();
        } else if (e.data.type === 'ERROR') {
          reject(e.data.error);
          worker.terminate();
        }
      };
      
      worker.postMessage({ file, chunkSize: options.chunkSize });
    });
  }
}
```

---

## 6. Error Recovery & Monitoring

```typescript
class ErrorRecoverySystem {
  async handleCardError(card: AnkiCardData, error: Error): Promise<RecoveryAction> {
    // Log to telemetry
    this.telemetry.logError('card_render_error', {
      cardId: card.id,
      error: error.message,
      stack: error.stack
    });
    
    // Attempt recovery strategies
    const strategies = [
      () => this.trySimplifiedRender(card),
      () => this.tryFallbackTemplate(card),
      () => this.showErrorCard(card, error)
    ];
    
    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (e) {
        continue;
      }
    }
    
    return { action: 'skip', reason: 'All recovery attempts failed' };
  }
}

// Performance monitoring
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  
  measureRenderTime(cardId: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric('card_render', { cardId, duration });
      
      if (duration > 1000) {
        this.reportSlowRender(cardId, duration);
      }
    });
  }
  
  getPerformanceReport(): PerformanceReport {
    return {
      averageRenderTime: this.calculateAverage('card_render'),
      slowestCards: this.getSlowastCards(10),
      cacheHitRate: this.getCacheHitRate()
    };
  }
}
```

---

## 7. Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- Set up enhanced data models with migrations
- Implement secure sandbox with CSP
- Create versioned bootstrap script system
- Build message protocol with type safety

### Phase 2: Core Processing (Week 3-4)
- Develop chunked parser in web worker
- Implement template sanitization
- Build render caching system
- Create deduplication logic

### Phase 3: Media & Optimization (Week 5)
- Media optimization pipeline
- JIT upload system with retry logic
- Thumbnail generation for images
- Background processing queue

### Phase 4: Import UI & UX (Week 6)
- Progressive import interface
- Conflict resolution UI
- Progress tracking and cancellation
- Error recovery flows

### Phase 5: Monitoring & Polish (Week 7)
- Performance monitoring dashboard
- Telemetry integration
- Import history and rollback
- Batch management UI

### Phase 6: Testing & Hardening (Week 8)
- Security audit
- Performance benchmarking
- Edge case testing
- Documentation

---

## 8. Security Measures

### Client-Side
- **Strict CSP** in iframes: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`
- **DOMPurify** sanitization with allowlist approach
- **Resource quotas**: Monitor iframe memory/CPU usage
- **Rate limiting**: Prevent message flooding
- **Origin validation**: Verify postMessage sources

### Server-Side
- **File size limits**: Max 500MB per import
- **Schema validation**: Strict JSON schema enforcement
- **Rate limiting**: Per-user import quotas
- **Virus scanning**: For uploaded media files
- **SQL injection prevention**: Parameterized queries only

### Data Protection
- **Encryption at rest**: For sensitive field data
- **Audit logging**: Track all import operations
- **PII detection**: Scan for potential personal data
- **GDPR compliance**: Data retention and deletion policies

---

## 9. Performance Targets

- **Parse time**: < 100ms per card
- **Render time**: < 50ms for cached, < 200ms for uncached
- **Import throughput**: 1000 cards/minute
- **Memory usage**: < 100MB for 10,000 card deck
- **Cache hit rate**: > 80% after warmup
- **Media optimization**: 40-60% size reduction

---

## 10. Future Enhancements

- **Collaborative decks**: Share and sync between users
- **AI-powered suggestions**: Improve card quality
- **Template marketplace**: Share custom templates
- **Mobile app sync**: Offline-first architecture
- **Advanced analytics**: Learning pattern insights
- **Plugin system**: Custom card types and behaviors