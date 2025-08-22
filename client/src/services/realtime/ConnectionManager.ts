// Connection management for real-time data services
import type { DataType, SubscriptionCallback, UnsubscribeFunction } from './types'

export class ConnectionManager {
  private updateInterval: number = 30000 // 30 seconds
  private subscribers: Map<DataType, SubscriptionCallback[]> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private activeInstances: number = 0 // Reference counter for active instances

  /**
   * Subscribe to real-time updates for a specific data type
   */
  subscribe<T = unknown>(dataType: DataType, callback: SubscriptionCallback<T>): UnsubscribeFunction {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, [])
    }
    this.subscribers.get(dataType)!.push(callback as SubscriptionCallback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(dataType)
      if (callbacks) {
        const index = callbacks.indexOf(callback as SubscriptionCallback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Notify all subscribers of a data type with new data
   */
  notify(dataType: DataType, data: unknown): void {
    const callbacks = this.subscribers.get(dataType)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * Start real-time updates with reference counting
   */
  startUpdates(updateCallback: () => void): UnsubscribeFunction {
    this.activeInstances++
    
    // Only start interval if this is the first instance
    if (this.activeInstances === 1 && !this.intervalId) {
      console.log('[ConnectionManager] Starting real-time updates')
      this.intervalId = setInterval(updateCallback, this.updateInterval)
      
      // Immediate first update
      updateCallback()
    }

    // Return cleanup function
    return () => {
      this.activeInstances = Math.max(0, this.activeInstances - 1)
      
      // Stop interval when no active instances
      if (this.activeInstances === 0 && this.intervalId) {
        console.log('[ConnectionManager] Stopping real-time updates')
        clearInterval(this.intervalId)
        this.intervalId = null
      }
    }
  }

  /**
   * Force stop all updates (emergency cleanup)
   */
  forceStop(): void {
    console.log('[ConnectionManager] Force stopping all updates')
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.activeInstances = 0
    this.subscribers.clear()
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isActive: this.intervalId !== null,
      activeInstances: this.activeInstances,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, callbacks) => sum + callbacks.length, 0)
    }
  }

  /**
   * Update the refresh interval
   */
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs
    
    // Restart interval if currently active
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = setInterval(() => {
        // This would need the callback from startUpdates - for now just log
        console.log('[ConnectionManager] Interval tick')
      }, this.updateInterval)
    }
  }
}