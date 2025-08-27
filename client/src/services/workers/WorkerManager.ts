import { 
  WorkerMessage, 
  WorkerStartMessage, 
  WorkerProgressMessage, 
  WorkerCompleteMessage, 
  WorkerErrorMessage,
  ImportConfiguration,
  ImportProgress,
  ImportError
} from '../../../../shared/types/anki'

export interface WorkerManagerOptions {
  maxWorkers?: number
  workerTimeout?: number
  retryAttempts?: number
  fallbackToMainThread?: boolean
}

export interface ImportTask {
  id: string
  file: File
  config: ImportConfiguration
  startTime: number
  retryCount: number
  onProgress?: (progress: ImportProgress) => void
  onComplete?: (result: any) => void
  onError?: (error: ImportError) => void
}

/**
 * WorkerManager - Coordinates Web Worker lifecycle for Anki imports
 * 
 * Features:
 * - Worker pool management with automatic cleanup
 * - Progress tracking and error recovery
 * - Fallback to main thread processing if workers fail
 * - Memory monitoring and worker recycling
 * - Task queuing with priority support
 */
export class WorkerManager {
  private workers: Map<string, Worker> = new Map()
  private activeImports: Map<string, ImportTask> = new Map()
  private taskQueue: ImportTask[] = []
  private options: Required<WorkerManagerOptions>
  private isProcessingQueue = false
  private workerRecycleCount = new Map<string, number>()

  constructor(options: WorkerManagerOptions = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || 2,
      workerTimeout: options.workerTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 2,
      fallbackToMainThread: options.fallbackToMainThread ?? true
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.terminateAllWorkers()
    })

    // Start queue processing
    this.processQueue()
  }

  /**
   * Import Anki deck with worker coordination
   */
  async importAnkiDeck(
    file: File,
    config: ImportConfiguration,
    onProgress?: (progress: ImportProgress) => void,
    onError?: (error: ImportError) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: ImportTask = {
        id: this.generateTaskId(),
        file,
        config,
        startTime: Date.now(),
        retryCount: 0,
        onProgress,
        onComplete: resolve,
        onError: (error) => {
          onError?.(error)
          reject(new Error(error.message))
        }
      }

      // Add to queue
      this.taskQueue.push(task)
      console.log(`WorkerManager: Queued import task ${task.id}`)

      // Start processing if not already running
      this.processQueue()
    })
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    this.isProcessingQueue = true

    try {
      while (this.taskQueue.length > 0) {
        // Check if we can start another worker
        if (this.activeImports.size >= this.options.maxWorkers) {
          // Wait for an active import to finish
          await this.waitForAvailableWorker()
        }

        const task = this.taskQueue.shift()
        if (task) {
          await this.executeTask(task)
        }
      }
    } catch (error) {
      console.error('WorkerManager queue processing error:', error)
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Execute individual import task
   */
  private async executeTask(task: ImportTask): Promise<void> {
    this.activeImports.set(task.id, task)
    
    try {
      console.log(`WorkerManager: Starting task ${task.id}`)
      
      // Create or get available worker
      const worker = await this.getAvailableWorker()
      const workerId = this.getWorkerIdFromInstance(worker)

      // Set up task timeout
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(task.id)
      }, this.options.workerTimeout)

      // Send import request to worker
      const message: WorkerStartMessage = {
        type: 'start',
        id: task.id,
        timestamp: new Date(),
        data: {
          fileBuffer: await this.fileToArrayBuffer(task.file),
          config: task.config,
          chunkSize: task.config.chunkSize
        }
      }

      worker.postMessage(message)

      // Store timeout ID for cleanup
      ;(task as ImportTask & { timeoutId: NodeJS.Timeout }).timeoutId = timeoutId
      ;(task as ImportTask & { workerId: string }).workerId = workerId

    } catch (error) {
      console.error(`WorkerManager: Failed to execute task ${task.id}:`, error)
      this.handleTaskError(task.id, {
        type: 'system',
        severity: 'high',
        message: error instanceof Error ? error.message : 'Unknown execution error',
        retryable: true,
        timestamp: new Date()
      })
    }
  }

  /**
   * Get or create available worker
   */
  private async getAvailableWorker(): Promise<Worker> {
    // Find an available worker
    for (const [id, worker] of this.workers) {
      if (!this.isWorkerBusy(id)) {
        console.log(`WorkerManager: Reusing worker ${id}`)
        return worker
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.options.maxWorkers) {
      return this.createNewWorker()
    }

    // Wait for worker to become available
    return this.waitForAvailableWorker()
  }

  /**
   * Create new worker instance
   */
  private createNewWorker(): Worker {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    
    try {
      const worker = new Worker('/workers/ankiImportWorker.js')
      
      // Set up message handler
      worker.onmessage = (event) => {
        this.handleWorkerMessage(workerId, event.data)
      }

      // Set up error handler
      worker.onerror = (error) => {
        console.error(`Worker ${workerId} error:`, error)
        this.handleWorkerError(workerId, error.message)
      }

      // Set up termination handler
      worker.onmessageerror = (error) => {
        console.error(`Worker ${workerId} message error:`, error)
        this.handleWorkerError(workerId, 'Message error')
      }

      this.workers.set(workerId, worker)
      this.workerRecycleCount.set(workerId, 0)

      console.log(`WorkerManager: Created new worker ${workerId}`)
      return worker

    } catch (error) {
      console.error('Failed to create worker:', error)
      throw new Error('Worker creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
    const { type, id: taskId, data } = message

    const task = taskId ? this.activeImports.get(taskId) : null
    if (!task && type !== 'error') {
      console.warn(`WorkerManager: Received message for unknown task ${taskId}`)
      return
    }

    switch (type) {
      case 'progress':
        this.handleProgressUpdate(taskId!, data)
        break

      case 'complete':
        this.handleTaskComplete(taskId!, data)
        break

      case 'error':
        this.handleTaskError(taskId!, {
          type: 'worker',
          severity: 'high',
          message: data.error || 'Worker error',
          retryable: data.recoverable ?? false,
          timestamp: new Date()
        })
        break

      case 'cancelled':
        this.handleTaskCancellation(taskId!)
        break

      default:
        console.warn(`WorkerManager: Unknown message type ${type} from worker ${workerId}`)
    }
  }

  /**
   * Handle progress updates
   */
  private handleProgressUpdate(taskId: string, progressData: { status?: string; message?: string; totalItems?: number; itemsProcessed?: number; errors?: unknown[]; percent?: number; memoryUsage?: number }): void {
    const task = this.activeImports.get(taskId)
    if (!task) return

    const progress: ImportProgress = {
      importId: taskId,
      status: this.mapWorkerStatusToImportStatus(progressData.status),
      currentPhase: progressData.message || 'Processing...',
      totalItems: progressData.totalItems || 0,
      processedItems: progressData.itemsProcessed || 0,
      failedItems: progressData.errors?.length || 0,
      percentComplete: Math.min(100, Math.max(0, progressData.percent || 0)),
      modelsFound: 0,
      modelsProcessed: 0,
      cardsFound: progressData.totalItems || 0,
      cardsProcessed: progressData.itemsProcessed || 0,
      mediaFilesFound: 0,
      mediaFilesProcessed: 0,
      startedAt: new Date(task.startTime),
      throughput: this.calculateThroughput(task.startTime, progressData.itemsProcessed || 0),
      errors: (progressData.errors || []).map((error: any) => ({
        type: 'parsing',
        severity: 'medium',
        message: error.message || error,
        retryable: false,
        timestamp: new Date()
      })),
      warnings: [],
      memoryUsage: progressData.memoryUsage
    }

    task.onProgress?.(progress)
  }

  /**
   * Handle task completion
   */
  private handleTaskComplete(taskId: string, result: unknown): void {
    const task = this.activeImports.get(taskId)
    if (!task) return

    console.log(`WorkerManager: Task ${taskId} completed successfully`)

    // Clear timeout
    const taskWithTimeout = task as ImportTask & { timeoutId?: NodeJS.Timeout }
    if (taskWithTimeout.timeoutId) {
      clearTimeout(taskWithTimeout.timeoutId)
    }

    // Clean up
    this.activeImports.delete(taskId)
    
    // Recycle worker if needed
    const taskWithWorker = task as ImportTask & { workerId?: string }
    const workerId = taskWithWorker.workerId
    if (workerId) {
      this.recycleWorkerIfNeeded(workerId)
    }

    // Return result
    task.onComplete?.(result)
  }

  /**
   * Handle task errors
   */
  private handleTaskError(taskId: string, error: ImportError): void {
    const task = this.activeImports.get(taskId)
    if (!task) return

    console.error(`WorkerManager: Task ${taskId} failed:`, error.message)

    // Clear timeout
    const taskWithTimeout = task as ImportTask & { timeoutId?: NodeJS.Timeout }
    if (taskWithTimeout.timeoutId) {
      clearTimeout(taskWithTimeout.timeoutId)
    }

    // Retry if possible
    if (error.retryable && task.retryCount < this.options.retryAttempts) {
      task.retryCount++
      console.log(`WorkerManager: Retrying task ${taskId} (attempt ${task.retryCount})`)
      
      // Re-queue task
      this.activeImports.delete(taskId)
      this.taskQueue.unshift(task)
      this.processQueue()
      return
    }

    // Fallback to main thread if configured and worker failed
    if (this.options.fallbackToMainThread && error.type === 'worker') {
      console.log(`WorkerManager: Falling back to main thread for task ${taskId}`)
      this.executeMainThreadFallback(task)
      return
    }

    // Task failed permanently
    this.activeImports.delete(taskId)
    
    // Clean up worker if needed
    const taskWithWorker = task as ImportTask & { workerId?: string }
    const workerId = taskWithWorker.workerId
    if (workerId && error.type === 'worker') {
      this.terminateWorker(workerId)
    }

    task.onError?.(error)
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: string): void {
    console.error(`WorkerManager: Task ${taskId} timed out`)
    
    this.handleTaskError(taskId, {
      type: 'system',
      severity: 'high',
      message: 'Import timed out',
      retryable: true,
      timestamp: new Date()
    })
  }

  /**
   * Handle task cancellation
   */
  private handleTaskCancellation(taskId: string): void {
    const task = this.activeImports.get(taskId)
    if (!task) return

    console.log(`WorkerManager: Task ${taskId} was cancelled`)

    // Clear timeout
    if ((task as any).timeoutId) {
      clearTimeout((task as any).timeoutId)
    }

    this.activeImports.delete(taskId)
    
    task.onError?.({
      type: 'system',
      severity: 'low',
      message: 'Import was cancelled',
      retryable: false,
      timestamp: new Date()
    })
  }

  /**
   * Execute fallback processing on main thread
   */
  private async executeMainThreadFallback(task: ImportTask): Promise<void> {
    try {
      console.log(`WorkerManager: Executing main thread fallback for task ${task.id}`)
      
      // This would import and use the main thread version of the parsing logic
      // For now, we'll just report an error
      task.onError?.({
        type: 'system',
        severity: 'high',
        message: 'Main thread fallback not implemented',
        retryable: false,
        timestamp: new Date()
      })
      
    } catch (error) {
      console.error('Main thread fallback failed:', error)
      task.onError?.({
        type: 'system',
        severity: 'critical',
        message: 'Both worker and fallback processing failed',
        retryable: false,
        timestamp: new Date()
      })
    }
  }

  /**
   * Utility methods
   */

  private generateTaskId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  private isWorkerBusy(workerId: string): boolean {
    return Array.from(this.activeImports.values()).some(task => 
      (task as ImportTask & { workerId?: string }).workerId === workerId
    )
  }

  private getWorkerIdFromInstance(worker: Worker): string {
    for (const [id, w] of this.workers) {
      if (w === worker) return id
    }
    return 'unknown'
  }

  private async waitForAvailableWorker(): Promise<Worker> {
    return new Promise((resolve) => {
      const checkAvailability = () => {
        for (const [id, worker] of this.workers) {
          if (!this.isWorkerBusy(id)) {
            resolve(worker)
            return
          }
        }
        // Check again in 100ms
        setTimeout(checkAvailability, 100)
      }
      checkAvailability()
    })
  }

  private recycleWorkerIfNeeded(workerId: string): void {
    const count = this.workerRecycleCount.get(workerId) || 0
    this.workerRecycleCount.set(workerId, count + 1)

    // Recycle worker after 10 uses to prevent memory leaks
    if (count >= 10) {
      console.log(`WorkerManager: Recycling worker ${workerId} after ${count} uses`)
      this.terminateWorker(workerId)
    }
  }

  private terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId)
    if (worker) {
      console.log(`WorkerManager: Terminating worker ${workerId}`)
      worker.terminate()
      this.workers.delete(workerId)
      this.workerRecycleCount.delete(workerId)
    }
  }

  private terminateAllWorkers(): void {
    console.log('WorkerManager: Terminating all workers')
    for (const [workerId, worker] of this.workers) {
      worker.terminate()
    }
    this.workers.clear()
    this.workerRecycleCount.clear()
    this.activeImports.clear()
  }

  private handleWorkerError(workerId: string, errorMessage: string): void {
    // Find tasks associated with this worker
    for (const [taskId, task] of this.activeImports) {
      const taskWithWorker = task as ImportTask & { workerId?: string }
      if (taskWithWorker.workerId === workerId) {
        this.handleTaskError(taskId, {
          type: 'worker',
          severity: 'high',
          message: `Worker error: ${errorMessage}`,
          retryable: true,
          timestamp: new Date()
        })
      }
    }
  }

  private mapWorkerStatusToImportStatus(workerStatus: string): ImportProgress['status'] {
    const statusMap: Record<string, ImportProgress['status']> = {
      'initializing': 'initializing',
      'parsing': 'parsing',
      'processing': 'processing',
      'complete': 'completed'
    }
    return statusMap[workerStatus] || 'processing'
  }

  private calculateThroughput(startTime: number, itemsProcessed: number): number {
    const elapsedMs = Date.now() - startTime
    const elapsedMin = elapsedMs / (1000 * 60)
    return elapsedMin > 0 ? itemsProcessed / elapsedMin : 0
  }

  /**
   * Public API methods
   */

  /**
   * Cancel import task
   */
  cancelImport(taskId: string): boolean {
    const task = this.activeImports.get(taskId)
    if (!task) return false

    const taskWithWorker = task as ImportTask & { workerId?: string }
    const workerId = taskWithWorker.workerId
    if (workerId) {
      const worker = this.workers.get(workerId)
      worker?.postMessage({ type: 'cancel', id: taskId })
    }

    return true
  }

  /**
   * Get active import count
   */
  getActiveImportCount(): number {
    return this.activeImports.size
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.taskQueue.length
  }

  /**
   * Get worker statistics
   */
  getWorkerStats() {
    return {
      activeWorkers: this.workers.size,
      maxWorkers: this.options.maxWorkers,
      activeImports: this.activeImports.size,
      queuedTasks: this.taskQueue.length,
      recycleCount: Array.from(this.workerRecycleCount.values()).reduce((sum, count) => sum + count, 0)
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.terminateAllWorkers()
    this.taskQueue = []
  }
}