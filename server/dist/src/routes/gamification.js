"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/achievements/:userId', async (req, res) => {
    const achievements = [
        {
            id: '1',
            name: 'First Steps',
            description: 'Complete your first study session',
            icon: '🎯',
            unlocked: true,
            unlockedAt: '2024-01-01T00:00:00.000Z'
        },
        {
            id: '2',
            name: 'Week Warrior',
            description: 'Study for 7 consecutive days',
            icon: '🔥',
            unlocked: true,
            unlockedAt: '2024-01-08T00:00:00.000Z'
        },
        {
            id: '3',
            name: 'Master Scholar',
            description: 'Master 100 cards',
            icon: '🏆',
            unlocked: false,
            unlockedAt: null
        }
    ];
    res.json({
        success: true,
        data: achievements
    });
});
router.get('/leaderboard', async (req, res) => {
    const leaderboard = [
        {
            rank: 1,
            username: 'StudyMaster',
            xp: 5420,
            level: 12,
            streak: 45
        },
        {
            rank: 2,
            username: 'FlashcardPro',
            xp: 4890,
            level: 11,
            streak: 32
        },
        {
            rank: 3,
            username: 'MemoryChamp',
            xp: 4250,
            level: 10,
            streak: 28
        }
    ];
    res.json({
        success: true,
        data: leaderboard
    });
});
router.post('/xp', async (req, res) => {
    const { userId, action, amount } = req.body;
    const xpGained = {
        action,
        amount,
        totalXp: 2450 + amount,
        levelUp: false,
        newLevel: 8
    };
    res.json({
        success: true,
        data: xpGained
    });
});
exports.default = router;
//# sourceMappingURL=gamification.js.map