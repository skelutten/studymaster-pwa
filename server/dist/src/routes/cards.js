"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/:deckId', async (req, res) => {
    const { deckId } = req.params;
    const cards = [
        {
            id: '1',
            deckId,
            front: 'Hola',
            back: 'Hello',
            difficulty: 1,
            nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reviewCount: 5,
            correctCount: 4
        },
        {
            id: '2',
            deckId,
            front: 'Gracias',
            back: 'Thank you',
            difficulty: 2,
            nextReview: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            reviewCount: 3,
            correctCount: 3
        }
    ];
    res.json({
        success: true,
        data: cards
    });
});
router.post('/', async (req, res) => {
    const { deckId, front, back } = req.body;
    const card = {
        id: Date.now().toString(),
        deckId,
        front,
        back,
        difficulty: 1,
        nextReview: new Date().toISOString(),
        reviewCount: 0,
        correctCount: 0
    };
    res.status(201).json({
        success: true,
        data: card
    });
});
exports.default = router;
//# sourceMappingURL=cards.js.map