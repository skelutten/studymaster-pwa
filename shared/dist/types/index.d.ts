export interface User {
    id: string;
    email: string;
    username: string;
    level: number;
    totalXp: number;
    coins: number;
    gems: number;
    createdAt: string;
    lastActive: string;
    preferences: UserPreferences;
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    soundEffects: boolean;
    dailyGoal: number;
    timezone: string;
}
export interface Deck {
    id: string;
    userId: string;
    title: string;
    description: string;
    cardCount: number;
    isPublic: boolean;
    settings: DeckSettings;
    advancedSettings?: AdvancedDeckSettings;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    category?: string;
}
export interface DeckSettings {
    newCardsPerDay: number;
    maxReviewsPerDay: number;
    easyBonus: number;
    intervalModifier: number;
    maximumInterval: number;
    minimumInterval: number;
}
export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'suspended' | 'buried';
export type ReviewCardType = 'young' | 'mature';
export interface Card {
    id: string;
    deckId: string;
    frontContent: string;
    backContent: string;
    cardType: CardType;
    mediaRefs: MediaReference[];
    easeFactor: number;
    intervalDays: number;
    nextReview: string;
    createdAt: string;
    reviewCount: number;
    lapseCount: number;
    state: CardState;
    queue: number;
    due: number;
    ivl: number;
    factor: number;
    reps: number;
    lapses: number;
    left: number;
    learningStep: number;
    graduationInterval: number;
    easyInterval: number;
    totalStudyTime: number;
    averageAnswerTime: number;
    flags: number;
    originalDue: number;
    originalDeck: string;
    xpAwarded: number;
    difficultyRating: number;
}
export interface AdvancedDeckSettings {
    newCards: {
        stepsMinutes: number[];
        orderNewCards: 'due' | 'random';
        newCardsPerDay: number;
        graduatingInterval: number;
        easyInterval: number;
        startingEase: number;
        buryRelated: boolean;
    };
    reviews: {
        maximumReviewsPerDay: number;
        easyBonus: number;
        intervalModifier: number;
        maximumInterval: number;
        hardInterval: number;
        newInterval: number;
        minimumInterval: number;
        leechThreshold: number;
        leechAction: 'suspend' | 'tag';
    };
    lapses: {
        stepsMinutes: number[];
        newInterval: number;
        minimumInterval: number;
        leechThreshold: number;
        leechAction: 'suspend' | 'tag';
    };
    general: {
        ignoreAnswerTimesLongerThan: number;
        showAnswerTimer: boolean;
        autoAdvance: boolean;
        buryRelated: boolean;
    };
    advanced: {
        maximumAnswerSeconds: number;
        showRemainingCardCount: boolean;
        showNextReviewTime: boolean;
        dayStartsAt: number;
        learnAheadLimit: number;
        timezoneOffset: number;
    };
}
export interface CardType {
    type: 'basic' | 'cloze' | 'multiple_choice' | 'image_occlusion' | 'audio' | 'svg_map';
    template?: string;
    options?: any;
}
export interface SvgMapCardOptions {
    mapId: string;
    countryId: string;
    countryName: string;
    svgPath: string;
}
export interface MediaReference {
    id: string;
    type: 'image' | 'audio' | 'video';
    url: string;
    filename: string;
    size: number;
}
export interface StudySession {
    id: string;
    userId: string;
    deckId: string;
    cardsStudied: number;
    correctAnswers: number;
    sessionDurationMs: number;
    xpEarned: number;
    startedAt: string;
    endedAt?: string;
}
export interface CardReview {
    id: string;
    cardId: string;
    sessionId: string;
    rating: ReviewRating;
    responseTimeMs: number;
    reviewedAt: string;
    wasCorrect: boolean;
}
export type ReviewRating = 1 | 2 | 3 | 4;
export interface EnhancedCardReview extends CardReview {
    timeTaken: number;
    previousState: CardState;
    newState: CardState;
    previousInterval: number;
    newInterval: number;
    easeFactor: number;
    learningStep?: number;
    isLapse: boolean;
    schedulingData: {
        algorithm: 'SM2' | 'SM2+' | 'ANKI';
        fuzzFactor: number;
        intervalModifier: number;
    };
}
export interface StudyQueue {
    deckId: string;
    newCards: Card[];
    learningCards: Card[];
    reviewCards: Card[];
    relearnCards: Card[];
    counts: {
        newCards: number;
        learningCards: number;
        reviewCards: number;
        youngReviewCards: number;
        matureReviewCards: number;
        relearnCards: number;
        totalDue: number;
    };
    limits: {
        newCardsRemaining: number;
        reviewsRemaining: number;
    };
    nextCardDue?: Date;
    estimatedStudyTime: number;
}
export interface LearningStep {
    stepNumber: number;
    intervalMinutes: number;
    isGraduating: boolean;
}
export interface SchedulingResult {
    card: Card;
    wasCorrect: boolean;
    previousState: CardState;
    newState: CardState;
    intervalChange: number;
    nextReviewDate: Date;
    debugInfo: {
        algorithm: string;
        calculatedInterval: number;
        appliedFuzz: number;
        finalInterval: number;
        easeFactorChange: number;
        reasoning: string;
    };
}
export interface DeckOptionsPreset {
    id: string;
    name: string;
    description: string;
    settings: AdvancedDeckSettings;
    isBuiltIn: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface DailyStudyLimits {
    deckId: string;
    date: string;
    newCardsStudied: number;
    reviewsCompleted: number;
    learningCardsCompleted: number;
    totalStudyTime: number;
    resetAt: string;
}
export interface CardMigrationData {
    cardId: string;
    migratedAt: string;
    oldFormat: {
        easeFactor: number;
        intervalDays: number;
        nextReview: string;
        reviewCount: number;
        lapseCount: number;
    };
    newFormat: {
        state: CardState;
        queue: number;
        due: number;
        ivl: number;
        factor: number;
        reps: number;
        lapses: number;
    };
    migrationNotes: string[];
}
export interface UserStreak {
    id: string;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string;
    freezeCount: number;
    createdAt: string;
}
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    requirements: AchievementRequirement[];
    xpReward: number;
    coinReward: number;
    isSecret: boolean;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
export type AchievementCategory = 'study_milestones' | 'accuracy' | 'streaks' | 'social' | 'challenges' | 'special';
export interface AchievementRequirement {
    type: string;
    value: number;
    operator: 'gte' | 'lte' | 'eq';
}
export interface UserAchievement {
    id: string;
    userId: string;
    achievementId: string;
    earnedAt: string;
    progressData?: any;
}
export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: ChallengeType;
    requirements: ChallengeRequirement[];
    rewards: ChallengeReward[];
    startDate: string;
    endDate: string;
    isActive: boolean;
    participantCount: number;
    difficulty?: ChallengeDifficulty;
    storyArc?: ChallengeStoryArc;
    milestones?: ChallengeMilestone[];
    communityGoal?: CommunityGoal;
    exclusiveRewards?: ExclusiveReward[];
}
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'community' | 'friend' | 'seasonal' | 'epic';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary';
export interface ChallengeStoryArc {
    id: string;
    title: string;
    description: string;
    theme: string;
    chapters: StoryChapter[];
    totalWeeks: number;
    currentWeek: number;
}
export interface StoryChapter {
    week: number;
    title: string;
    description: string;
    narrative: string;
    objectives: string[];
    unlockConditions: ChallengeRequirement[];
}
export interface ChallengeMilestone {
    id: string;
    title: string;
    description: string;
    targetProgress: number;
    rewards: ChallengeReward[];
    isCompleted: boolean;
    completedAt?: string;
}
export interface CommunityGoal {
    id: string;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    participantCount: number;
    rewards: ChallengeReward[];
    isGlobal: boolean;
}
export interface ExclusiveReward {
    id: string;
    type: 'title' | 'badge' | 'avatar' | 'theme' | 'emote' | 'border';
    name: string;
    description: string;
    rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
    isLimited: boolean;
    availableUntil?: string;
}
export interface ChallengeRequirement {
    type: string;
    target: number;
    description: string;
    category?: 'study' | 'accuracy' | 'streak' | 'social' | 'time' | 'deck';
    subType?: string;
    conditions?: RequirementCondition[];
}
export interface RequirementCondition {
    field: string;
    operator: 'gte' | 'lte' | 'eq' | 'between';
    value: number | string;
    secondValue?: number;
}
export interface ChallengeReward {
    type: 'xp' | 'coins' | 'gems' | 'badge' | 'title' | 'exclusive';
    amount?: number;
    itemId?: string;
    multiplier?: number;
    isRare?: boolean;
    description?: string;
}
export interface ChallengeParticipation {
    id: string;
    userId: string;
    challengeId: string;
    progress: Record<string, number>;
    completed: boolean;
    joinedAt: string;
    completedAt?: string;
    milestoneProgress: Record<string, boolean>;
    weeklyProgress: WeeklyProgress[];
    currentStreak: number;
    bestWeek: number;
}
export interface WeeklyProgress {
    week: number;
    startDate: string;
    endDate: string;
    progress: Record<string, number>;
    completed: boolean;
    completedAt?: string;
    storyUnlocked: boolean;
}
export interface LeaderboardEntry {
    userId: string;
    username: string;
    score: number;
    rank: number;
    change: number;
    avatar?: string;
    tier?: LeaderboardTier;
    badges?: string[];
    monthlyScore?: number;
    weeklyScore?: number;
}
export interface Leaderboard {
    id: string;
    type: LeaderboardType;
    period: LeaderboardPeriod;
    entries: LeaderboardEntry[];
    updatedAt: string;
    seasonId?: string;
    rewards?: LeaderboardRewards;
    tiers?: LeaderboardTier[];
}
export type LeaderboardType = 'xp' | 'streak' | 'accuracy' | 'cards_studied' | 'monthly_challenge' | 'community_contribution';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'all_time';
export interface LeaderboardTier {
    name: string;
    minRank: number;
    maxRank: number;
    color: string;
    rewards: ChallengeReward[];
}
export interface LeaderboardRewards {
    top1: ChallengeReward[];
    top3: ChallengeReward[];
    top10: ChallengeReward[];
    top100: ChallengeReward[];
    participation: ChallengeReward[];
}
export interface Friendship {
    id: string;
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: string;
}
export interface StudyGroup {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    memberIds: string[];
    deckIds: string[];
    isPrivate: boolean;
    createdAt: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface SpacedRepetitionData {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: Date;
}
export interface StudyStats {
    totalCards: number;
    newCards: number;
    reviewCards: number;
    learnCards: number;
    averageEase: number;
    retentionRate: number;
    studyTime: number;
    streak: number;
}
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    createdAt: string;
}
export type NotificationType = 'achievement_earned' | 'challenge_completed' | 'streak_reminder' | 'friend_request' | 'study_reminder' | 'deck_shared' | 'monthly_challenge_started' | 'story_chapter_unlocked' | 'milestone_reached' | 'community_goal_achieved' | 'leaderboard_position_changed';
export * from './enhanced-types';
export interface Card {
    difficulty?: number;
    stability?: number;
    retrievability?: number;
    fsrsParameters?: number[];
    performanceHistory?: any[];
    averageResponseTime?: number;
    cognitiveLoadIndex?: number;
    confidenceLevel?: 'building' | 'optimal' | 'struggling';
    conceptSimilarity?: string[];
    lastClusterReview?: string;
    contextualDifficulty?: Record<string, any>;
    stabilityTrend?: 'increasing' | 'decreasing' | 'stable';
    retrievabilityHistory?: number[];
    optimalInterval?: number;
}
export declare const CardStateUtils: {
    /**
     * Determine if a review card is young (interval < 21 days) or mature (interval >= 21 days)
     */
    getReviewCardType(card: Card): ReviewCardType;
    /**
     * Get human-readable card state description
     */
    getCardStateDescription(card: Card): string;
    /**
     * Get card state color for UI display
     */
    getCardStateColor(card: Card): string;
    /**
     * Check if a card is due for study
     */
    isCardDue(card: Card, currentDate?: Date): boolean;
    /**
     * Get the next review date for a card
     */
    getNextReviewDate(card: Card): Date | null;
    /**
     * Calculate days overdue for a review card
     */
    getDaysOverdue(card: Card, currentDate?: Date): number;
    /**
     * Get study priority for card ordering
     */
    getStudyPriority(card: Card): number;
};
//# sourceMappingURL=index.d.ts.map