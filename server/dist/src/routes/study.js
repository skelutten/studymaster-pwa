"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/:deckId/next', async (req, res) => {
    const { deckId } = req.params;
    const card = {
        id: '1',
        deckId,
        front: 'Hola',
        back: 'Hello',
        difficulty: 1,
        nextReview: new Date().toISOString(),
        reviewCount: 5,
        correctCount: 4
    };
    res.json({
        success: true,
        data: card
    });
});
router.post('/review', async (req, res) => {
    const { cardId, correct, difficulty } = req.body;
    const nextReview = new Date();
    if (correct) {
        nextReview.setDate(nextReview.getDate() + Math.pow(2, difficulty));
    }
    else {
        nextReview.setHours(nextReview.getHours() + 1);
    }
    const updatedCard = {
        id: cardId,
        nextReview: nextReview.toISOString(),
        difficulty: correct ? Math.min(difficulty + 1, 5) : 1,
        reviewCount: 1,
        correctCount: correct ? 1 : 0
    };
    res.json({
        success: true,
        data: updatedCard
    });
});
router.get('/stats/:userId', async (req, res) => {
    const stats = {
        totalCards: 425,
        masteredCards: 357,
        cardsToReview: 23,
        streak: 15,
        xp: 2450,
        level: 8
    };
    res.json({
        success: true,
        data: stats
    });
});
exports.default = router;
//# sourceMappingURL=study.js.map