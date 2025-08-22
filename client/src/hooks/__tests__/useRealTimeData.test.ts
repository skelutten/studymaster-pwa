import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealTimeData } from '../useRealTimeData'
import type { GlobalLearningStats, EducationalTrends, LiveUserMetrics, MarketInsights } from '../../services/realTimeDataService'

// Mock the real-time data service
vi.mock('../../services/realTimeDataService', () => ({
  realTimeDataService: {
    getGlobalLearningStats: vi.fn(),
    getEducationalTrends: vi.fn(),
    getLiveUserMetrics: vi.fn(),
    getMarketInsights: vi.fn(),
    subscribe: vi.fn(() => vi.fn()), // Return a mock unsubscribe function
    startRealTimeUpdates: vi.fn()
  }
}))

describe('useRealTimeData', () => {
  // Mock data that matches the actual types
  const mockGlobalStats: GlobalLearningStats = {
    totalLearners: 1000,
    cardsStudiedToday: 5000,
    activeStudySessions: 100,
    languagesBeingLearned: 50,
    topSubjects: [{ name: 'Spanish', learners: 500 }],
    studyTimeToday: 1200,
    lastUpdated: '2024-01-01T12:00:00Z'
  }

  const mockEducationalTrends: EducationalTrends = {
    popularSubjects: [{ subject: 'AI', growth: 150, learners: 1000 }],
    learningMethods: [{ method: 'Spaced Repetition', effectiveness: 95, usage: 80 }],
    studyPatterns: {
      peakHours: [{ hour: 9, activity: 85 }],
      weeklyTrends: [{ day: 'Monday', sessions: 8500 }]
    },
    lastUpdated: '2024-01-01T12:00:00Z'
  }

  const mockLiveMetrics: LiveUserMetrics = {
    onlineUsers: 100,
    studyingSessions: 50,
    completedToday: 200,
    averageAccuracy: 87.5,
    topPerformers: [{ username: 'test', score: 1000, country: 'US' }],
    lastUpdated: '2024-01-01T12:00:00Z'
  }

  const mockMarketInsights: MarketInsights = {
    skillDemand: [{ skill: 'AI', demand: 95, growth: 150 }],
    industryTrends: [{ industry: 'Tech', skills: ['AI', 'ML'], growth: 145 }],
    certificationValue: [{ cert: 'AWS', value: 98, popularity: 87 }],
    lastUpdated: '2024-01-01T12:00:00Z'
  }

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock timers
    vi.useFakeTimers()
    
    // Get the mocked service and setup default implementations
    const { realTimeDataService } = await import('../../services/realTimeDataService')
    const mockService = vi.mocked(realTimeDataService)
    
    mockService.getGlobalLearningStats.mockResolvedValue(mockGlobalStats)
    mockService.getEducationalTrends.mockResolvedValue(mockEducationalTrends)
    mockService.getLiveUserMetrics.mockResolvedValue(mockLiveMetrics)
    mockService.getMarketInsights.mockResolvedValue(mockMarketInsights)
    mockService.subscribe.mockReturnValue(vi.fn()) // Return a mock unsubscribe function
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.globalStats).toBeNull()
      expect(result.current.educationalTrends).toBeNull()
      expect(result.current.liveMetrics).toBeNull()
      expect(result.current.marketInsights).toBeNull()
      expect(result.current.lastUpdated).toBeNull()
    })

    it('should provide utility functions', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(typeof result.current.refreshGlobalStats).toBe('function')
      expect(typeof result.current.refreshEducationalTrends).toBe('function')
      expect(typeof result.current.refreshLiveMetrics).toBe('function')
      expect(typeof result.current.refreshMarketInsights).toBe('function')
      expect(typeof result.current.formatNumber).toBe('function')
      expect(typeof result.current.formatTime).toBe('function')
      expect(typeof result.current.getTimeSinceUpdate).toBe('function')
    })

    it('should provide refresh function', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(typeof result.current.refresh).toBe('function')
    })
  })

  describe('refresh functions', () => {
    it('should refresh global stats', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      const updatedStats = { ...mockGlobalStats, totalLearners: 2000 }
      mockService.getGlobalLearningStats.mockResolvedValue(updatedStats)

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      await act(async () => {
        await result.current.refreshGlobalStats()
      })

      expect(mockService.getGlobalLearningStats).toHaveBeenCalled()
      expect(result.current.globalStats).toEqual(updatedStats)
    })

    it('should refresh educational trends', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      const updatedTrends = { ...mockEducationalTrends, popularSubjects: [{ subject: 'ML', growth: 200, learners: 1500 }] }
      mockService.getEducationalTrends.mockResolvedValue(updatedTrends)

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      await act(async () => {
        await result.current.refreshEducationalTrends()
      })

      expect(mockService.getEducationalTrends).toHaveBeenCalled()
      expect(result.current.educationalTrends).toEqual(updatedTrends)
    })

    it('should refresh live metrics', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      const updatedMetrics = { ...mockLiveMetrics, onlineUsers: 200 }
      mockService.getLiveUserMetrics.mockResolvedValue(updatedMetrics)

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      await act(async () => {
        await result.current.refreshLiveMetrics()
      })

      expect(mockService.getLiveUserMetrics).toHaveBeenCalled()
      expect(result.current.liveMetrics).toEqual(updatedMetrics)
    })

    it('should refresh market insights', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      const updatedInsights = { ...mockMarketInsights, skillDemand: [{ skill: 'Blockchain', demand: 90, growth: 120 }] }
      mockService.getMarketInsights.mockResolvedValue(updatedInsights)

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      await act(async () => {
        await result.current.refreshMarketInsights()
      })

      expect(mockService.getMarketInsights).toHaveBeenCalled()
      expect(result.current.marketInsights).toEqual(updatedInsights)
    })

    it('should handle refresh errors gracefully', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockService.getGlobalLearningStats.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      await act(async () => {
        await result.current.refreshGlobalStats()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh global stats:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('utility functions', () => {
    it('should format numbers correctly', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.formatNumber(1000)).toBe('1.0K')
      expect(result.current.formatNumber(1000000)).toBe('1.0M')
      expect(result.current.formatNumber(1500)).toBe('1.5K')
      expect(result.current.formatNumber(500)).toBe('500')
      expect(result.current.formatNumber(0)).toBe('0')
    })

    it('should format time correctly', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.formatTime(60)).toBe('1h 0m')
      expect(result.current.formatTime(90)).toBe('1h 30m')
      expect(result.current.formatTime(30)).toBe('30m')
      expect(result.current.formatTime(0)).toBe('0m')
    })

    it('should calculate time since update', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.getTimeSinceUpdate()).toBe('Never')
    })

    it('should handle time formatting edge cases', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.formatTime(1)).toBe('1m')
      expect(result.current.formatTime(59)).toBe('59m')
      expect(result.current.formatTime(61)).toBe('1h 1m')
      expect(result.current.formatTime(120)).toBe('2h 0m')
    })

    it('should handle number formatting edge cases', () => {
      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      expect(result.current.formatNumber(999)).toBe('999')
      expect(result.current.formatNumber(1001)).toBe('1.0K')
      expect(result.current.formatNumber(999999)).toBe('1000.0K')
      expect(result.current.formatNumber(1000001)).toBe('1.0M')
    })
  })

  describe('edge cases', () => {
    it('should handle rapid successive refresh calls', async () => {
      const { realTimeDataService } = await import('../../services/realTimeDataService')
      const mockService = vi.mocked(realTimeDataService)
      
      mockService.getGlobalLearningStats.mockResolvedValue(mockGlobalStats)

      const { result } = renderHook(() => useRealTimeData({ enableSubscriptions: false, autoRefresh: false }))

      // Clear any initial calls
      vi.clearAllMocks()

      // Make multiple rapid calls
      await act(async () => {
        await Promise.all([
          result.current.refreshGlobalStats(),
          result.current.refreshGlobalStats(),
          result.current.refreshGlobalStats()
        ])
      })

      // Should handle gracefully without errors
      expect(result.current.error).toBeNull()
      expect(mockService.getGlobalLearningStats).toHaveBeenCalledTimes(3)
    })

    it('should handle very large refresh intervals', () => {
      const { result } = renderHook(() => useRealTimeData({ 
        autoRefresh: true, 
        refreshInterval: Number.MAX_SAFE_INTEGER,
        enableSubscriptions: false
      }))

      // Should not cause any errors
      expect(result.current.isLoading).toBe(true)
    })

    it('should handle zero refresh interval', () => {
      const { result } = renderHook(() => useRealTimeData({ 
        autoRefresh: true, 
        refreshInterval: 0,
        enableSubscriptions: false
      }))

      // Should not cause any errors
      expect(result.current.isLoading).toBe(true)
    })

    it('should handle negative refresh interval', () => {
      const { result } = renderHook(() => useRealTimeData({ 
        autoRefresh: true, 
        refreshInterval: -1000,
        enableSubscriptions: false
      }))

      // Should not cause any errors
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('options handling', () => {
    it('should handle default options', () => {
      const { result } = renderHook(() => useRealTimeData())

      expect(result.current.isLoading).toBe(true)
      expect(typeof result.current.refresh).toBe('function')
    })

    it('should handle empty options object', () => {
      const { result } = renderHook(() => useRealTimeData({}))

      expect(result.current.isLoading).toBe(true)
      expect(typeof result.current.refresh).toBe('function')
    })

    it('should handle partial options', () => {
      const { result } = renderHook(() => useRealTimeData({ autoRefresh: false }))

      expect(result.current.isLoading).toBe(true)
      expect(typeof result.current.refresh).toBe('function')
    })
  })
})