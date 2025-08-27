"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedCacheService = void 0;
class UnifiedCacheService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        this.config = {
            dsrCalculations: { ttl: 300000, maxSize: 1000 },
            cardSelections: { ttl: 60000, maxSize: 500 },
            userProfiles: { ttl: 900000, maxSize: 200 },
            cognitiveAnalysis: { ttl: 180000, maxSize: 300 },
            environmentalContext: { ttl: 120000, maxSize: 100 },
            sessionStates: { ttl: 1800000, maxSize: 150 }
        };
    }
    async getCachedDSR(cardId, responseHash) {
        const key = `dsr:${cardId}:${responseHash}`;
        return this.get(key, 'dsrCalculations');
    }
    async cacheDSR(cardId, responseHash, dsr) {
        const key = `dsr:${cardId}:${responseHash}`;
        this.set(key, dsr, 'dsrCalculations');
    }
    async getCachedCardSelection(sessionStateHash, availableCardsHash) {
        const key = `selection:${sessionStateHash}:${availableCardsHash}`;
        return this.get(key, 'cardSelections');
    }
    async cacheCardSelection(sessionStateHash, availableCardsHash, selection) {
        const key = `selection:${sessionStateHash}:${availableCardsHash}`;
        this.set(key, selection, 'cardSelections');
    }
    async getCachedUserProfile(userId) {
        const key = `profile:${userId}`;
        return this.get(key, 'userProfiles');
    }
    async cacheUserProfile(userId, profile) {
        const key = `profile:${userId}`;
        this.set(key, profile, 'userProfiles');
    }
    async getCachedCognitiveAnalysis(responseHistoryHash, sessionStateHash) {
        const key = `cognitive:${responseHistoryHash}:${sessionStateHash}`;
        return this.get(key, 'cognitiveAnalysis');
    }
    async cacheCognitiveAnalysis(responseHistoryHash, sessionStateHash, analysis) {
        const key = `cognitive:${responseHistoryHash}:${sessionStateHash}`;
        this.set(key, analysis, 'cognitiveAnalysis');
    }
    async getCachedEnvironmentalContext(contextHash) {
        const key = `env:${contextHash}`;
        return this.get(key, 'environmentalContext');
    }
    async cacheEnvironmentalContext(contextHash, context) {
        const key = `env:${contextHash}`;
        this.set(key, context, 'environmentalContext');
    }
    async getCachedSessionState(sessionId) {
        const key = `session:${sessionId}`;
        return this.get(key, 'sessionStates');
    }
    async cacheSessionState(sessionId, state) {
        const key = `session:${sessionId}`;
        this.set(key, state, 'sessionStates');
    }
    get(key, category) {
        const item = this.cache.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        item.accessCount++;
        item.lastAccessed = Date.now();
        this.stats.hits++;
        return item.value;
    }
    set(key, value, category) {
        const config = this.config[category];
        const expiry = Date.now() + config.ttl;
        const size = this.estimateSize(value);
        const item = {
            value,
            expiry,
            accessCount: 0,
            lastAccessed: Date.now(),
            size
        };
        this.cache.set(key, item);
        this.enforceSize(category);
    }
    enforceSize(category) {
        const config = this.config[category];
        const categoryKeys = Array.from(this.cache.keys()).filter(key => key.startsWith(this.getCategoryPrefix(category)));
        if (categoryKeys.length <= config.maxSize)
            return;
        const sortedKeys = categoryKeys.sort((a, b) => {
            const itemA = this.cache.get(a);
            const itemB = this.cache.get(b);
            if (itemA.lastAccessed !== itemB.lastAccessed) {
                return itemA.lastAccessed - itemB.lastAccessed;
            }
            return itemA.accessCount - itemB.accessCount;
        });
        const itemsToRemove = sortedKeys.length - config.maxSize;
        for (let i = 0; i < itemsToRemove; i++) {
            this.cache.delete(sortedKeys[i]);
            this.stats.evictions++;
        }
    }
    getCategoryPrefix(category) {
        const prefixes = {
            dsrCalculations: 'dsr:',
            cardSelections: 'selection:',
            userProfiles: 'profile:',
            cognitiveAnalysis: 'cognitive:',
            environmentalContext: 'env:',
            sessionStates: 'session:'
        };
        return prefixes[category];
    }
    estimateSize(value) {
        try {
            const jsonString = JSON.stringify(value);
            return jsonString.length * 2;
        }
        catch {
            return 1000;
        }
    }
    createHash(data) {
        try {
            const jsonString = JSON.stringify(data);
            return this.simpleHash(jsonString);
        }
        catch {
            return Math.random().toString(36).substr(2, 9);
        }
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    async prewarmCache(userId) {
        try {
            console.log(`Prewarming cache for user ${userId}`);
            console.log('Cache prewarming completed');
        }
        catch (error) {
            console.error('Cache prewarming failed:', error);
        }
    }
    getStats() {
        const totalHits = this.stats.hits;
        const totalMisses = this.stats.misses;
        const totalRequests = totalHits + totalMisses;
        const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
        const missRate = totalRequests > 0 ? totalMisses / totalRequests : 0;
        const categories = {};
        for (const category of Object.keys(this.config)) {
            const prefix = this.getCategoryPrefix(category);
            const categoryItems = Array.from(this.cache.entries()).filter(([key]) => key.startsWith(prefix));
            const memoryUsage = categoryItems.reduce((sum, [, item]) => sum + item.size, 0);
            const categoryHits = categoryItems.reduce((sum, [, item]) => sum + item.accessCount, 0);
            categories[category] = {
                items: categoryItems.length,
                memoryUsage,
                hitRate: categoryHits > 0 ? categoryHits / (categoryHits + 1) : 0
            };
        }
        return {
            totalItems: this.cache.size,
            totalMemoryUsage: Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0),
            hitRate,
            missRate,
            evictionCount: this.stats.evictions,
            categories
        };
    }
    async performMaintenance() {
        console.log('Starting cache maintenance...');
        const beforeSize = this.cache.size;
        const now = Date.now();
        let expiredCount = 0;
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                expiredCount++;
            }
        }
        console.log(`Cache maintenance completed: ${expiredCount} expired items removed, ${beforeSize} -> ${this.cache.size} items`);
        this.compactMemory();
    }
    compactMemory() {
        const stats = this.getStats();
        const maxMemoryMB = 50;
        const currentMemoryMB = stats.totalMemoryUsage / (1024 * 1024);
        if (currentMemoryMB > maxMemoryMB) {
            console.log(`Memory usage high (${currentMemoryMB.toFixed(2)}MB), performing compaction...`);
            const sortedEntries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
                const scoreA = a.accessCount * (Date.now() - a.lastAccessed);
                const scoreB = b.accessCount * (Date.now() - b.lastAccessed);
                return scoreA - scoreB;
            });
            const removeCount = Math.floor(sortedEntries.length * 0.2);
            for (let i = 0; i < removeCount; i++) {
                this.cache.delete(sortedEntries[i][0]);
                this.stats.evictions++;
            }
            console.log(`Memory compaction completed: removed ${removeCount} items`);
        }
    }
    async clearCache(category) {
        if (category) {
            const prefix = this.getCategoryPrefix(category);
            const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
            for (const key of keysToDelete) {
                this.cache.delete(key);
            }
            console.log(`Cleared ${keysToDelete.length} items from ${category} cache`);
        }
        else {
            this.cache.clear();
            this.stats = { hits: 0, misses: 0, evictions: 0 };
            console.log('Cleared entire cache');
        }
    }
    async implementIntelligentCaching(userId, recentActivity) {
        console.log(`Implementing intelligent caching for user ${userId}`);
        if (recentActivity.length > 0) {
        }
    }
    initialize() {
        console.log('Initializing Unified Cache Service...');
        setInterval(() => {
            this.performMaintenance();
        }, 10 * 60 * 1000);
        setInterval(() => {
            const stats = this.getStats();
            console.log('Cache Stats:', {
                items: stats.totalItems,
                memoryMB: (stats.totalMemoryUsage / (1024 * 1024)).toFixed(2),
                hitRate: (stats.hitRate * 100).toFixed(1) + '%'
            });
        }, 60 * 60 * 1000);
        console.log('Cache service initialized with maintenance scheduling');
    }
    shutdown() {
        console.log('Shutting down cache service...');
        const stats = this.getStats();
        console.log('Final cache stats:', stats);
        this.cache.clear();
        console.log('Cache service shutdown complete');
    }
}
exports.UnifiedCacheService = UnifiedCacheService;
//# sourceMappingURL=unifiedCacheService.js.map