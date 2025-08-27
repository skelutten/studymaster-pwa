import { DSRUpdate, CardSelectionResult, CognitiveLoadAnalysis } from '../../../../shared/types/enhanced-types';
export interface CacheConfig {
    dsrCalculations: {
        ttl: number;
        maxSize: number;
    };
    cardSelections: {
        ttl: number;
        maxSize: number;
    };
    userProfiles: {
        ttl: number;
        maxSize: number;
    };
    cognitiveAnalysis: {
        ttl: number;
        maxSize: number;
    };
    environmentalContext: {
        ttl: number;
        maxSize: number;
    };
    sessionStates: {
        ttl: number;
        maxSize: number;
    };
}
export interface CacheItem<T> {
    value: T;
    expiry: number;
    accessCount: number;
    lastAccessed: number;
    size: number;
}
export interface CacheStats {
    totalItems: number;
    totalMemoryUsage: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    categories: Record<string, {
        items: number;
        memoryUsage: number;
        hitRate: number;
    }>;
}
export declare class UnifiedCacheService {
    private cache;
    private stats;
    private readonly config;
    getCachedDSR(cardId: string, responseHash: string): Promise<DSRUpdate | null>;
    cacheDSR(cardId: string, responseHash: string, dsr: DSRUpdate): Promise<void>;
    getCachedCardSelection(sessionStateHash: string, availableCardsHash: string): Promise<CardSelectionResult | null>;
    cacheCardSelection(sessionStateHash: string, availableCardsHash: string, selection: CardSelectionResult): Promise<void>;
    getCachedUserProfile(userId: string): Promise<any | null>;
    cacheUserProfile(userId: string, profile: any): Promise<void>;
    getCachedCognitiveAnalysis(responseHistoryHash: string, sessionStateHash: string): Promise<CognitiveLoadAnalysis | null>;
    cacheCognitiveAnalysis(responseHistoryHash: string, sessionStateHash: string, analysis: CognitiveLoadAnalysis): Promise<void>;
    getCachedEnvironmentalContext(contextHash: string): Promise<any | null>;
    cacheEnvironmentalContext(contextHash: string, context: any): Promise<void>;
    getCachedSessionState(sessionId: string): Promise<any | null>;
    cacheSessionState(sessionId: string, state: any): Promise<void>;
    private get;
    private set;
    private enforceSize;
    private getCategoryPrefix;
    private estimateSize;
    createHash(data: any): string;
    private simpleHash;
    prewarmCache(userId: string): Promise<void>;
    getStats(): CacheStats;
    performMaintenance(): Promise<void>;
    private compactMemory;
    clearCache(category?: keyof CacheConfig): Promise<void>;
    implementIntelligentCaching(userId: string, recentActivity: any[]): Promise<void>;
    initialize(): void;
    shutdown(): void;
}
//# sourceMappingURL=unifiedCacheService.d.ts.map