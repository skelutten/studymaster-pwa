### Plan to Remove "Map Deck" Functionality

**1. Identify and Remove UI Elements:**

*   **File:** `client/src/pages/DecksPage.tsx`
*   **Action:**
    *   Remove the "Map Deck" button:
        ```typescript
        <button
            onClick={() => setShowMapModal(true)}
            className="btn btn-success"
        >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map Deck
        </button>
        ```
    *   Remove the `showMapModal` state and its setter:
        ```typescript
        const [showMapModal, setShowMapModal] = useState(false)
        ```
    *   Remove the `selectedMapType` state and its setter:
        ```typescript
        const [selectedMapType, setSelectedMapType] = useState<string>('')
        ```
    *   Remove the `SVG Map Modal` JSX block:
        ```typescript
        {showMapModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              {/* ... content of the modal ... */}
            </div>
        )}
        ```

**2. Remove Associated Functions and Imports:**

*   **File:** `client/src/pages/DecksPage.tsx`
*   **Action:**
    *   Remove the `handleCreateMapDeck` function:
        ```typescript
        const handleCreateMapDeck = async () => {
            // ... function content ...
        }
        ```
    *   Remove the import for `generateMapDeck` and `availableMaps`:
        ```typescript
        import { generateMapDeck, availableMaps } from '../utils/svgMapGenerator'
        ```

**3. Remove Unused Utility File:**

*   **File:** `client/src/utils/svgMapGenerator.ts`
*   **Action:** Delete this file as it will no longer be used.

**4. Update `useDeckStore` (if necessary):**

*   **File:** `client/src/stores/deckStore.ts`
*   **Action:** Review `deckStore.ts` to ensure no direct dependencies on `generateMapDeck` or `availableMaps` exist within the store's logic. If any are found, remove them. (Based on the provided `DecksPage.tsx`, `createDeck` is used, but `generateMapDeck` is called *from* `DecksPage.tsx`, so `deckStore` itself might not need changes related to this specific functionality).

**5. Run Tests:**

*   **Action:** After making all changes, run the existing test suite to ensure no regressions are introduced. Specifically, check `client` tests.

This plan focuses on a clean removal of the "Map Deck" feature without affecting other parts of the application.
