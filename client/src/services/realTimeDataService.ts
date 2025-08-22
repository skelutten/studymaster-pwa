// Removed unused imports: useDeckStore and useGamificationStore

// Types for real-time data
export interface GlobalLearningStats {
  totalLearners: number
  cardsStudiedToday: number
  activeStudySessions: number
  languagesBeingLearned: number
  topSubjects: Array<{ name: string; learners: number }>
  studyTimeToday: number // in minutes
  lastUpdated: string
}

export interface EducationalTrends {
  popularSubjects: Array<{ subject: string; growth: number; learners: number }>
  learningMethods: Array<{ method: string; effectiveness: number; usage: number }>
  studyPatterns: {
    peakHours: Array<{ hour: number; activity: number }>
    weeklyTrends: Array<{ day: string; sessions: number }>
  }
  lastUpdated: string
}

export interface LiveUserMetrics {
  onlineUsers: number
  studyingSessions: number
  completedToday: number
  averageAccuracy: number
  topPerformers: Array<{ username: string; score: number; country: string }>
  lastUpdated: string
}

export interface MarketInsights {
  skillDemand: Array<{ skill: string; demand: number; growth: number }>
  industryTrends: Array<{ industry: string; skills: string[]; growth: number }>
  certificationValue: Array<{ cert: string; value: number; popularity: number }>
  lastUpdated: string
}

// Real-time data service class
export class RealTimeDataService {
  private updateInterval: number = 30000 // 30 seconds
  private subscribers: Map<string, ((data: unknown) => void)[]> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private activeInstances: number = 0 // Reference counter for active instances

  // Subscribe to real-time updates
  subscribe<T = unknown>(dataType: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, [])
    }
    this.subscribers.get(dataType)!.push(callback as (data: unknown) => void)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(dataType)
      if (callbacks) {
        const index = callbacks.indexOf(callback as (data: unknown) => void)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Notify subscribers
  private notify(dataType: string, data: unknown): void {
    const callbacks = this.subscribers.get(dataType)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Fetch global learning statistics from multiple sources
  async getGlobalLearningStats(): Promise<GlobalLearningStats> {
    try {
      // Try to fetch from real educational APIs
      const stats = await this.fetchFromMultipleSources([
        () => this.fetchFromDuolingoAPI(),
        () => this.fetchFromKhanAcademyAPI(),
        () => this.fetchFromCourseraAPI(),
        () => this.fetchFromEducationalDataAPI()
      ])

      if (stats) {
        this.notify('globalStats', stats)
        return stats as GlobalLearningStats
      }
    } catch (error) {
      console.warn('Failed to fetch real global stats, using enhanced mock data:', error)
    }

    // Enhanced realistic mock data with time-based variations
    return this.generateEnhancedGlobalStats()
  }

  // Fetch educational trends from research APIs
  async getEducationalTrends(): Promise<EducationalTrends> {
    try {
      // Try to fetch from educational research APIs
      const trends = await this.fetchEducationalTrendsFromAPIs()
      if (trends) {
        this.notify('educationalTrends', trends)
        return trends
      }
    } catch (error) {
      console.warn('Failed to fetch real educational trends, using enhanced mock data:', error)
    }

    return this.generateEnhancedEducationalTrends()
  }

  // Fetch live user metrics
  async getLiveUserMetrics(): Promise<LiveUserMetrics> {
    try {
      // Try to fetch from real-time analytics APIs
      const metrics = await this.fetchLiveMetricsFromAPIs()
      if (metrics) {
        this.notify('liveMetrics', metrics)
        return metrics
      }
    } catch (error) {
      console.warn('Failed to fetch real live metrics, using enhanced mock data:', error)
    }

    return this.generateEnhancedLiveMetrics()
  }

  // Fetch market insights from job/skill APIs
  async getMarketInsights(): Promise<MarketInsights> {
    try {
      // Try to fetch from job market APIs
      const insights = await this.fetchMarketInsightsFromAPIs()
      if (insights) {
        this.notify('marketInsights', insights)
        return insights
      }
    } catch (error) {
      console.warn('Failed to fetch real market insights, using enhanced mock data:', error)
    }

    return this.generateEnhancedMarketInsights()
  }

  // Attempt to fetch from Duolingo's public API
  private async fetchFromDuolingoAPI(): Promise<Partial<GlobalLearningStats> | null> {
    try {
      // Note: Duolingo doesn't have a public API for global stats
      // This is a placeholder for when such APIs become available
      const response = await fetch('https://www.duolingo.com/api/1/users/show?username=duolingo', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _data = await response.json()
        // Extract relevant statistics if available
        return null // Placeholder
      }
    } catch (error) {
      console.log('Duolingo API not accessible:', error)
    }
    return null
  }

  // Attempt to fetch from Khan Academy's API
  private async fetchFromKhanAcademyAPI(): Promise<Partial<GlobalLearningStats> | null> {
    try {
      // Khan Academy has limited public APIs
      // This is a placeholder for educational statistics
      return null
    } catch (error) {
      console.log('Khan Academy API not accessible:', error)
    }
    return null
  }

  // Attempt to fetch from Coursera's API
  private async fetchFromCourseraAPI(): Promise<Partial<GlobalLearningStats> | null> {
    try {
      // Coursera doesn't have public global statistics API
      // This is a placeholder
      return null
    } catch (error) {
      console.log('Coursera API not accessible:', error)
    }
    return null
  }

  // Attempt to fetch from educational data APIs
  private async fetchFromEducationalDataAPI(): Promise<Partial<GlobalLearningStats> | null> {
    try {
      // Try to fetch from open educational data sources
      // This could include UNESCO, World Bank education data, etc.
      return null
    } catch (error) {
      console.log('Educational data API not accessible:', error)
    }
    return null
  }

  // Fetch from multiple sources and combine results
  private async fetchFromMultipleSources(fetchers: Array<() => Promise<unknown>>): Promise<unknown> {
    const results = await Promise.allSettled(fetchers.map(fetcher => fetcher()))
    
    // Combine successful results
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<unknown>).value)

    if (successfulResults.length > 0) {
      // Merge results from multiple sources
      return this.mergeDataSources(successfulResults)
    }

    return null
  }

  // Merge data from multiple sources
  private mergeDataSources(sources: unknown[]): unknown {
    // Implement logic to combine data from multiple sources
    // For now, return the first successful source
    return sources[0]
  }

  // Generate enhanced realistic global statistics
  private generateEnhancedGlobalStats(): GlobalLearningStats {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    
    // Time-based activity simulation
    const timeMultiplier = this.getTimeBasedMultiplier(hour, dayOfWeek)
    
    // Base numbers that feel realistic for a global learning platform
    const baseLearners = 2847392
    const baseCardsToday = 15847293
    const baseActiveSessions = 23847
    
    return {
      totalLearners: Math.floor(baseLearners + (Math.random() * 1000 - 500)),
      cardsStudiedToday: Math.floor(baseCardsToday * timeMultiplier + (Math.random() * 10000 - 5000)),
      activeStudySessions: Math.floor(baseActiveSessions * timeMultiplier + (Math.random() * 1000 - 500)),
      languagesBeingLearned: 127 + Math.floor(Math.random() * 5),
      topSubjects: [
        { name: 'Spanish', learners: Math.floor(847392 * timeMultiplier) },
        { name: 'JavaScript', learners: Math.floor(623847 * timeMultiplier) },
        { name: 'French', learners: Math.floor(534829 * timeMultiplier) },
        { name: 'Python', learners: Math.floor(487293 * timeMultiplier) },
        { name: 'German', learners: Math.floor(392847 * timeMultiplier) }
      ],
      studyTimeToday: Math.floor(1847293 * timeMultiplier), // in minutes
      lastUpdated: now.toISOString()
    }
  }

  // Generate enhanced educational trends
  private generateEnhancedEducationalTrends(): EducationalTrends {
    const now = new Date()
    
    return {
      popularSubjects: [
        { subject: 'Artificial Intelligence', growth: 156.7, learners: 892847 },
        { subject: 'Data Science', growth: 134.2, learners: 734829 },
        { subject: 'Cybersecurity', growth: 128.9, learners: 623847 },
        { subject: 'Cloud Computing', growth: 119.4, learners: 587293 },
        { subject: 'Machine Learning', growth: 112.8, learners: 534829 },
        { subject: 'Spanish Language', growth: 89.3, learners: 1247392 },
        { subject: 'Digital Marketing', growth: 87.6, learners: 423847 },
        { subject: 'UX/UI Design', growth: 82.4, learners: 392847 }
      ],
      learningMethods: [
        { method: 'Spaced Repetition', effectiveness: 94.7, usage: 78.3 },
        { method: 'Active Recall', effectiveness: 91.2, usage: 65.8 },
        { method: 'Microlearning', effectiveness: 87.9, usage: 82.1 },
        { method: 'Gamification', effectiveness: 84.6, usage: 71.4 },
        { method: 'Peer Learning', effectiveness: 81.3, usage: 56.7 }
      ],
      studyPatterns: {
        peakHours: this.generatePeakHours(),
        weeklyTrends: this.generateWeeklyTrends()
      },
      lastUpdated: now.toISOString()
    }
  }

  // Generate enhanced live user metrics
  private generateEnhancedLiveMetrics(): LiveUserMetrics {
    const now = new Date()
    const hour = now.getHours()
    const timeMultiplier = this.getTimeBasedMultiplier(hour, now.getDay())
    
    return {
      onlineUsers: Math.floor(47392 * timeMultiplier + (Math.random() * 1000 - 500)),
      studyingSessions: Math.floor(23847 * timeMultiplier + (Math.random() * 500 - 250)),
      completedToday: Math.floor(184729 + (Math.random() * 1000 - 500)),
      averageAccuracy: 87.3 + (Math.random() * 4 - 2),
      topPerformers: [
        { username: 'StudyMaster_Pro', score: 15847, country: 'Singapore' },
        { username: 'LearningNinja', score: 14923, country: 'South Korea' },
        { username: 'FlashcardWiz', score: 14756, country: 'Finland' },
        { username: 'MemoryChamp', score: 14234, country: 'Japan' },
        { username: 'QuizMaster', score: 13892, country: 'Canada' }
      ],
      lastUpdated: now.toISOString()
    }
  }

  // Generate enhanced market insights
  private generateEnhancedMarketInsights(): MarketInsights {
    const now = new Date()
    
    return {
      skillDemand: [
        { skill: 'AI/Machine Learning', demand: 94.7, growth: 156.3 },
        { skill: 'Cloud Architecture', demand: 91.2, growth: 134.7 },
        { skill: 'Cybersecurity', demand: 89.8, growth: 128.9 },
        { skill: 'Data Analysis', demand: 87.4, growth: 119.2 },
        { skill: 'DevOps', demand: 84.9, growth: 112.6 },
        { skill: 'Full-Stack Development', demand: 82.3, growth: 98.4 },
        { skill: 'Digital Marketing', demand: 78.7, growth: 87.9 },
        { skill: 'UX Design', demand: 76.2, growth: 82.1 }
      ],
      industryTrends: [
        { 
          industry: 'Technology', 
          skills: ['AI/ML', 'Cloud Computing', 'Cybersecurity'], 
          growth: 145.7 
        },
        { 
          industry: 'Healthcare', 
          skills: ['Data Analysis', 'Digital Health', 'Telemedicine'], 
          growth: 123.4 
        },
        { 
          industry: 'Finance', 
          skills: ['Blockchain', 'FinTech', 'Risk Analysis'], 
          growth: 118.9 
        },
        { 
          industry: 'Education', 
          skills: ['EdTech', 'Online Learning', 'Digital Pedagogy'], 
          growth: 134.2 
        }
      ],
      certificationValue: [
        { cert: 'AWS Certified Solutions Architect', value: 98.7, popularity: 87.3 },
        { cert: 'Google Cloud Professional', value: 96.2, popularity: 82.1 },
        { cert: 'Certified Ethical Hacker', value: 94.8, popularity: 76.4 },
        { cert: 'PMP Certification', value: 91.3, popularity: 89.7 },
        { cert: 'Cisco CCNA', value: 88.9, popularity: 78.2 }
      ],
      lastUpdated: now.toISOString()
    }
  }

  // Get time-based activity multiplier
  private getTimeBasedMultiplier(hour: number, dayOfWeek: number): number {
    // Peak hours: 9-11 AM, 2-4 PM, 7-9 PM
    let hourMultiplier = 0.7 // Base activity
    
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21)) {
      hourMultiplier = 1.2 // Peak hours
    } else if (hour >= 6 && hour <= 23) {
      hourMultiplier = 1.0 // Normal hours
    }
    
    // Weekend vs weekday
    const dayMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0
    
    return hourMultiplier * dayMultiplier
  }

  // Generate realistic peak hours data
  private generatePeakHours(): Array<{ hour: number; activity: number }> {
    const peakHours = []
    for (let hour = 0; hour < 24; hour++) {
      let activity = 30 // Base activity
      
      // Morning peak (9-11 AM)
      if (hour >= 9 && hour <= 11) activity = 85 + Math.random() * 10
      // Afternoon peak (2-4 PM)
      else if (hour >= 14 && hour <= 16) activity = 90 + Math.random() * 10
      // Evening peak (7-9 PM)
      else if (hour >= 19 && hour <= 21) activity = 95 + Math.random() * 10
      // Normal hours
      else if (hour >= 6 && hour <= 23) activity = 60 + Math.random() * 20
      // Night hours
      else activity = 20 + Math.random() * 15
      
      peakHours.push({ hour, activity: Math.floor(activity) })
    }
    return peakHours
  }

  // Generate weekly trends
  private generateWeeklyTrends(): Array<{ day: string; sessions: number }> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const baseSessions = [8500, 9200, 9800, 9500, 8900, 7200, 6800] // Realistic weekly pattern
    
    return days.map((day, index) => ({
      day,
      sessions: Math.floor(baseSessions[index] + (Math.random() * 1000 - 500))
    }))
  }

  // Placeholder methods for real API calls
  private async fetchEducationalTrendsFromAPIs(): Promise<EducationalTrends | null> {
    // Implement real API calls to educational research databases
    return null
  }

  private async fetchLiveMetricsFromAPIs(): Promise<LiveUserMetrics | null> {
    // Implement real API calls to analytics services
    return null
  }

  private async fetchMarketInsightsFromAPIs(): Promise<MarketInsights | null> {
    // Implement real API calls to job market APIs (LinkedIn, Indeed, etc.)
    return null
  }

  // Start real-time updates with reference counting
  startRealTimeUpdates(): () => void {
    this.activeInstances++
    
    // Only start interval if this is the first instance
    if (this.activeInstances === 1 && !this.intervalId) {
      this.intervalId = setInterval(async () => {
        try {
          const [globalStats, trends, liveMetrics, marketInsights] = await Promise.all([
            this.getGlobalLearningStats(),
            this.getEducationalTrends(),
            this.getLiveUserMetrics(),
            this.getMarketInsights()
          ])

          // Notify all subscribers with fresh data
          this.notify('globalStats', globalStats)
          this.notify('educationalTrends', trends)
          this.notify('liveMetrics', liveMetrics)
          this.notify('marketInsights', marketInsights)
        } catch (error) {
          console.error('Error updating real-time data:', error)
        }
      }, this.updateInterval)
    }

    // Return cleanup function
    return () => {
      this.stopRealTimeUpdates()
    }
  }

  // Stop real-time updates with reference counting
  stopRealTimeUpdates(): void {
    this.activeInstances = Math.max(0, this.activeInstances - 1)
    
    // Only stop interval when no more active instances
    if (this.activeInstances === 0 && this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Force stop all real-time updates (for cleanup)
  forceStopRealTimeUpdates(): void {
    this.activeInstances = 0
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    // Clear all subscriptions
    this.subscribers.clear()
  }
}

// Export singleton instance
export const realTimeDataService = new RealTimeDataService()