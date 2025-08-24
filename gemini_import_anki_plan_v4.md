# Plan: Anki Deck Import via Sandboxed Rendering

**Version:** 4.0
**Date:** 2025-08-22
**Objective:** To create a secure, high-fidelity, and robust Anki import system that correctly handles Anki's complex card model, including templates, media, and JavaScript, while addressing critical security and performance considerations.

---

## 1. Core Principle: Secure Encapsulation

The core principle remains to encapsulate the original Anki card within a sandboxed `<iframe>`. This version of the plan details the necessary steps to handle the full complexity of Anki's features and the security risks involved.

---

## 2. Data Model & Template Handling

The `v3` data model was too simplistic. This version correctly reflects Anki's separation of data, templates, and styling.

```typescript
// shared/types/index.ts

// The main Card type in our database
interface Card {
  // ... existing fields
  cardType: 'standard' | 'anki';
  ankiData?: AnkiCardData;
}

// Represents a single Anki Note (the data)
interface AnkiCardData {
  noteId: string;
  modelId: string; // Foreign key to the model
  fieldData: { [key: string]: string }; // e.g., { "Front": "Hola", "Back": "Hello", "Hint": "..." }
  // Note: The raw templates are stored in the model, not here.
}

// Represents an Anki Model (the template)
// This would be stored in a new `anki_models` table
interface AnkiModelData {
  modelId: string;
  name: string;
  stylingCSS: string;
  cardTemplates: AnkiTemplate[];
}

// Represents a single card template within a model
interface AnkiTemplate {
  name: string; // e.g., "Card 1", "Card 2 (reverse)"
  frontTemplate: string; // Raw HTML/JS with {{placeholders}}
  backTemplate: string;  // Raw HTML/JS with {{placeholders}}
}
```

**Key Change:** We will now have a separate store for `AnkiModelData`. When rendering a card, we will fetch the `AnkiCardData` (the content) and its corresponding `AnkiModelData` (the template) to assemble the final HTML.

---

## 3. The Rendering & Communication Strategy

### 3.1. Just-in-Time (JIT) Rendering
Rendering will not happen at import time. It will happen dynamically when a card is viewed.

1.  **Fetch Data:** Get the `AnkiCardData` and its `AnkiModelData`.
2.  **Process Templates:** A client-side function will take the raw HTML templates and the `fieldData` and perform the following replacements:
    *   **Field Placeholders:** Replace all `{{FieldName}}` placeholders with the corresponding HTML-escaped content from `fieldData`.
    *   **Conditional Rendering:** Implement logic for Anki's `{{#FieldName}}...{{/FieldName}}` conditional blocks.
    *   **Cloze Deletions:** A dedicated function will parse `{{c1::text::hint}}` syntax and convert it to interactive HTML elements (e.g., `<span class="cloze" data-cloze-text="text" data-hint="hint">[...]</span>`).
3.  **Assemble `srcdoc`:** Create the final HTML string by injecting the processed card templates and the model's `stylingCSS` into a full HTML document structure.

### 3.2. Sandboxed `<iframe>` Communication Protocol
Communication between the app and the iframe is critical for interactivity and stats.

*   **`postMessage` Contract:**
    *   **App -> Iframe:**
        *   `{ type: 'SHOW_ANSWER' }`: Tells the card's internal script to reveal the answer.
    *   **Iframe -> App:**
        *   `{ type: 'CARD_MOUNTED' }`: Sent when the card has loaded, so the app knows it's ready.
        *   `{ type: 'ANSWER_SHOWN', timeToReveal: number }`: Sent when the user reveals the answer, providing timing data.
        *   `{ type: 'GRADE_SELECTED', grade: 'again' | 'hard' | 'good' | 'easy' }`: Sent if the card has its own grading buttons.

*   **Keypress Handling:** The main app will capture keypresses (e.g., Spacebar). When detected, it will send the `SHOW_ANSWER` message to the iframe.

---

## 4. Implementation Plan

### Phase 1: Advanced Parser & Data Modeling (Week 1-2)

1.  **Update Database Schema:** Add a new `anki_models` table to store the templates and CSS.
2.  **Enhance `ankiParser.ts`:**
    *   The parser must now correctly separate `notes` (data) from `models` (templates).
    *   It will output two arrays: one of `AnkiCardData` objects and one of `AnkiModelData` objects.
    *   **Media Handling:** The parser will not upload media. It will extract all media blobs and store them locally in **IndexedDB** with a mapping from their original filename. This avoids holding huge blobs in memory.

### Phase 2: Renderer & UI (Week 3-4)

1.  **Create `AnkiCardRenderer.tsx`:**
    *   This component will fetch the card and model data.
    *   It will house the **JIT template processing logic** (placeholder replacement, cloze handling).
    *   It will manage the `<iframe>` and the `postMessage` communication listener.
    *   **DoS Mitigation:** It will include a "This card seems frozen. [Reload Card]" button that appears if no `CARD_MOUNTED` message is received within a few seconds.
2.  **Implement JIT Media Uploading:**
    *   Before rendering a card's HTML, a utility will scan it for `src` attributes.
    *   For each `src`, it checks a session cache to see if the media has already been uploaded. If not, it retrieves the blob from IndexedDB, uploads it to the `POST /api/media/upload` endpoint, and caches the returned URL.
    *   It then replaces the local filename in the HTML with the final, absolute URL.

### Phase 3: Extensible & Robust Import UI (Week 5)

1.  **Create `ImportPage.tsx` with Strategy Pattern:**
    *   The page will use a generic `ImportStrategy` interface.
    *   We will implement an `AnkiImportStrategy` that uses the parser and presents the import options.
    *   This makes it easy to add a `CsvImportStrategy` in the future without changing the page itself.
2.  **Error Handling & Reporting:**
    *   The parser will return detailed errors (e.g., `Corrupted database`, `Missing media file`).
    *   The UI will display these errors clearly to the user.
    *   It will have sanity checks and refuse to process `.apkg` files over a certain size (e.g., 500MB) directly on the client.

### Phase 4: Backend Hardening (Week 6)

1.  **Media Endpoint:** `POST /api/media/upload` (as before).
2.  **Import Endpoint:** `POST /api/import/anki`.
    *   **Backend Validation:** This endpoint will **not** trust the client. It will perform basic validation on the incoming JSON data:
        *   Check for reasonable data lengths.
        *   Ensure the structure matches the expected schema.
        *   It will not parse HTML, but it will ensure the data is saved correctly to the `cards` and `anki_models` tables.

---

## 5. Security & Risk Mitigation

*   **Sandboxing:** The `<iframe>` sandbox is our primary defense. It will be configured with `allow-scripts` but **without** `allow-same-origin`, `allow-popups`, or `allow-top-navigation`.
*   **Backend Validation:** Provides a second layer of defense against malformed data entering the database.
*   **Denial-of-Service:** Client-side file size limits and the "Reload Card" UI button are the primary mitigations for malicious decks.
*   **`eval()` Limitation:** The plan acknowledges that some browser security policies may restrict `eval()` inside sandboxed iframes, which may break a small subset of hyper-customized cards. This is an accepted security trade-off.
