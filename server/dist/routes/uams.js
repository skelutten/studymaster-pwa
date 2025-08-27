"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const unifiedFSRSEngine_1 = require("../services/fsrs/unifiedFSRSEngine");
const unifiedMomentumManager_1 = require("../services/momentum/unifiedMomentumManager");
const unifiedCardSelector_1 = require("../services/selection/unifiedCardSelector");
const optimizedQueries_1 = require("../services/database/optimizedQueries");
const featureFlagService_1 = require("../services/featureFlagService");
const uamsMigrationService_1 = require("../services/uamsMigrationService");
const router = (0, express_1.Router)();
const fsrsEngine = new unifiedFSRSEngine_1.UnifiedFSRSEngine();
const momentumManager = new unifiedMomentumManager_1.UnifiedMomentumManager();
const cardSelector = new unifiedCardSelector_1.UnifiedCardSelector();
const dbService = {};
const optimizedQueries = new optimizedQueries_1.OptimizedQueries(dbService);
const featureFlagService = new featureFlagService_1.FeatureFlagService();
const uamsMigrationService = new uamsMigrationService_1.UAMSMigrationService(dbService);
router.post('/session/initialize', async (req, res) => {
    try {
        const { userId, deckId } = req.body;
        const availableCards = [];
        const userProfile = { id: userId };
        const initialState = {
            userId,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionMomentumScore: 0.5,
            momentumTrend: 'stable',
            sessionFatigueIndex: 0.0,
            cognitiveLoadCapacity: 1.0,
            attentionSpanRemaining: 1.0,
            reviewQueue: [],
            lookaheadBuffer: [],
            emergencyBuffer: [],
            challengeReserve: [],
            sessionStartTime: new Date().toISOString(),
            contextualFactors: {
                timeOfDay: new Date().toISOString(),
                dayOfWeek: new Date().toLocaleDateString('en', { weekday: 'long' }),
                sessionDuration: 0,
                studyStreak: 1,
                environmentalFactors: { device: 'desktop', networkQuality: 'excellent' },
                lastSessionQuality: 0.7
            },
            adaptationHistory: [],
            explanationLog: [],
            flowStateMetrics: {
                challengeSkillBalance: 0.5,
                engagementLevel: 0.5,
                satisfactionPrediction: 0.7,
                momentumMaintenance: true
            }
        };
        if (availableCards.length === 0) {
            for (let i = 0; i < 10; i++) {
                availableCards.push({
                    id: `dummy-card-${i}`,
                    deckId: deckId,
                    frontContent: `Front ${i}`,
                    backContent: `Back ${i}`,
                    cardType: { type: 'basic' },
                    mediaRefs: [],
                    easeFactor: 2.5,
                    intervalDays: 0,
                    nextReview: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    reviewCount: 0,
                    lapseCount: 0,
                    lastReviewed: new Date().toISOString(),
                    difficulty: Math.floor(Math.random() * 10) + 1,
                    stability: Math.random() * 10 + 1,
                    retrievability: Math.random(),
                    fsrsParameters: [],
                    performanceHistory: [],
                    averageResponseTime: 0,
                    cognitiveLoadIndex: 0,
                    confidenceLevel: 'building',
                    conceptSimilarity: [],
                    lastClusterReview: '',
                    contextualDifficulty: { timeOfDay: {}, dayOfWeek: {}, sessionPosition: {}, cognitiveLoad: {} },
                    stabilityTrend: 'stable',
                    retrievabilityHistory: [],
                    optimalInterval: 1,
                });
            }
        }
        initialState.lookaheadBuffer = availableCards.slice(0, 5);
        initialState.emergencyBuffer = availableCards.slice(5, 7);
        initialState.challengeReserve = availableCards.slice(7, 10);
        res.json(initialState);
    }
    catch (e) {
        const error = e;
        res.status(500).json({ error: error.message });
    }
});
router.post('/session/next-card', async (req, res) => {
    try {
        const { sessionState } = req.body;
        const selected = cardSelector.selectNextOptimalCard(sessionState, sessionState.lookaheadBuffer);
        res.json(selected);
    }
    catch (e) {
        const error = e;
        res.status(500).json({ error: error.message });
    }
});
router.post('/session/response', async (req, res) => {
    try {
        const { sessionState, cardId, response } = req.body;
        const card = {
            id: cardId,
            deckId: 'dummy',
            frontContent: 'dummy',
            backContent: 'dummy',
            cardType: { type: 'basic' },
            mediaRefs: [],
            easeFactor: 2.5,
            intervalDays: 0,
            nextReview: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            reviewCount: 0,
            lapseCount: 0,
            lastReviewed: new Date().toISOString(),
            difficulty: 5,
            stability: 1,
            retrievability: 0.9,
            fsrsParameters: [],
            performanceHistory: [],
            averageResponseTime: 0,
            cognitiveLoadIndex: 0,
            confidenceLevel: 'building',
            conceptSimilarity: [],
            lastClusterReview: '',
            contextualDifficulty: { timeOfDay: {}, dayOfWeek: {}, sessionPosition: {}, cognitiveLoad: {} },
            stabilityTrend: 'stable',
            retrievabilityHistory: [],
            optimalInterval: 1,
        };
        const userProfile = { id: sessionState.userId };
        const dsrUpdate = fsrsEngine.calculateEnhancedDSR(card, response, userProfile);
        const updatedSession = momentumManager.updateSessionMomentum(sessionState, response);
        res.json(updatedSession);
    }
    catch (e) {
        const error = e;
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=uams.js.map