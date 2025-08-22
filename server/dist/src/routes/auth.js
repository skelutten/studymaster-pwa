"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const user = {
            id: Date.now().toString(),
            email,
            name,
            level: 1,
            xp: 0,
            streak: 0,
            createdAt: new Date().toISOString()
        };
        res.status(201).json({
            success: true,
            data: {
                user,
                token: 'mock-jwt-token-' + user.id
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = {
            id: '1',
            email,
            name: 'Demo User',
            level: 8,
            xp: 2400,
            streak: 15,
            createdAt: '2024-01-01T00:00:00.000Z'
        };
        res.json({
            success: true,
            data: {
                user,
                token: 'mock-jwt-token-' + user.id
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});
router.post('/logout', async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
router.get('/me', async (req, res) => {
    const user = {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
        level: 8,
        xp: 2400,
        streak: 15,
        createdAt: '2024-01-01T00:00:00.000Z'
    };
    res.json({
        success: true,
        data: user
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map