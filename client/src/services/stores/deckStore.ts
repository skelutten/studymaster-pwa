// Shim re-export for tests expecting '../../stores/deckStore' relative to services/anki/__tests__
// This bridges to the actual store at src/stores/deckStore.ts
export * from '../../stores/deckStore';