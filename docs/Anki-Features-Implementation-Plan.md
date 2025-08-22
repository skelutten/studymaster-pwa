# Anki Features Implementation Plan

## Overview

This document outlines a comprehensive plan to implement advanced Anki features in StudyMaster, focusing on the sophisticated spaced repetition algorithm, learning steps, deck options, and card scheduling that make Anki so effective for long-term retention.

## Current System Analysis

### What We Have
- Basic SM-2 algorithm implementation
- Simple 4-button rating system (Again, Hard, Good, Easy)
- Basic card scheduling with ease factor and intervals
- Deck settings with basic parameters
- Study session tracking

### What We're Missing
- Learning steps for new cards
- Relearning steps for failed cards
- Graduated intervals
- Advanced deck options
- Card states (New, Learning, Review, Relearning)
- Sophisticated scheduling algorithm
- Deck-specific learning parameters

## Anki Features to Implement

### 1. Card States and Learning Steps

#### Card States
```typescript
export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface Card {
  // ... existing fields
  state: CardState
  learningStep: number // Current step in learning/relearning sequence
  graduationInterval: number // Days until card graduates to review
  easyInterval: number // Days if marked as easy during learning
  lapseInterval: number // Interval after lapse
  queue: number // Scheduling queue (0=new, 1=learning, 2=review, 3=day learning)
  due: number // Due date as days since epoch
  ivl: number // Current interval in days
  factor: number // Ease factor (2500 = 250%)
  reps: number // Number of reviews
  lapses: number // Number of lapses
  left: number // Reviews left today (for learning cards)
}
```

#### Learning Steps
- **New Cards**: Follow learning steps (e.g., 1m, 10m, 1d)
- **Learning Cards**: Progress through steps or restart on failure
- **Graduating**: Move to review queue after completing all steps
- **Relearning**: Failed review cards enter relearning steps

### 2. Advanced Deck Options

```typescript
export interface AdvancedDeckSettings {
  // New Cards
  newCards: {
    stepsMinutes: number[] // Learning steps in minutes [1, 10]
    orderNewCards: 'due' | 'random' // Order of new cards
    newCardsPerDay: number // Maximum new cards per day
    graduatingInterval: number // Days for graduating interval
    easyInterval: number // Days for easy interval
    startingEase: number // Starting ease factor (2500 = 250%)
    buryRelated: boolean // Bury related new cards
  }
  
  // Reviews
  reviews: {
    maximumReviewsPerDay: number // Maximum reviews per day
    easyBonus: number // Easy bonus multiplier (1.3 = 130%)
    intervalModifier: number // Global interval modifier (1.0 = 100%)
    maximumInterval: number // Maximum interval in days
    hardInterval: number // Hard interval multiplier (1.2 = 120%)
    newInterval: number // New interval after lapse (0.0 = 0%)
    minimumInterval: number // Minimum interval in days
    leechThreshold: number // Lapses before card becomes leech
    leechAction: 'suspend' | 'tag' // Action for leeches
  }
  
  // Lapses
  lapses: {
    stepsMinutes: number[] // Relearning steps [10]
    newInterval: number // New interval percentage (0.0 = 0%)
    minimumInterval: number // Minimum interval after lapse
    leechThreshold: number // Lapses to become leech
    leechAction: 'suspend' | 'tag' // Leech action
  }
  
  // General
  general: {
    ignoreAnswerTimesLongerThan: number // Seconds
    showAnswerTimer: boolean
    autoAdvance: boolean
    buryRelated: boolean
  }
  
  // Advanced
  advanced: {
    maximumAnswerSeconds: number
    showRemainingCardCount: boolean
    showNextReviewTime: boolean
    dayStartsAt: number // Hour when day starts (4 = 4 AM)
    learnAheadLimit: number // Minutes to learn ahead
    timezoneOffset: number
  }
}
```

### 3. Sophisticated Scheduling Algorithm

#### Learning Phase Algorithm
```typescript
interface LearningScheduler {
  // New card answered
  scheduleNewCard(card: Card, rating: ReviewRating, settings: AdvancedDeckSettings): Card
  
  // Learning card answered
  scheduleLearningCard(card: Card, rating: ReviewRating, settings: AdvancedDeckSettings): Card
  
  // Graduate card to review
  graduateCard(card: Card, settings: AdvancedDeckSettings): Card
}
```

#### Review Phase Algorithm
```typescript
interface ReviewScheduler {
  // Review card answered
  scheduleReviewCard(card: Card, rating: ReviewRating, settings: AdvancedDeckSettings): Card
  
  // Calculate next interval based on SM-2+ algorithm
  calculateInterval(card: Card, rating: ReviewRating, settings: AdvancedDeckSettings): number
  
  // Handle lapses and relearning
  handleLapse(card: Card, settings: AdvancedDeckSettings): Card
}
```

### 4. Queue Management System

```typescript
interface QueueManager {
  // Get cards due for study
  getDueCards(deckId: string, settings: AdvancedDeckSettings): {
    newCards: Card[]
    learningCards: Card[]
    reviewCards: Card[]
  }
  
  // Update daily limits
  updateDailyLimits(deckId: string): void
  
  // Handle day rollover
  handleDayRollover(): void
  
  // Bury related cards
  buryRelatedCards(card: Card): void
}
```

## Implementation Phases

### Phase 1: Core Algorithm Enhancement (Week 1-2)

#### 1.1 Update Type Definitions
- [ ] Extend Card interface with new fields
- [ ] Create AdvancedDeckSettings interface
- [ ] Add CardState enum and related types
- [ ] Update ReviewRating to include timing data

#### 1.2 Learning Steps Implementation
- [ ] Create LearningStepsManager class
- [ ] Implement new card learning flow
- [ ] Add learning step progression logic
- [ ] Handle graduation to review queue

#### 1.3 Basic Queue System
- [ ] Implement card state management
- [ ] Create simple queue sorting
- [ ] Add due date calculations
- [ ] Basic daily limit tracking

### Phase 2: Advanced Scheduling (Week 3-4)

#### 2.1 SM-2+ Algorithm
- [ ] Implement enhanced SM-2 algorithm
- [ ] Add interval modifiers and bonuses
- [ ] Handle ease factor adjustments
- [ ] Implement hard/easy interval calculations

#### 2.2 Relearning System
- [ ] Create relearning steps for failed cards
- [ ] Implement lapse handling
- [ ] Add leech detection and actions
- [ ] Handle minimum intervals after lapses

#### 2.3 Advanced Deck Options
- [ ] Create deck options UI components
- [ ] Implement all Anki deck settings
- [ ] Add preset configurations
- [ ] Settings validation and migration

### Phase 3: UI and UX Improvements (Week 5-6)

#### 3.1 Study Interface Enhancements
- [ ] Show card state indicators
- [ ] Display learning progress
- [ ] Add answer timing
- [ ] Show remaining cards by type

#### 3.2 Deck Management
- [ ] Advanced deck options interface
- [ ] Learning steps configuration
- [ ] Preset management
- [ ] Import/export settings

#### 3.3 Statistics and Analytics
- [ ] Learning curve visualization
- [ ] Retention rate analysis
- [ ] Time-based statistics
- [ ] Card maturity tracking

### Phase 4: Advanced Features (Week 7-8)

#### 4.1 Intelligent Scheduling
- [ ] Optimal review timing
- [ ] Load balancing across days
- [ ] Vacation/break handling
- [ ] Adaptive difficulty

#### 4.2 Performance Optimization
- [ ] Efficient queue management
- [ ] Background processing
- [ ] Memory optimization
- [ ] Database indexing

#### 4.3 Integration Features
- [ ] Anki deck import with full fidelity
- [ ] Export to Anki format
- [ ] Sync with existing Anki collections
- [ ] Migration tools

## Technical Implementation Details

### 1. Enhanced Card Model

```typescript
// New card fields to add
interface EnhancedCard extends Card {
  // Scheduling
  state: CardState
  queue: number
  due: number // Days since epoch
  ivl: number // Interval in days
  factor: number // Ease factor (2500 = 250%)
  reps: number // Total reviews
  lapses: number // Number of lapses
  left: number // Reviews left today
  
  // Learning
  learningStep: number
  graduationInterval: number
  easyInterval: number
  
  // Timing
  totalStudyTime: number
  averageAnswerTime: number
  
  // Metadata
  flags: number // Bitfield for various flags
  originalDue: number // Original due date before preview
  originalDeck: string // Original deck ID
  
  // Gamification integration
  xpAwarded: number
  difficultyRating: number
}
```

### 2. Scheduling Service

```typescript
class AnkiSchedulingService {
  // Core scheduling methods
  answerCard(card: Card, rating: ReviewRating, timeTaken: number): Card
  
  // Learning phase
  private handleNewCard(card: Card, rating: ReviewRating): Card
  private handleLearningCard(card: Card, rating: ReviewRating): Card
  private graduateCard(card: Card): Card
  
  // Review phase
  private handleReviewCard(card: Card, rating: ReviewRating): Card
  private calculateNextInterval(card: Card, rating: ReviewRating): number
  private adjustEaseFactor(card: Card, rating: ReviewRating): number
  
  // Lapse handling
  private handleLapse(card: Card): Card
  private enterRelearning(card: Card): Card
  
  // Queue management
  getDueCards(deckId: string, limit?: number): Card[]
  updateDailyStats(deckId: string): void
  
  // Utility methods
  private daysSinceEpoch(date: Date): number
  private epochToDate(days: number): Date
  private applyFuzz(interval: number): number
}
```

### 3. Deck Options Manager

```typescript
class DeckOptionsManager {
  // Settings management
  getSettings(deckId: string): AdvancedDeckSettings
  updateSettings(deckId: string, settings: Partial<AdvancedDeckSettings>): void
  
  // Presets
  createPreset(name: string, settings: AdvancedDeckSettings): void
  applyPreset(deckId: string, presetId: string): void
  
  // Validation
  validateSettings(settings: AdvancedDeckSettings): ValidationResult
  
  // Migration
  migrateFromBasicSettings(oldSettings: DeckSettings): AdvancedDeckSettings
}
```

### 4. Queue Management

```typescript
class StudyQueueManager {
  // Queue building
  buildStudyQueue(deckId: string): StudyQueue
  
  // Card selection
  getNextCard(deckId: string): Card | null
  
  // Limits and counts
  getRemainingCounts(deckId: string): {
    newCards: number
    learningCards: number
    reviewCards: number
  }
  
  // Day management
  handleDayRollover(): void
  resetDailyLimits(): void
  
  // Burying and suspension
  buryCard(cardId: string, until?: Date): void
  suspendCard(cardId: string): void
  unsuspendCard(cardId: string): void
}
```

## Database Schema Updates

### 1. Cards Table Enhancements
```sql
ALTER TABLE cards ADD COLUMN state VARCHAR(20) DEFAULT 'new';
ALTER TABLE cards ADD COLUMN queue INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN due INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN ivl INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN factor INTEGER DEFAULT 2500;
ALTER TABLE cards ADD COLUMN reps INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN lapses INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN left INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN learning_step INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN graduation_interval INTEGER DEFAULT 1;
ALTER TABLE cards ADD COLUMN easy_interval INTEGER DEFAULT 4;
ALTER TABLE cards ADD COLUMN total_study_time INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN average_answer_time INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN flags INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN original_due INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN original_deck VARCHAR(255);

-- Indexes for performance
CREATE INDEX idx_cards_state ON cards(state);
CREATE INDEX idx_cards_queue ON cards(queue);
CREATE INDEX idx_cards_due ON cards(due);
CREATE INDEX idx_cards_deck_state ON cards(deck_id, state);
```

### 2. Deck Settings Table
```sql
CREATE TABLE deck_options (
  id VARCHAR(255) PRIMARY KEY,
  deck_id VARCHAR(255) REFERENCES decks(id),
  name VARCHAR(255) NOT NULL,
  settings JSONB NOT NULL,
  is_preset BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deck_options_deck_id ON deck_options(deck_id);
CREATE INDEX idx_deck_options_preset ON deck_options(is_preset);
```

### 3. Study Statistics Table
```sql
CREATE TABLE study_statistics (
  id VARCHAR(255) PRIMARY KEY,
  deck_id VARCHAR(255) REFERENCES decks(id),
  date DATE NOT NULL,
  new_cards_studied INTEGER DEFAULT 0,
  review_cards_studied INTEGER DEFAULT 0,
  learning_cards_studied INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0,
  average_answer_time INTEGER DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_stats_deck_date ON study_statistics(deck_id, date);
```

## Testing Strategy

### 1. Unit Tests
- [ ] Scheduling algorithm accuracy
- [ ] Learning steps progression
- [ ] Interval calculations
- [ ] Edge case handling

### 2. Integration Tests
- [ ] Full study session flow
- [ ] Queue management
- [ ] Settings persistence
- [ ] Data migration

### 3. Performance Tests
- [ ] Large deck handling
- [ ] Queue building speed
- [ ] Memory usage
- [ ] Database query optimization

### 4. User Acceptance Tests
- [ ] Anki user migration
- [ ] Learning effectiveness
- [ ] UI/UX validation
- [ ] Feature parity verification

## Migration Strategy

### 1. Data Migration
- [ ] Convert existing cards to new format
- [ ] Migrate deck settings
- [ ] Preserve study history
- [ ] Handle edge cases

### 2. Gradual Rollout
- [ ] Feature flags for new algorithm
- [ ] A/B testing with existing users
- [ ] Fallback to old system
- [ ] Performance monitoring

### 3. User Communication
- [ ] Migration guide documentation
- [ ] Video tutorials
- [ ] FAQ and troubleshooting
- [ ] Community feedback collection

## Success Metrics

### 1. Learning Effectiveness
- Retention rate improvement
- Study time optimization
- User engagement increase
- Long-term memory formation

### 2. User Adoption
- Migration completion rate
- Feature usage statistics
- User satisfaction scores
- Community feedback

### 3. Technical Performance
- Algorithm accuracy
- System performance
- Error rates
- Data integrity

## Conclusion

This implementation plan will transform StudyMaster into a sophisticated spaced repetition system that rivals Anki's effectiveness while maintaining our gamification advantages. The phased approach ensures we can deliver value incrementally while building a robust foundation for advanced features.

The key to success will be maintaining backward compatibility, ensuring smooth migration, and preserving the engaging gamification elements that differentiate StudyMaster from traditional flashcard applications.