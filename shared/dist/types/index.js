"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardStateUtils = void 0;
// Enhanced types from UAMS v3.0
__exportStar(require("./enhanced-types"), exports);
// Utility functions for Anki-style card state management
exports.CardStateUtils = {
    /**
     * Determine if a review card is young (interval < 21 days) or mature (interval >= 21 days)
     */
    getReviewCardType(card) {
        if (card.state !== 'review') {
            throw new Error('Card must be in review state to determine maturity');
        }
        return card.ivl < 21 ? 'young' : 'mature';
    },
    /**
     * Get human-readable card state description
     */
    getCardStateDescription(card) {
        switch (card.state) {
            case 'new':
                return 'New - Never studied before';
            case 'learning':
                return 'Learning - Recently seen, still being learned';
            case 'review':
                const maturity = card.ivl < 21 ? 'Young' : 'Mature';
                return `Review (${maturity}) - Finished learning, scheduled for review`;
            case 'relearning':
                return 'Relearning - Failed in review, being relearned';
            case 'suspended':
                return 'Suspended - Manually suspended from study';
            case 'buried':
                return 'Buried - Hidden until next day';
            default:
                return 'Unknown state';
        }
    },
    /**
     * Get card state color for UI display
     */
    getCardStateColor(card) {
        switch (card.state) {
            case 'new':
                return '#3b82f6'; // Blue
            case 'learning':
                return '#f59e0b'; // Amber
            case 'review':
                return card.ivl < 21 ? '#10b981' : '#059669'; // Green (lighter for young, darker for mature)
            case 'relearning':
                return '#ef4444'; // Red
            case 'suspended':
                return '#6b7280'; // Gray
            case 'buried':
                return '#9ca3af'; // Light gray
            default:
                return '#374151'; // Dark gray
        }
    },
    /**
     * Check if a card is due for study
     */
    isCardDue(card, currentDate = new Date()) {
        const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000));
        switch (card.state) {
            case 'new':
                return true; // New cards are always available (subject to daily limits)
            case 'learning':
            case 'relearning':
                // Learning cards use minutes, check if due time has passed
                const dueTime = currentDate.getTime() + (card.left * 60 * 1000);
                return dueTime <= currentDate.getTime();
            case 'review':
                return card.due <= currentDay;
            case 'suspended':
            case 'buried':
                return false; // These cards are not available for study
            default:
                return false;
        }
    },
    /**
     * Get the next review date for a card
     */
    getNextReviewDate(card) {
        switch (card.state) {
            case 'new':
                return null; // New cards don't have a scheduled review
            case 'learning':
            case 'relearning':
                // Learning cards are due in 'left' minutes
                return new Date(Date.now() + card.left * 60 * 1000);
            case 'review':
                // Review cards use days since epoch
                return new Date(card.due * 24 * 60 * 60 * 1000);
            case 'suspended':
            case 'buried':
                return null; // These cards have no scheduled review
            default:
                return null;
        }
    },
    /**
     * Calculate days overdue for a review card
     */
    getDaysOverdue(card, currentDate = new Date()) {
        if (card.state !== 'review') {
            return 0;
        }
        const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000));
        return Math.max(0, currentDay - card.due);
    },
    /**
     * Get study priority for card ordering
     */
    getStudyPriority(card) {
        switch (card.state) {
            case 'learning':
            case 'relearning':
                return 1; // Highest priority
            case 'review':
                return 2; // Medium priority
            case 'new':
                return 3; // Lower priority
            case 'suspended':
            case 'buried':
                return 999; // Should not be studied
            default:
                return 999;
        }
    }
};
//# sourceMappingURL=index.js.map