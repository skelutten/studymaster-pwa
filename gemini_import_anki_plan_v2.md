# Plan: Anki Deck (.apkg) Import Functionality

**Version:** 2.0
**Date:** 2025-08-22
**Objective:** To implement a comprehensive, client-side parser for the Anki `.apkg` format. This plan details the handling of all content types, including rich text (HTML/CSS), media (images, audio, video), and special formats (LaTeX), ensuring a high-fidelity import into the StudyMaster application.

---

## 1. Research Analysis: The `.apkg` Format

(This remains the same as V1) The `.apkg` file is a ZIP archive containing an SQLite database (`collection.anki2` or `.anki21`), a `media` JSON file, and the media files themselves. The entire process will be handled client-side for performance and security.

---

## 2. Data Mapping: Anki Schema to StudyMaster Schema

The key is mapping Anki's rich "Note Type" model to our card structure.

*   **`col` (Collection):** Maps to StudyMaster **Decks**.
*   **`models` (Note Types):** This is critical. Each model defines the fields, card templates (front/back), and CSS for a type of note. We must parse this to correctly assemble the card content.
*   **`notes` (The Data):** Contains the raw data for each field (e.g., "Hello", "Hola").
*   **`cards` (The Instances):** Defines which `note` is used on which card. We will create one StudyMaster `Card` for each Anki `card`.

---

## 3. Advanced Content Handling Strategy

This is the core of the V2 plan, detailing how we will handle Anki's rich content.

### 3.1. HTML Content
*   **Problem:** Anki fields are HTML, not plain text.
*   **Strategy:**
    1.  Parse the HTML content from the card fields.
    2.  **Sanitize it rigorously** using a library like `DOMPurify` to prevent XSS attacks.
    3.  **Configuration:** Allow a whitelist of safe tags (`div`, `b`, `i`, `img`, `audio`, `video`, `br`, `span`, etc.) and attributes (`src`, `style`).

### 3.2. CSS Styling
*   **Problem:** Each Anki Note Type has custom CSS that dictates card appearance.
*   **Strategy:**
    1.  Extract the CSS from the `css` field of the `models` table.
    2.  **Do not inject it globally**, as this would break our application's styles.
    3.  Instead, process the CSS and **inline it** into the HTML of each card generated from that model. This can be done by parsing the CSS and applying styles to the corresponding HTML elements. This encapsulates the styling and ensures cards look correct without side effects.

### 3.3. JavaScript
*   **Problem:** Anki templates can contain JavaScript for custom interactivity.
*   **Strategy:** This is a major security and compatibility risk. All JavaScript will be stripped out.
    *   **Action:** Configure `DOMPurify` to remove all `<script>` tags and `on*` event attributes (e.g., `onclick`). This is non-negotiable.

### 3.4. Media: Images & Video
*   **Problem:** Media is referenced by filename in `<img>` or `<video>` tags (e.g., `<img src="my_cat.jpg">`).
*   **Strategy (The Lookup Pipeline):**
    1.  During parsing, find all `<img>` and `<video>` tags in a card's HTML.
    2.  For each tag, extract the `src` attribute (e.g., `my_cat.jpg`).
    3.  Look up this filename in the parsed `media` JSON file to get its numerical index (e.g., `"my_cat.jpg": "7"`).
    4.  Retrieve the file blob for `7` from the unzipped archive.
    5.  **Upload the media file** to our backend via a dedicated endpoint and get a URL in return.
    6.  Replace the original `src` (`my_cat.jpg`) with the new URL from our backend.

### 3.5. Media: Audio
*   **Problem:** Anki uses a custom tag for audio: `[sound:my_audio.mp3]`.
*   **Strategy:**
    1.  Use a regular expression to find all `[sound:...]` occurrences.
    2.  Extract the filename (`my_audio.mp3`).
    3.  Perform the same lookup and upload process as with images.
    4.  Replace the entire `[sound:...]` tag with a standard HTML5 `<audio controls src="..."></audio>` tag, using the new URL.

### 3.6. LaTeX and MathJax (Mathematical Notation)
*   **Problem:** Anki uses special tags like `[latex]...[/latex]` for math formulas.
*   **Strategy:** We will not render this during import, but we will preserve it for client-side rendering.
    1.  Detect `[latex]...[/latex]` and other math tags (`$...$`, `\(...\)`).
    2.  Replace them with a specific, render-friendly HTML element, e.g., `<span class="math-jax">...</span>`.
    3.  The StudyMaster review page will then need to include a library like **KaTeX** or **MathJax** to find elements with this class and render them correctly.

---

## 4. Implementation Plan

### Phase 1: Advanced Client-Side Parser Service (Weeks 1-2)

*   **File:** `client/src/services/ankiParser.ts`
*   **Tasks:**
    1.  Implement the base file unzipping (`jszip`) and DB loading (`sql.js`).
    2.  Write SQL queries to extract all necessary data, including the CSS from `models`.
    3.  **Integrate `DOMPurify`** with a strict whitelist of tags and attributes.
    4.  **Implement the Media Lookup Pipeline:** Create a robust function that resolves local media references to uploaded backend URLs.
    5.  **Implement Content Converters:**
        *   A function to process and inline CSS into card HTML.
        *   A function to convert `[sound:...]` tags to `<audio>` elements.
        *   A function to convert `[latex]...[/latex]` tags to `<span class="math-jax">...</span>`.
    6.  The main `parse()` method will orchestrate all of the above, returning a clean, secure, and high-fidelity JSON object.

### Phase 2: UI Integration & Rendering (Week 3)

*   **File:** `client/src/pages/ImportPage.tsx`
*   **Tasks:**
    1.  Implement the file input and preview screen as before.
    2.  **Add KaTeX/MathJax library** to the project and ensure it is active on the card review/preview pages to correctly render mathematical formulas.
    3.  Ensure the card display component correctly renders the sanitized, style-inlined HTML.

### Phase 3: Backend Media Handling (Week 4)

*   **Tasks:**
    1.  **Create a new Media Endpoint:** `POST /api/media/upload`. This endpoint will accept a file, store it in cloud storage (e.g., S3, Supabase Storage), and return a permanent URL.
    2.  **Modify Import Endpoint:** The `POST /api/import/anki` endpoint will now receive card data with fully-qualified media URLs. Its logic will be simpler, as it no longer needs to worry about media files themselves, only the text content.

---

## 5. Technical & Security Considerations

*   **Security:** HTML and CSS sanitization is the highest priority. The `DOMPurify` configuration must be strict.
*   **Performance:** The new plan involves more processing on the client (CSS inlining, regex replacements). A web worker could be used to offload this from the main thread to keep the UI responsive during large imports.
*   **Backend Storage:** Storing media in a dedicated object storage is much more scalable than putting Base64 strings in the database.
