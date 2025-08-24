# Plan: Anki Deck Import via Sandboxed Rendering

**Version:** 3.0
**Date:** 2025-08-22
**Objective:** To create a high-fidelity Anki import system that preserves the original card's HTML, CSS, and JavaScript. This will be achieved by introducing a new, sandboxed card type and building an extensible import page.

---

## 1. Core Principle: Encapsulation over Integration

This plan abandons the previous goal of converting Anki cards to a native format. Instead, we will **encapsulate the original Anki card structure** and render it within a secure, isolated environment. This preserves 100% of the card's intended look, feel, and interactivity.

---

## 2. The Sandboxed `<iframe>` Rendering Strategy

To safely render cards that contain custom CSS and JavaScript, we will use a sandboxed `<iframe>`.

*   **Security:** The `<iframe>` will use the `sandbox` attribute (`<iframe sandbox="allow-scripts" ...>`). This allows JavaScript to execute *inside* the iframe but prevents it from accessing the parent application (no access to cookies, localStorage, or the parent DOM). This is the critical security measure.
*   **Implementation:** For each card, we will dynamically construct an HTML document string containing the card's required HTML, CSS, and JS. This string will be passed to the `<iframe>`'s `srcdoc` attribute. This is highly efficient and avoids creating temporary files.

---

## 3. Data Model Changes

We need to introduce a new card type in `shared/types/index.ts`.

```typescript
// In the main Card type
interface Card {
  // ... existing fields
  cardType: 'standard' | 'anki';
  ankiData?: AnkiCardData;
}

// New interface for the encapsulated Anki data
interface AnkiCardData {
  frontTemplate: string; // The raw HTML/JS for the front
  backTemplate: string;  // The raw HTML/JS for the back
  stylingCSS: string;    // The specific CSS for this card type
  fieldData: { [key: string]: string }; // e.g., { "Front": "Hola", "Back": "Hello" }
}
```

---

## 4. Implementation Plan

### Phase 1: The Parser Service (Week 1)

*   **File:** `client/src/services/ankiParser.ts`
*   **Logic:** The parser's role changes. It no longer sanitizes or transforms. It **extracts raw data**.
    1.  Unzip the `.apkg` file (`jszip`) and load the database (`sql.js`).
    2.  From the `models` table, extract the raw HTML templates, CSS, and field names.
    3.  From the `notes` table, extract the raw field data.
    4.  From the `cards` table, link notes to cards.
    5.  **Media Handling:** The media lookup pipeline remains the same: resolve local file references to uploaded backend URLs.
    6.  The service will output a clean JSON structure matching the `AnkiCardData` interface for each card.

### Phase 2: The Sandboxed Renderer & Card Component (Week 2)

*   **File:** `client/src/components/cards/AnkiCardRenderer.tsx`
*   **Logic:** This new component will be responsible for rendering the `anki` card type.
    1.  It will accept an `AnkiCardData` object as a prop.
    2.  It will dynamically construct the full HTML document for the `srcdoc` attribute. This involves injecting the `stylingCSS` into a `<style>` tag and the field data into the HTML template.
    3.  It will render an `<iframe sandbox="allow-scripts" srcdoc={...}>`.
    4.  It will implement a `postMessage` communication channel between the iframe and the main app to handle answer events (e.g., when a "Show Answer" button *inside* the iframe is clicked).

### Phase 3: Extensible Import Page (Week 3)

*   **File:** `client/src/pages/ImportPage.tsx`
*   **Logic:** Since no existing component was found, we will create one designed for future extension.
    1.  The UI will feature a clear choice of import format (e.g., tabs or large buttons). Initially, it will only have "Anki (.apkg)".
    2.  It will contain the file input and preview logic as planned before.
    3.  On confirmation, it will call the backend API with the data produced by the `ankiParser.ts`.

### Phase 4: Backend (Week 4)

*   **Media Endpoint:** `POST /api/media/upload` (as planned in v2).
*   **Import Endpoint:** `POST /api/import/anki`. Its logic is now to save the `AnkiCardData` object (including raw HTML, CSS, and JS templates) directly to the database. No server-side sanitization of this data is needed since it will only ever be rendered in a sandbox.

---

## 5. Security Implications & Mitigation

*   **Primary Risk:** Allowing user-provided JavaScript execution.
*   **Mitigation:** The **sandboxed `<iframe>` is the only mitigation**. It is critical that the `sandbox` attribute **never** includes `allow-same-origin` or `allow-top-navigation`. This ensures that even malicious card code cannot access application data or redirect the user.
*   **User Warning:** The import UI should include a brief, clear warning: "You are importing a deck that may contain custom code. It will be run in a secure, isolated environment. Proceed with caution."
