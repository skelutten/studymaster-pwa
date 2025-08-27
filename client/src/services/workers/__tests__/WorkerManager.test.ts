import { vi } from 'vitest'
import { WorkerManager, WorkerManagerOptions, ImportTask } from '../WorkerManager'
import { ImportConfiguration, ImportProgress, ImportError } from '../../../../../shared/types/anki'

// Mock Worker API
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  
  private listeners: Map<string, Function[]> = new Map()

  constructor(public scriptUrl: string) {
    // Simulate async worker initialization
    setTimeout(() => this.simulateWorkerReady(), 10)
  }

  postMessage(message: any) {
    // Simulate worker processing
    setTimeout(() => {
      this.simulateWorkerResponse(message)
    }, Math.random() * 100 + 50) // 50-150ms random delay
  }

  terminate() {
    this.onmessage = null
    this.onerror = null
    this.onmessageerror = null
    this.listeners.clear()
  }

  private simulateWorkerReady() {
    // Worker is ready to receive messages
  }

  private simulateWorkerResponse(message: any) {
    if (message.type === 'start') {
      this.simulateImportProcess(message)
    } else if (message.type === 'cancel') {
      this.onmessage?.({
        data: {
          type: 'cancelled',
          id: message.id,
          timestamp: new Date()
        }
      } as MessageEvent)
    }
  }

  private simulateImportProcess(startMessage: any) {
    const { id, data } = startMessage
    const { fileBuffer, chunkSize = 100 } = data
    const totalItems = Math.floor(fileBuffer.byteLength / 100) // Simulate cards based on file size

    // Simulate progress updates
    let processed = 0
    const progressInterval = setInterval(() => {
      processed += Math.min(chunkSize, totalItems - processed)
      const percentComplete = Math.min(100, (processed / totalItems) * 100)

      this.onmessage?.({
        data: {
          type: 'progress',
          id,
          data: {
            status: processed >= totalItems ? 'complete' : 'processing',
            message: `Processing items... ${processed}/${totalItems}`,
            percent: percentComplete,
            totalItems,
            itemsProcessed: processed
          },
          timestamp: new Date()
        }
      } as MessageEvent)

      if (processed >= totalItems) {
        clearInterval(progressInterval)
        
        // Simulate completion
        setTimeout(() => {
          this.onmessage?.({
            data: {
              type: 'complete',
              id,
              data: {
                models: Array.from({ length: 5 }, (_, i) => ({ id: `model-${i}`, name: `Model ${i}` })),
                cards: Array.from({ length: totalItems }, (_, i) => ({ id: `card-${i}`, front: `Front ${i}` })),
                mediaFiles: [],
                summary: {
                  modelsImported: 5,
                  cardsImported: totalItems,
                  mediaFilesImported: 0,
                  duplicatesSkipped: 0,
                  securityIssuesFound: 0
                }
              },
              timestamp: new Date()
            }
          } as MessageEvent)
        }, 50)
      }
    }, 100)
  }
}

// Mock the global Worker
(global as any).Worker = MockWorker

describe('WorkerManager', () => {
  let workerManager: WorkerManager
  
  const defaultOptions: WorkerManagerOptions = {
    maxWorkers: 2,
    workerTimeout: 5000,
    retryAttempts: 2,
    fallbackToMainThread: true
  }

  const mockConfig: ImportConfiguration = {
    chunkSize: 100,
    maxFileSize: 50 * 1024 * 1024,
    mediaOptimization: true,
    sanitizationLevel: 'strict',
    allowedMediaTypes: ['image/jpeg', 'image/png'],
    maxMediaFileSize: 10 * 1024 * 1024,
    virusScanEnabled: false,
    workerCount: 2,
    timeoutMs: 5000,
    retryAttempts: 2,
    skipDuplicateModels: true,
    skipDuplicateCards: true,
    duplicateThreshold: 0.9
  }

  beforeEach(() => {
    workerManager = new WorkerManager(defaultOptions)
    vi.clearAllMocks()
  })

  afterEach(() => {
    workerManager.destroy()
  })

  describe('Worker Pool Management', () => {
    test('should create workers up to maxWorkers limit', async () => {
      const files = [
        new File(['test1'], 'test1.apkg'),
        new File(['test2'], 'test2.apkg'),
        new File(['test3'], 'test3.apkg')
      ]

      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig)
      )

      // Should create 2 workers (max limit) and queue the third
      const stats = workerManager.getWorkerStats()
      expect(stats.maxWorkers).toBe(2)
      expect(stats.activeImports).toBeLessThanOrEqual(2)

      await Promise.all(promises)
    })

    test('should reuse idle workers', async () => {
      const file1 = new File(['test1'], 'test1.apkg')
      const file2 = new File(['test2'], 'test2.apkg')

      // Process first file
      await workerManager.importAnkiDeck(file1, mockConfig)
      
      const statsBefore = workerManager.getWorkerStats()
      
      // Process second file - should reuse existing worker
      await workerManager.importAnkiDeck(file2, mockConfig)
      
      const statsAfter = workerManager.getWorkerStats()
      
      // Should not create additional workers
      expect(statsAfter.activeWorkers).toBeLessThanOrEqual(statsBefore.activeWorkers + 1)
    })

    test('should terminate workers after recycling limit', async () => {
      // Process multiple files to trigger recycling
      const files = Array.from({ length: 12 }, (_, i) => 
        new File([`test${i}`], `test${i}.apkg`)
      )

      for (const file of files) {
        await workerManager.importAnkiDeck(file, mockConfig)
      }

      // Workers should be recycled after 10 uses
      const stats = workerManager.getWorkerStats()
      expect(stats.recycleCount).toBeGreaterThan(0)
    })

    test('should handle worker creation failures', async () => {
      // Mock Worker constructor to throw
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = vi.fn().mockImplementation(() => {
        throw new Error('Worker creation failed')
      })

      const file = new File(['test'], 'test.apkg')
      
      await expect(workerManager.importAnkiDeck(file, mockConfig))
        .rejects.toThrow('Worker creation failed')

      ;(global as any).Worker = originalWorker
    })
  })

  describe('Import Processing', () => {
    test('should successfully import Anki deck', async () => {
      const file = new File(['test data'], 'test.apkg')
      const progressUpdates: ImportProgress[] = []
      
      const result = await workerManager.importAnkiDeck(
        file,
        mockConfig,
        (progress) => progressUpdates.push(progress)
      )

      expect(result.models).toHaveLength(5)
      expect(result.cards.length).toBeGreaterThan(0)
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].percentComplete).toBe(100)
    })

    test('should handle progress updates correctly', async () => {
      const file = new File(['test data'], 'test.apkg')
      const progressUpdates: ImportProgress[] = []
      
      await workerManager.importAnkiDeck(
        file,
        mockConfig,
        (progress) => progressUpdates.push(progress)
      )

      // Should receive multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(1)
      
      // Progress should be increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].percentComplete)
          .toBeGreaterThanOrEqual(progressUpdates[i - 1].percentComplete)
      }
    })

    test('should handle empty files gracefully', async () => {
      const file = new File([''], 'empty.apkg')
      
      const result = await workerManager.importAnkiDeck(file, mockConfig)
      
      expect(result.cards).toHaveLength(0)
      expect(result.models).toHaveLength(5) // Mock still returns models
    })

    test('should process large files in chunks', async () => {
      const largeContent = 'x'.repeat(10000)
      const file = new File([largeContent], 'large.apkg')
      const progressUpdates: ImportProgress[] = []
      
      await workerManager.importAnkiDeck(
        file,
        mockConfig,
        (progress) => progressUpdates.push(progress)
      )

      // Should process in multiple chunks
      expect(progressUpdates.length).toBeGreaterThan(5)
      
      // Should handle chunked processing
      const finalProgress = progressUpdates[progressUpdates.length - 1]
      expect(finalProgress.cardsProcessed).toBeGreaterThan(50) // Large file should have many cards
    })
  })

  describe('Error Handling', () => {
    test('should handle worker errors', async () => {
      const file = new File(['test'], 'test.apkg')
      const errorHandler = vi.fn()
      
      // Mock worker to trigger error
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          setTimeout(() => {
            this.onerror?.(new ErrorEvent('error', {
              message: 'Worker crashed',
              filename: this.scriptUrl
            }))
          }, 100)
        }
      }

      await expect(workerManager.importAnkiDeck(file, mockConfig, undefined, errorHandler))
        .rejects.toThrow()

      expect(errorHandler).toHaveBeenCalled()
      
      ;(global as any).Worker = originalWorker
    })

    test('should retry failed imports', async () => {
      const file = new File(['test'], 'test.apkg')
      let attemptCount = 0
      
      // Mock worker to fail first attempts
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          attemptCount++
          if (attemptCount < 3) {
            setTimeout(() => {
              this.onmessage?.({
                data: {
                  type: 'error',
                  id: message.id,
                  data: { error: 'Temporary failure', recoverable: true }
                }
              } as MessageEvent)
            }, 50)
          } else {
            super.postMessage(message)
          }
        }
      }

      const result = await workerManager.importAnkiDeck(file, mockConfig)
      
      expect(attemptCount).toBe(3) // Should retry twice before succeeding
      expect(result).toBeDefined()
      
      ;(global as any).Worker = originalWorker
    })

    test('should fallback to main thread after max retries', async () => {
      const file = new File(['test'], 'test.apkg')
      const errorHandler = vi.fn()
      
      // Mock worker to always fail
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                type: 'error',
                id: message.id,
                data: { error: 'Persistent failure', recoverable: true }
              }
            } as MessageEvent)
          }, 50)
        }
      }

      await expect(workerManager.importAnkiDeck(file, mockConfig, undefined, errorHandler))
        .rejects.toThrow()

      expect(errorHandler).toHaveBeenCalled()
      
      ;(global as any).Worker = originalWorker
    })

    test('should handle timeout errors', async () => {
      const shortTimeoutManager = new WorkerManager({
        ...defaultOptions,
        workerTimeout: 100 // Very short timeout
      })

      const file = new File(['test'], 'test.apkg')
      
      // Mock worker that never responds
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          // Never respond
        }
      }

      await expect(shortTimeoutManager.importAnkiDeck(file, mockConfig))
        .rejects.toThrow(/timeout/i)

      ;(global as any).Worker = originalWorker
      shortTimeoutManager.destroy()
    })
  })

  describe('Task Management', () => {
    test('should queue tasks when all workers are busy', async () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`test${i}`], `test${i}.apkg`)
      )

      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig)
      )

      // With maxWorkers=2, should queue additional tasks
      const stats = workerManager.getWorkerStats()
      expect(stats.queuedTasks + stats.activeImports).toBe(5)

      await Promise.all(promises)
    })

    test('should cancel import tasks', async () => {
      const file = new File(['test'], 'test.apkg')
      const errorHandler = vi.fn()
      
      const importPromise = workerManager.importAnkiDeck(file, mockConfig, undefined, errorHandler)
      
      // Cancel after starting
      setTimeout(() => {
        const activeImports = Array.from((workerManager as any).activeImports.keys())
        if (activeImports.length > 0) {
          workerManager.cancelImport(activeImports[0])
        }
      }, 50)

      await expect(importPromise).rejects.toThrow()
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('cancelled') })
      )
    })

    test('should provide accurate statistics', async () => {
      const files = [
        new File(['test1'], 'test1.apkg'),
        new File(['test2'], 'test2.apkg')
      ]

      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig)
      )

      const stats = workerManager.getWorkerStats()
      expect(stats.activeWorkers).toBeGreaterThan(0)
      expect(stats.activeImports).toBeGreaterThan(0)
      expect(stats.maxWorkers).toBe(2)

      await Promise.all(promises)
    })

    test('should handle concurrent imports efficiently', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        new File([`test${i}`], `test${i}.apkg`)
      )

      const startTime = performance.now()
      
      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig)
      )

      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(results).toHaveLength(10)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
      
      results.forEach(result => {
        expect(result.models).toBeDefined()
        expect(result.cards).toBeDefined()
      })
    })
  })

  describe('Memory Management', () => {
    test('should clean up resources properly', async () => {
      const file = new File(['test'], 'test.apkg')
      
      await workerManager.importAnkiDeck(file, mockConfig)
      
      const statsBefore = workerManager.getWorkerStats()
      
      workerManager.destroy()
      
      const statsAfter = workerManager.getWorkerStats()
      expect(statsAfter.activeWorkers).toBe(0)
      expect(statsAfter.activeImports).toBe(0)
      expect(statsAfter.queuedTasks).toBe(0)
    })

    test('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure with many concurrent imports
      const files = Array.from({ length: 50 }, (_, i) => 
        new File([`test${i}`.repeat(1000)], `large${i}.apkg`)
      )

      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig).catch(err => ({ error: err.message }))
      )

      const results = await Promise.all(promises)
      
      // Most should succeed, some might fail due to resource constraints
      const successful = results.filter(r => !('error' in r))
      const failed = results.filter(r => 'error' in r)
      
      expect(successful.length + failed.length).toBe(50)
      expect(successful.length).toBeGreaterThan(10) // At least some should succeed
    })

    test('should recycle workers to prevent memory leaks', async () => {
      // Process many small files to trigger recycling
      const files = Array.from({ length: 15 }, (_, i) => 
        new File([`test${i}`], `test${i}.apkg`)
      )

      for (const file of files) {
        await workerManager.importAnkiDeck(file, mockConfig)
      }

      const stats = workerManager.getWorkerStats()
      expect(stats.recycleCount).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    test('should handle invalid file types', async () => {
      const file = new File(['not anki data'], 'invalid.txt')
      
      // Should still process but may return empty results
      const result = await workerManager.importAnkiDeck(file, mockConfig)
      expect(result).toBeDefined()
    })

    test('should handle worker message errors', async () => {
      const file = new File(['test'], 'test.apkg')
      const errorHandler = vi.fn()
      
      // Mock worker with message error
      const originalWorker = (global as any).Worker
      ;(global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          setTimeout(() => {
            this.onmessageerror?.(new MessageEvent('messageerror', {
              data: 'Invalid message format'
            }))
          }, 50)
        }
      }

      await expect(workerManager.importAnkiDeck(file, mockConfig, undefined, errorHandler))
        .rejects.toThrow()

      ;(global as any).Worker = originalWorker
    })

    test('should handle rapid successive cancellations', () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`test${i}`], `test${i}.apkg`)
      )

      const promises = files.map(file => 
        workerManager.importAnkiDeck(file, mockConfig)
      )

      // Cancel all imports rapidly
      setTimeout(() => {
        const activeImports = Array.from((workerManager as any).activeImports.keys())
        activeImports.forEach(id => workerManager.cancelImport(id))
      }, 10)

      // Should handle cancellations gracefully without hanging
      return Promise.allSettled(promises).then(results => {
        const rejected = results.filter(r => r.status === 'rejected')
        expect(rejected.length).toBeGreaterThan(0)
      })
    })

    test('should handle worker termination during processing', async () => {
      const file = new File(['test'], 'test.apkg')
      const errorHandler = vi.fn()
      
      const importPromise = workerManager.importAnkiDeck(file, mockConfig, undefined, errorHandler)
      
      // Terminate all workers during processing
      setTimeout(() => {
        (workerManager as any).terminateAllWorkers()
      }, 50)

      await expect(importPromise).rejects.toThrow()
    })
  })
})