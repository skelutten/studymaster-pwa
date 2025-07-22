"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const decks = [
        {
            id: '1',
            name: 'Spanish Vocabulary',
            description: 'Essential Spanish words and phrases',
            cardCount: 150,
            masteredCount: 128,
            createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
            id: '2',
            name: 'Math Formulas',
            description: 'Important mathematical formulas',
            cardCount: 75,
            masteredCount: 47,
            createdAt: '2024-01-02T00:00:00.000Z'
        },
        {
            id: '3',
            name: 'History Dates',
            description: 'Key historical dates and events',
            cardCount: 200,
            masteredCount: 182,
            createdAt: '2024-01-03T00:00:00.000Z'
        }
    ];
    res.json({
        success: true,
        data: decks
    });
});
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const deck = {
        id: Date.now().toString(),
        name,
        description,
        cardCount: 0,
        masteredCount: 0,
        createdAt: new Date().toISOString()
    };
    res.status(201).json({
        success: true,
        data: deck
    });
});
exports.default = router;
//# sourceMappingURL=decks.js.map