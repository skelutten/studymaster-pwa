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
    const leaderboardData = {
        global: [
            {
                userId: 'user1',
                username: 'StudyMaster',
                avatar: undefined,
                score: 5420,
                rank: 1,
                change: 0
            },
            {
                userId: 'user2',
                username: 'FlashcardPro',
                avatar: undefined,
                score: 4890,
                rank: 2,
                change: 1
            },
            {
                userId: 'user3',
                username: 'MemoryChamp',
                avatar: undefined,
                score: 4250,
                rank: 3,
                change: -1
            }
        ],
        friends: [
            {
                userId: 'friend1',
                username: 'StudyBuddy',
                avatar: undefined,
                score: 3200,
                rank: 1,
                change: 0
            }
        ],
        weekly: [
            {
                userId: 'user1',
                username: 'StudyMaster',
                avatar: undefined,
                score: 890,
                rank: 1,
                change: 2
            }
        ],
        monthly: [
            {
                userId: 'user1',
                username: 'StudyMaster',
                avatar: undefined,
                score: 3200,
                rank: 1,
                change: 0
            }
        ]
    };
    res.json({
        success: true,
        data: leaderboardData
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