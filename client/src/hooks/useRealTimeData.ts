import { useState, useEffect, useCallback } from 'react'
import { realTimeDataService, type GlobalLearningStats, type EducationalTrends, type LiveUserMetrics, type MarketInsights } from '../services/realTimeDataService'

interface RealTimeDataState {
  globalStats: GlobalLearningStats | null
  educationalTrends: EducationalTrends | null
  liveMetrics: LiveUserMetrics | null
  marketInsights: MarketInsights | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface UseRealTimeDataOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  enableSubscriptions?: boolean
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableSubscriptions = true
  } = options

  const [state, setState] = useState<RealTimeDataState>({
    globalStats: null,
    educationalTrends: null,
    liveMetrics: null,
    marketInsights: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  // Load all real-time data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const [globalStats, educationalTrends, liveMetrics, marketInsights] = await Promise.all([
        realTimeDataService.getGlobalLearningStats(),
        realTimeDataService.getEducationalTrends(),
        realTimeDataService.getLiveUserMetrics(),
        realTimeDataService.getMarketInsights()
      ])

      setState({
        globalStats,
        educationalTrends,
        liveMetrics,
        marketInsights,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load real-time data'
      }))
    }
  }, [])

  // Refresh specific data type
  const refreshGlobalStats = useCallback(async () => {
    try {
      const globalStats = await realTimeDataService.getGlobalLearningStats()
      setState(prev => ({ ...prev, globalStats, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Failed to refresh global stats:', error)
    }
  }, [])

  const refreshEducationalTrends = useCallback(async () => {
    try {
      const educationalTrends = await realTimeDataService.getEducationalTrends()
      setState(prev => ({ ...prev, educationalTrends, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Failed to refresh educational trends:', error)
    }
  }, [])

  const refreshLiveMetrics = useCallback(async () => {
    try {
      const liveMetrics = await realTimeDataService.getLiveUserMetrics()
      setState(prev => ({ ...prev, liveMetrics, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Failed to refresh live metrics:', error)
    }
  }, [])

  const refreshMarketInsights = useCallback(async () => {
    try {
      const marketInsights = await realTimeDataService.getMarketInsights()
      setState(prev => ({ ...prev, marketInsights, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Failed to refresh market insights:', error)
    }
  }, [])

  // Manual refresh all data
  const refresh = useCallback(() => {
    loadData()
  }, [loadData])

  // Set up subscriptions and auto-refresh
  useEffect(() => {
    // Initial load
    loadData()

    let refreshTimer: NodeJS.Timeout | null = null
    const unsubscribeFunctions: (() => void)[] = []
    let stopRealTimeUpdates: (() => void) | null = null

    if (enableSubscriptions) {
      // Set up real-time subscriptions
      const unsubscribeGlobal = realTimeDataService.subscribe('globalStats', (data: GlobalLearningStats) => {
        setState(prev => ({ ...prev, globalStats: data, lastUpdated: new Date() }))
      })

      const unsubscribeTrends = realTimeDataService.subscribe('educationalTrends', (data: EducationalTrends) => {
        setState(prev => ({ ...prev, educationalTrends: data, lastUpdated: new Date() }))
      })

      const unsubscribeLive = realTimeDataService.subscribe('liveMetrics', (data: LiveUserMetrics) => {
        setState(prev => ({ ...prev, liveMetrics: data, lastUpdated: new Date() }))
      })

      const unsubscribeMarket = realTimeDataService.subscribe('marketInsights', (data: MarketInsights) => {
        setState(prev => ({ ...prev, marketInsights: data, lastUpdated: new Date() }))
      })

      unsubscribeFunctions.push(unsubscribeGlobal, unsubscribeTrends, unsubscribeLive, unsubscribeMarket)

      // Start real-time updates service with reference counting
      stopRealTimeUpdates = realTimeDataService.startRealTimeUpdates()
    }

    if (autoRefresh) {
      // Set up auto-refresh timer
      refreshTimer = setInterval(() => {
        loadData()
      }, refreshInterval)
    }

    return () => {
      // Cleanup subscriptions
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
      
      // Stop real-time updates (reference counting will handle when to actually stop)
      if (stopRealTimeUpdates) {
        stopRealTimeUpdates()
      }
      
      // Clear refresh timer
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }, [loadData, autoRefresh, refreshInterval, enableSubscriptions])

  return {
    ...state,
    refresh,
    refreshGlobalStats,
    refreshEducationalTrends,
    refreshLiveMetrics,
    refreshMarketInsights,
    // Utility functions
    formatNumber: (num: number): string => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
      return num.toString()
    },
    formatTime: (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours > 0) return `${hours}h ${mins}m`
      return `${mins}m`
    },
    getTimeSinceUpdate: (): string => {
      if (!state.lastUpdated) return 'Never'
      const now = new Date()
      const diff = now.getTime() - state.lastUpdated.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      
      if (minutes > 0) return `${minutes}m ago`
      return `${seconds}s ago`
    }
  }
}

// Hook for specific data types
export const useGlobalStats = () => {
  const { globalStats, isLoading, error, refreshGlobalStats } = useRealTimeData({
    enableSubscriptions: true,
    autoRefresh: true,
    refreshInterval: 15000 // More frequent updates for global stats
  })

  return {
    data: globalStats,
    isLoading,
    error,
    refresh: refreshGlobalStats
  }
}

export const useEducationalTrends = () => {
  const { educationalTrends, isLoading, error, refreshEducationalTrends } = useRealTimeData({
    enableSubscriptions: true,
    autoRefresh: true,
    refreshInterval: 60000 // Less frequent updates for trends
  })

  return {
    data: educationalTrends,
    isLoading,
    error,
    refresh: refreshEducationalTrends
  }
}

export const useLiveMetrics = () => {
  const { liveMetrics, isLoading, error, refreshLiveMetrics } = useRealTimeData({
    enableSubscriptions: true,
    autoRefresh: true,
    refreshInterval: 10000 // Very frequent updates for live metrics
  })

  return {
    data: liveMetrics,
    isLoading,
    error,
    refresh: refreshLiveMetrics
  }
}

export const useMarketInsights = () => {
  const { marketInsights, isLoading, error, refreshMarketInsights } = useRealTimeData({
    enableSubscriptions: true,
    autoRefresh: true,
    refreshInterval: 300000 // Less frequent updates for market data (5 minutes)
  })

  return {
    data: marketInsights,
    isLoading,
    error,
    refresh: refreshMarketInsights
  }
}