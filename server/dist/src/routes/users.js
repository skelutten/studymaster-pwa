"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/profile', async (req, res) => {
    const user = {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
        level: 8,
        xp: 2400,
        streak: 15,
        stats: {
            cardsStudied: 1247,
            decksCreated: 8,
            totalXP: 2400,
            currentStreak: 15
        }
    };
    res.json({
        success: true,
        data: user
    });
});
router.put('/profile', async (req, res) => {
    const { name, email } = req.body;
    res.json({
        success: true,
        data: {
            id: '1',
            name,
            email,
            level: 8,
            xp: 2400,
            streak: 15
        }
    });
});
exports.default = router;
//# sourceMappingURL=users.js.map