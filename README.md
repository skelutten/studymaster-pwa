# StudyMaster PWA

A modern Progressive Web App for studying, combining features from Anki and Quizlet with gamification. StudyMaster is client-only and works fully offline.

## Features

-   **Spaced Repetition:** Advanced SM-2/FSRS style scheduling.
-   **Multiple Card Types:** Basic, cloze, multiple choice, image occlusion, and audio.
-   **Offline-first:** Works entirely offline using IndexedDB and the Origin Private File System (OPFS).
-   **Gamification:** XP, achievements, streaks, and challenges.
-   **PWA:** Installable and available offline.

## Prerequisites

-   Node.js 18+
-   npm 9+

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd studymaster-pwa
    ```

2.  **Install dependencies:**
    ```bash
    npm run install:all
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Access the application:**
    -   Client: `http://localhost:3000`

## Development

For detailed development guides, including testing, linting, and environment configuration, refer to the `docs/development/README.md` and `AGENTS.md` files.

## Documentation

For comprehensive documentation, including deployment and contributing guidelines, see the [docs/](docs/) directory.

## Contributing

Contributions are welcome. Please see our [Contributing Guide](docs/contributing/README.md).

## License

This project is licensed under the MIT License.