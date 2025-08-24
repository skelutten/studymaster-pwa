# Plan: Anki Deck (.apkg) Import Functionality

**Version:** 1.0
**Date:** 2025-08-22
**Objective:** To implement a robust, client-side parser for the Anki `.apkg` file format and integrate it into the application's import workflow, allowing users to import their existing Anki decks, including text, images, and audio.

---

## 1. Research Analysis: The `.apkg` Format

The `.apkg` file is a standard ZIP archive containing the following:

*   **`collection.anki2` or `collection.anki21`**: An SQLite database file that holds the core data.
*   **`media`**: A JSON file that maps numerical media filenames to their original names.
*   **Media Files**: A collection of files (e.g., `0`, `1`, `2`...) representing the images and audio clips used by the cards.

The entire parsing process can be handled client-side, which is more secure and performant as the file does not need to be uploaded.

---

## 2. Data Mapping: Anki Schema to StudyMaster Schema

The key to a successful import is correctly mapping Anki's data structures to our application's data structures. The primary SQLite tables of interest are:

*   **`col` (Collection):** Contains deck metadata. The `decks` field is a JSON object describing all decks in the collection.
    *   **Anki `deck`** -> **StudyMaster `Deck`**
*   **`notes`**: Represents the raw information for flashcards. This is the most critical table.
    *   **Anki `note`** -> **StudyMaster `Card`** (or a new `Note` entity if we adopt a similar model).
    *   The `flds` field contains the note's content (e.g., Front, Back), separated by a special `\x1f` character.
*   **`cards`**: Represents the actual flashcards generated from a `note`. A single note can create multiple cards (e.g., a forward and a reverse card).
    *   We will create one StudyMaster `Card` for each Anki `card` to ensure all review history is preserved.
*   **`models`**: Defines the structure of each `note` type (e.g., what fields it has, like "Spanish" and "English"). We need this to correctly interpret the `flds` field in the `notes` table.

---

## 3. Implementation Plan

### Phase 1: Client-Side Parser Service (Weeks 1-2)

This phase focuses on creating a self-contained service to handle the file parsing.

**1. Create `AnkiParserService.ts`**
*   **File Location:** `client/src/services/ankiParser.ts`
*   **Dependencies:** `jszip` and `sql.js` (already installed).

**2. Implement File Unzipping**
*   The service will take a `File` object (from an input element) as input.
*   It will use `jszip` to unzip the `.apkg` file in memory.

**3. Implement Database Parsing**
*   It will locate the `collection.anki2` or `collection.anki21` file from the unzipped contents.
*   It will initialize an `sql.js` database instance from the file's buffer.
*   It will execute SQL queries to extract the necessary data from the `col`, `notes`, `cards`, and `models` tables.
    *   **Query 1:** Get decks JSON from the `col` table.
    *   **Query 2:** Get all note types from the `models` table.
    *   **Query 3:** Get all notes from the `notes` table.
    *   **Query 4:** Get all cards from the `cards` table.

**4. Implement Media Parsing**
*   The service will read the `media` JSON file.
*   It will create a mapping between the numerical filenames and their original names.
*   For each media file referenced in a card's content, it will extract the file blob from the zip and create a local `ObjectURL` or a Base64 data URL for it.

**5. Structure the Output**
*   The service's main public method, e.g., `parse()`, will return a structured JSON object representing the entire collection, ready to be used by the UI or sent to the backend.

### Phase 2: UI Integration & Import Workflow (Week 3)

**1. Create `ImportPage.tsx` Component**
*   **File Location:** `client/src/pages/ImportPage.tsx`
*   This component will contain a file input (`<input type="file" accept=".apkg">`).
*   On file selection, it will instantiate the `AnkiParserService` and call the `parse()` method.
*   It will display a loading indicator while parsing is in progress.

**2. Display Import Preview**
*   Once parsing is complete, the UI will display a preview of the parsed data (e.g., "Found deck 'Spanish Vocab' with 250 cards. Would you like to import?").
*   It will show a list of decks to be imported.

**3. Handle Import Confirmation**
*   On user confirmation, the component will take the parsed JSON data and send it to the backend for final processing.

### Phase 3: Backend Integration (Week 4)

**1. Create New API Endpoint**
*   **Endpoint:** `POST /api/import/anki`
*   This endpoint will accept the JSON data structure produced by the client-side parser.

**2. Implement Backend Import Logic**
*   A new service in `server/src/services/` will handle the request.
*   It will iterate through the decks and cards from the payload.
*   For each deck and card, it will create a corresponding entry in the StudyMaster database.
*   It will handle potential data conflicts (e.g., if a deck with the same name already exists).
*   Media files (sent as Base64 strings) will be stored appropriately (e.g., in cloud storage) and linked to their respective cards.

---

## 4. Technical & Security Considerations

*   **HTML Sanitization:** Anki card fields contain raw HTML. This content **must be sanitized** before being rendered in the application to prevent XSS attacks. A library like `DOMPurify` should be used.
*   **Performance:** Large decks with thousands of cards and extensive media may be slow to parse on the client. The UI must provide clear feedback (e.g., a progress bar) during this process.
*   **Anki Schema Versions:** The database schema can differ slightly between Anki versions. The SQL queries must be written defensively to be compatible with both `collection.anki2` and `collection.anki21` formats where possible.
*   **Error Handling:** The parser must gracefully handle corrupted `.apkg` files, invalid database structures, or missing media.
