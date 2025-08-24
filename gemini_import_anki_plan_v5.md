# Plan: Anki Deck Import via Sandboxed Rendering

**Version:** 5.0 (Final)
**Date:** 2025-08-22
**Objective:** To create a definitive, production-ready plan for a high-fidelity Anki import system, synthesizing the best ideas from previous versions. This plan emphasizes security, performance, and a robust, extensible architecture.

---

## 1. Core Principle: Encapsulation with a Controlled Interface

We will encapsulate the original Anki card (HTML, CSS, JS) and render it in a secure sandbox. Communication between the card and the main application will be handled by a standardized, injected API bridge, ensuring both high fidelity and high security.

---

## 2. Data Model Architecture

This model combines normalization (separating models from cards) with optimized fields for rendering.

```typescript
// In a new `anki_models` database table
interface AnkiModelData {
  modelId: string; // Primary Key
  name: string;
  stylingCSS: string;
  cardTemplates: AnkiTemplate[];
}

// Represents a single card template within a model
interface AnkiTemplate {
  name: string;
  frontTemplate: string; // Raw HTML/JS with {{placeholders}}
  backTemplate: string;
}

// In the main `cards` database table, under the `ankiData` property
interface AnkiCardData {
  modelId: string; // Foreign key to AnkiModelData
  templateName: string; // Which template from the model to use
  fieldData: { [key: string]: string }; // The actual content
  cardKind: 'basic' | 'cloze'; // Determined at parse time for efficient rendering
  mediaRefs: string[]; // All media filenames referenced, extracted at parse time
}
```

---

## 3. The Rendering & Communication Strategy

### 3.1. The Injected Bootstrap Script
This is the key to reliable communication. A small, standard `bootstrap.js` script will be injected into every `<iframe>`'s `srcdoc`.

*   **Responsibilities of `bootstrap.js`:**
    1.  Create a simple global API for the card's code to use (e.g., `window.anki.showAnswer()`, `window.anki.grade('good')`).
    2.  Listen for standard DOM events (e.g., a click on an element with `id="show_answer"`).
    3.  Translate these events into a structured `postMessage` call to the parent application.
    4.  Listen for `postMessage` events from the parent to call functions within the iframe.

### 3.2. The `postMessage` Protocol

*   **App -> Iframe:**
    *   `{ type: 'EXECUTE_COMMAND', command: 'showAnswer' }`
*   **Iframe -> App (via bootstrap script):**
    *   `{ type: 'ANKI_EVENT', event: 'cardMounted' }`
    *   `{ type: 'ANKI_EVENT', event: 'answerShown', payload: { timeToReveal: 550 } }`
    *   `{ type: 'ANKI_EVENT', event: 'gradeSelected', payload: { grade: 'good' } }`

### 3.3. Just-in-Time (JIT) Rendering & Media Handling
1.  **On Card View:** Fetch the `AnkiCardData` and its `AnkiModelData`.
2.  **Template Processing:** A client-side utility performs placeholder and cloze replacement on the raw templates to generate the final card HTML.
3.  **Media Resolution:** Using the `mediaRefs` array, a media utility ensures all required media for the card is uploaded (JIT) and returns their permanent URLs.
4.  **`srcdoc` Assembly:** The final HTML is assembled, with all local `src` attributes replaced by the permanent URLs, and the `bootstrap.js` and `stylingCSS` injected.
5.  The result is passed to the `<iframe>`'s `srcdoc` attribute.

---

## 4. Implementation Plan

### Phase 1: Parser & Data Modeling (Web Worker) (Week 1-2)

1.  **Implement in a Web Worker:** The entire parsing process will run in a web worker to prevent blocking the main UI thread.
2.  **Update Database Schema:** Add the `anki_models` table.
3.  **Enhance `ankiParser.ts`:**
    *   The parser will now be responsible for identifying the `cardKind` and extracting the `mediaRefs` array for each card.
    *   It will output normalized `AnkiCardData` and `AnkiModelData` objects.
    *   It will extract all media blobs and store them in **IndexedDB** for the JIT uploader.

### Phase 2: Renderer & Bootstrap API (Week 3-4)

1.  **Develop `bootstrap.js`:** Create the standardized API bridge script.
2.  **Create `AnkiCardRenderer.tsx`:**
    *   This component will orchestrate the entire JIT rendering process.
    *   It will manage the `<iframe>` and the `postMessage` listener.
    *   It will feature a user-facing "Reload Card" button as a DoS mitigation.
3.  **Implement `mediaService.ts`:** A dedicated service to manage the JIT uploading and caching of media URLs.

### Phase 3: Extensible & Robust Import UI (Week 5)

1.  **Create `ImportPage.tsx` with Strategy Pattern:** Design the UI to be driven by a generic `ImportStrategy` interface to easily accommodate future import types (CSV, etc.).
2.  **Implement `AnkiImportStrategy.ts`:** This will contain the logic for the Anki import flow, including calls to the parsing web worker.
3.  **Error Handling:** The UI will clearly display errors reported by the parser (e.g., corrupted file, oversized deck).

### Phase 4: Backend Hardening (Week 6)

1.  **Endpoints:** `POST /api/media/upload` and `POST /api/import/anki`.
2.  **Backend Validation:** The import endpoint will validate the incoming JSON for schema compliance and reasonable data lengths before committing to the database.

---

## 5. Security & Risk Mitigation

*   **Sandbox:** The `<iframe>` with `sandbox="allow-scripts"` is the primary security control.
*   **Backend Validation:** Prevents malformed data from entering the system.
*   **DoS Mitigation:** Client-side file size limits, parsing in a web worker, and a manual "Reload Card" button for the user.
*   **Data Isolation:** The strict separation of Anki data in the database prevents it from being accidentally rendered outside of a sandbox by other parts of the application.
