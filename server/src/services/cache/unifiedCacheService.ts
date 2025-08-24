import { DSRUpdate, UnifiedCard, CardSelectionResult, CognitiveLoadAnalysis } from '../../../../shared/types/enhanced-types';

export interface CacheConfig {
  dsrCalculations: { ttl: number; maxSize: number };
  cardSelections: { ttl: number; maxSize: number };
  userProfiles: { ttl: number; maxSize: number };
  cognitiveAnalysis: { ttl: number; maxSize: number };
  environmentalContext: { ttl: number; maxSize: number };
  sessionStates: { ttl: number; maxSize: number };
}

export interface CacheItem<T> {
  value: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

export interface CacheStats {
  totalItems: number;
  totalMemoryUsage: number; // bytes
  hitRate: number; // 0-1
  missRate: number; // 0-1
  evictionCount: number;
  categories: Record<string, {
    items: number;
    memoryUsage: number;
    hitRate: number;
  }>;
}

export class UnifiedCacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private readonly config: CacheConfig = {
    dsrCalculations: { ttl: 300000, maxSize: 1000 }, // 5 minutes, 1000 items
    cardSelections: { ttl: 60000, maxSize: 500 }, // 1 minute, 500 items
    userProfiles: { ttl: 900000, maxSize: 200 }, // 15 minutes, 200 items
    cognitiveAnalysis: { ttl: 180000, maxSize: 300 }, // 3 minutes, 300 items
    environmentalContext: { ttl: 120000, maxSize: 100 }, // 2 minutes, 100 items
    sessionStates: { ttl: 1800000, maxSize: 150 } // 30 minutes, 150 items
  };

  /**
   * DSR Calculation Caching
   */
  async getCachedDSR(cardId: string, responseHash: string): Promise<DSRUpdate | null> {
    const key = `dsr:${cardId}:${responseHash}`;
    return this.get(key, 'dsrCalculations');
  }

  async cacheDSR(cardId: string, responseHash: string, dsr: DSRUpdate): Promise<void> {
    const key = `dsr:${cardId}:${responseHash}`;
    this.set(key, dsr, 'dsrCalculations');
  }

  /**
   * Card Selection Caching
   */
  async getCachedCardSelection(
    sessionStateHash: string, 
    availableCardsHash: string
  ): Promise<CardSelectionResult | null> {
    const key = `selection:${sessionStateHash}:${availableCardsHash}`;
    return this.get(key, 'cardSelections');
  }

  async cacheCardSelection(
    sessionStateHash: string,
    availableCardsHash: string,
    selection: CardSelectionResult
  ): Promise<void> {
    const key = `selection:${sessionStateHash}:${availableCardsHash}`;
    this.set(key, selection, 'cardSelections');
  }

  /**
   * User Profile Caching
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = `profile:${userId}`;
    return this.get(key, 'userProfiles');
  }

  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const key = `profile:${userId}`;
    this.set(key, profile, 'userProfiles');
  }

  /**
   * Cognitive Load Analysis Caching
   */
  async getCachedCognitiveAnalysis(
    responseHistoryHash: string,
    sessionStateHash: string
  ): Promise<CognitiveLoadAnalysis | null> {
    const key = `cognitive:${responseHistoryHash}:${sessionStateHash}`;
    return this.get(key, 'cognitiveAnalysis');
  }

  async cacheCognitiveAnalysis(
    responseHistoryHash: string,
    sessionStateHash: string,
    analysis: CognitiveLoadAnalysis
  ): Promise<void> {
    const key = `cognitive:${responseHistoryHash}:${sessionStateHash}`;
    this.set(key, analysis, 'cognitiveAnalysis');
  }

  /**
   * Environmental Context Caching
   */
  async getCachedEnvironmentalContext(contextHash: string): Promise<any | null> {
    const key = `env:${contextHash}`;
    return this.get(key, 'environmentalContext');
  }

  async cacheEnvironmentalContext(contextHash: string, context: any): Promise<void> {
    const key = `env:${contextHash}`;
    this.set(key, context, 'environmentalContext');
  }

  /**
   * Session State Caching
   */
  async getCachedSessionState(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return this.get(key, 'sessionStates');
  }

  async cacheSessionState(sessionId: string, state: any): Promise<void> {
    const key = `session:${sessionId}`;
    this.set(key, state, 'sessionStates');
  }

  /**
   * Generic cache operations with LRU and size management
   */
  private get<T>(key: string, category: keyof CacheConfig): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check expiry
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.value as T;
  }

  private set<T>(key: string, value: T, category: keyof CacheConfig): void {
    const config = this.config[category];
    const expiry = Date.now() + config.ttl;
    const size = this.estimateSize(value);
    
    // Create cache item
    const item: CacheItem<T> = {
      value,
      expiry,
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };
    
    this.cache.set(key, item);
    
    // Enforce size limits per category
    this.enforceSize(category);
  }

  /**
   * Enforce size limits using LRU eviction
   */
  private enforceSize(category: keyof CacheConfig): void {
    const config = this.config[category];
    const categoryKeys = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(this.getCategoryPrefix(category))
    );
    
    if (categoryKeys.length <= config.maxSize) return;
    
    // Sort by LRU (least recently used first)
    const sortedKeys = categoryKeys.sort((a, b) => {
      const itemA = this.cache.get(a)!;
      const itemB = this.cache.get(b)!;
      
      // Primary sort: access time
      if (itemA.lastAccessed !== itemB.lastAccessed) {
        return itemA.lastAccessed - itemB.lastAccessed;
      }
      
      // Secondary sort: access count (less accessed first)
      return itemA.accessCount - itemB.accessCount;
    });
    
    // Remove oldest items
    const itemsToRemove = sortedKeys.length - config.maxSize;
    for (let i = 0; i < itemsToRemove; i++) {
      this.cache.delete(sortedKeys[i]);
      this.stats.evictions++;
    }
  }

  /**
   * Get category prefix for key filtering
   */
  private getCategoryPrefix(category: keyof CacheConfig): string {
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

  /**
   * Estimate memory size of cached value
   */
  private estimateSize(value: any): number {
    try {
      // Simple JSON string length estimation
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Rough estimation (UTF-16)
    } catch {
      return 1000; // Default size if serialization fails
    }
  }

  /**
   * Generate hash for cache keys
   */
  createHash(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      return this.simpleHash(jsonString);
    } catch {
      return Math.random().toString(36).substr(2, 9);
    }
  }

  /**
   * Simple hash function (for demo - use crypto.subtle.digest in production)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Intelligent cache prewarming
   */
  async prewarmCache(userId: string): Promise<void> {
    try {
      console.log(`Prewarming cache for user ${userId}`);
      
      // Prewarm user profile
      // In real implementation, this would load from database
      // const userProfile = await this.loadUserProfileFromDB(userId);
      // await this.cacheUserProfile(userId, userProfile);
      
      // Prewarm frequently accessed data
      // This would be based on user patterns and commonly accessed cards
      
      console.log('Cache prewarming completed');
    } catch (error) {
      console.error('Cache prewarming failed:', error);
    }
  }

  /**
   * Cache statistics and monitoring
   */
  getStats(): CacheStats {
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const totalRequests = totalHits + totalMisses;
    
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    const missRate = totalRequests > 0 ? totalMisses / totalRequests : 0;
    
    // Calculate per-category stats
    const categories: Record<string, any> = {};
    
    for (const category of Object.keys(this.config) as Array<keyof CacheConfig>) {
      const prefix = this.getCategoryPrefix(category);
      const categoryItems = Array.from(this.cache.entries()).filter(([key]) => 
        key.startsWith(prefix)
      );
      
      const memoryUsage = categoryItems.reduce((sum, [, item]) => sum + item.size, 0);
      const categoryHits = categoryItems.reduce((sum, [, item]) => sum + item.accessCount, 0);
      
      categories[category] = {
        items: categoryItems.length,
        memoryUsage,
        hitRate: categoryHits > 0 ? categoryHits / (categoryHits + 1) : 0 // Approximation
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

  /**
   * Cache maintenance and cleanup
   */
  async performMaintenance(): Promise<void> {
    console.log('Starting cache maintenance...');
    
    const beforeSize = this.cache.size;
    const now = Date.now();
    let expiredCount = 0;
    
    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    // Log maintenance results
    console.log(`Cache maintenance completed: ${expiredCount} expired items removed, ${beforeSize} -> ${this.cache.size} items`);
    
    // Optional: Compact memory if needed
    this.compactMemory();
  }

  /**
   * Memory compaction for high-memory situations
   */
  private compactMemory(): void {
    const stats = this.getStats();
    const maxMemoryMB = 50; // 50MB limit
    const currentMemoryMB = stats.totalMemoryUsage / (1024 * 1024);
    
    if (currentMemoryMB > maxMemoryMB) {
      console.log(`Memory usage high (${currentMemoryMB.toFixed(2)}MB), performing compaction...`);
      
      // Sort all items by LRU and remove least valuable ones
      const sortedEntries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
        // Sort by value: less accessed and older items first
        const scoreA = a.accessCount * (Date.now() - a.lastAccessed);
        const scoreB = b.accessCount * (Date.now() - b.lastAccessed);
        return scoreA - scoreB;
      });
      
      // Remove bottom 20% of cache
      const removeCount = Math.floor(sortedEntries.length * 0.2);
      for (let i = 0; i < removeCount; i++) {
        this.cache.delete(sortedEntries[i][0]);
        this.stats.evictions++;
      }
      
      console.log(`Memory compaction completed: removed ${removeCount} items`);
    }
  }

  /**
   * Clear cache by category or completely
   */
  async clearCache(category?: keyof CacheConfig): Promise<void> {
    if (category) {
      const prefix = this.getCategoryPrefix(category);
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(prefix)
      );
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      
      console.log(`Cleared ${keysToDelete.length} items from ${category} cache`);
    } else {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, evictions: 0 };
      console.log('Cleared entire cache');
    }
  }

  /**
   * Cache warming strategies
   */
  async implementIntelligentCaching(userId: string, recentActivity: any[]): Promise<void> {
    // Predictive caching based on user patterns
    // This would analyze user behavior to cache likely-needed data
    
    // Example: If user typically studies at this time, preload their queue
    // Example: If user often reviews specific deck, cache those cards' DSR data
    
    console.log(`Implementing intelligent caching for user ${userId}`);
    
    // This is where machine learning predictions would inform caching
    // For now, we'll use simple heuristics
    
    if (recentActivity.length > 0) {
      // Cache based on recent patterns
      // Implementation would be specific to your data patterns
    }
  }

  /**
   * Initialize cache service with maintenance schedule
   */
  initialize(): void {
    console.log('Initializing Unified Cache Service...');
    
    // Set up periodic maintenance (every 10 minutes)
    setInterval(() => {
      this.performMaintenance();
    }, 10 * 60 * 1000);
    
    // Set up stats logging (every hour)
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

  /**
   * Shutdown cache service gracefully
   */
  shutdown(): void {
    console.log('Shutting down cache service...');
    
    const stats = this.getStats();
    console.log('Final cache stats:', stats);
    
    // In a real implementation, you might want to persist important cache data
    this.cache.clear();
    
    console.log('Cache service shutdown complete');
  }
}