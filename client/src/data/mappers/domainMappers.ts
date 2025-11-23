/**
 * Domain <-> Repository mappers
 * Map shared domain types (Deck/Card) to repository DTOs and vice versa.
 */

import type { Deck, Card } from '@shared/types';
import type { NewDeck, NewCard, UpdateDeck } from '../repositories';

function uuid(): string {
  try {
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto && typeof anyCrypto.randomUUID === 'function') {
      return anyCrypto.randomUUID();
    }
  } catch {}
  // Fallback
  return 'id_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Build repository NewDeck payload from domain Deck inputs (without id/timestamps).
 */
export function buildNewDeckFromDomain(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): NewDeck {
  return {
    deckId: uuid(),
    name: deck.title,
    description: deck.description,
    meta: {
      userId: deck.userId,
      tags: deck.tags ?? [],
      category: deck.category ?? null,
      settings: deck.settings ?? null,
      advancedSettings: deck.advancedSettings ?? null,
      isPublic: deck.isPublic ?? false,
    },
  };
}

/**
 * Build repository NewCard payload from a domain Card-like shape.
 * Note: media hashing/dedup is handled elsewhere; we only propagate known references.
 */
export function buildNewCardFromDomain(input: {
  deckId: string;
  frontContent: string;
  backContent: string;
  // Optional hints to carry over to repo layer:
  mediaRefs?: Card['mediaRefs'];
  state?: Card['state'];
  easeFactor?: number;
  intervalDays?: number;
}): NewCard {
  const allowed = new Set(['new', 'learning', 'review', 'relearning'] as const);
  const normalizedState =
    allowed.has(input.state as any)
      ? (input.state as 'new' | 'learning' | 'review' | 'relearning')
      : 'new';

  return {
    cardId: uuid(),
    deckId: input.deckId,
    fields: {
      front: input.frontContent,
      back: input.backContent,
    },
    // If we don't have media hashes yet, we leave refs empty; upstream pipeline can attach later.
    mediaRefs: (input.mediaRefs ?? []).map((m) => m.id).filter(Boolean),
    state: normalizedState,
    ease: input.easeFactor ?? 250,
    interval: input.intervalDays ?? 0,
    dueAt: null,
    lapses: 0,
  };
}

/**
 * Map domain Deck partial updates to repository UpdateDeck.
 */
export function mapDeckUpdatesToRepo(updates: Partial<Deck>): UpdateDeck {
  const result: UpdateDeck = {};
  if (typeof updates.title === 'string') result.name = updates.title;
  if (typeof updates.description === 'string') result.description = updates.description;
  const meta: Record<string, unknown> = {};
  if (updates.tags) meta.tags = updates.tags;
  if (updates.category) meta.category = updates.category;
  if (updates.settings) meta.settings = updates.settings;
  if (updates.advancedSettings) meta.advancedSettings = updates.advancedSettings;
  if (Object.keys(meta).length) result.meta = meta;
  return result;
}