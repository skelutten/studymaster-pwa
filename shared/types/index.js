"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardStateUtils = void 0;
exports.CardStateUtils = {
    getReviewCardType(card) {
        if (card.state !== 'review') {
            throw new Error('Card must be in review state to determine maturity');
        }
        return card.ivl < 21 ? 'young' : 'mature';
    },
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
    getCardStateColor(card) {
        switch (card.state) {
            case 'new':
                return '#3b82f6';
            case 'learning':
                return '#f59e0b';
            case 'review':
                return card.ivl < 21 ? '#10b981' : '#059669';
            case 'relearning':
                return '#ef4444';
            case 'suspended':
                return '#6b7280';
            case 'buried':
                return '#9ca3af';
            default:
                return '#374151';
        }
    },
    isCardDue(card, currentDate = new Date()) {
        const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000));
        switch (card.state) {
            case 'new':
                return true;
            case 'learning':
            case 'relearning':
                const dueTime = currentDate.getTime() + (card.left * 60 * 1000);
                return dueTime <= currentDate.getTime();
            case 'review':
                return card.due <= currentDay;
            case 'suspended':
            case 'buried':
                return false;
            default:
                return false;
        }
    },
    getNextReviewDate(card) {
        switch (card.state) {
            case 'new':
                return null;
            case 'learning':
            case 'relearning':
                return new Date(Date.now() + card.left * 60 * 1000);
            case 'review':
                return new Date(card.due * 24 * 60 * 60 * 1000);
            case 'suspended':
            case 'buried':
                return null;
            default:
                return null;
        }
    },
    getDaysOverdue(card, currentDate = new Date()) {
        if (card.state !== 'review') {
            return 0;
        }
        const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000));
        return Math.max(0, currentDay - card.due);
    },
    getStudyPriority(card) {
        switch (card.state) {
            case 'learning':
            case 'relearning':
                return 1;
            case 'review':
                return 2;
            case 'new':
                return 3;
            case 'suspended':
            case 'buried':
                return 999;
            default:
                return 999;
        }
    }
};
//# sourceMappingURL=index.js.map