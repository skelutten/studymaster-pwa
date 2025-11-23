import { vi } from 'vitest'
import { WorkerManager, WorkerManagerOptions, ImportTask } from '../WorkerManager'
import { ImportConfiguration, ImportProgress, ImportError } from '../../../../../shared/types/anki'

// Mock Worker API
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private terminated = false;
  private processingTimeout: NodeJS.Timeout | null = null;
  
  constructor(public scriptUrl: string) {}

  postMessage(message: any): void {
    if (this.terminated) return;

    if (message.type === 'start') {
      const { id } = message;
      this.processingTimeout = setTimeout(() => {
        if (this.terminated) return; // Check again before sending message
        // Send a progress update
        this.onmessage?.({
          data: {
            type: 'progress',
            id,
            data: { percent: 50 },
          },
        } as MessageEvent);

        // Send completion message
        this.onmessage?.({
          data: {
            type: 'complete',
            id,
            data: {
              models: [],
              cards: [{ id: '1', front: 'Q', back: 'A' }],
              mediaFiles: [],
              summary: {
                modelsImported: 0,
                cardsImported: 1,
                mediaFilesImported: 0,
                duplicatesSkipped: 0,
                securityIssuesFound: 0,
              },
            },
          },
        } as MessageEvent);
      }, 10);
    } else if (message.type === 'cancel') {
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = null;
      }
      this.onmessage?.({
        data: {
          type: 'cancelled',
          id: message.id,
          timestamp: new Date(),
        },
      } as MessageEvent);
    }
  }

  terminate(): void {
    this.terminated = true;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    this.onmessage = null;
    this.onerror?.(new ErrorEvent('error', { message: 'Worker terminated' }));
    this.onmessageerror = null;
  }
}

// Specialized MockWorker for instant task completion
class InstantCompletionMockWorker extends MockWorker {
  constructor(scriptUrl: string) {
    super(scriptUrl);
  }

  postMessage(message: any): void {
    if (this.terminated) return;
    if (message.type === 'start') {
      const { id } = message;
      this.onmessage?.({
        data: {
          type: 'complete',
          id,
          data: {
            models: [],
            cards: [{ id: '1', front: 'Q', back: 'A' }],
            mediaFiles: [],
            summary: {
              modelsImported: 0,
              cardsImported: 1,
              mediaFilesImported: 0,
              duplicatesSkipped: 0,
              securityIssuesFound: 0,
            },
          },
        },
      } as MessageEvent);
    } else if (message.type === 'cancel') {
      this.onmessage?.({
        data: {
          type: 'cancelled',
          id: message.id,
          timestamp: new Date(),
        },
      } as MessageEvent);
    }
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
    test('should successfully import an Anki deck', async () => {
      const file = new File(['test data'], 'test.apkg');
      const progressUpdates: ImportProgress[] = [];
      
      const result = await workerManager.importAnkiDeck(
        file,
        mockConfig,
        (progress) => progressUpdates.push(progress)
      );

      expect(result.cards).toHaveLength(1);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].percentComplete).toBe(50);
    });

    test('should handle empty files gracefully', async () => {
      const file = new File([''], 'empty.apkg');
      const result = await workerManager.importAnkiDeck(file, mockConfig);
      expect(result.cards).toHaveLength(1); // Mock worker always returns 1 card
    });
  });

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
        workerTimeout: 200 // Slightly longer timeout for stability
      });

      const file = new File(['test'], 'test.apkg');
      
      // Mock worker that never responds
      const originalWorker = (global as any).Worker;
      (global as any).Worker = class extends MockWorker {
        postMessage(message: any) {
          // Intentionally do nothing to simulate a hung worker
        }
      };

      await expect(shortTimeoutManager.importAnkiDeck(file, mockConfig))
        .rejects.toThrow('Import timed out');

      (global as any).Worker = originalWorker;
      shortTimeoutManager.destroy();
    });
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
      }, 100)

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
      // Create a specialized MockWorker that completes tasks instantly
      class InstantCompletionMockWorker extends MockWorker {
        postMessage(message: any): void {
          if (this.terminated) return;
          if (message.type === 'start') {
            const { id } = message;
            // Send completion message instantly
            this.onmessage?.({
              data: {
                type: 'complete',
                id,
                data: {
                  models: [],
                  cards: [{ id: '1', front: 'Q', back: 'A' }],
                  mediaFiles: [],
                  summary: {
                    modelsImported: 0,
                    cardsImported: 1,
                    mediaFilesImported: 0,
                    duplicatesSkipped: 0,
                    securityIssuesFound: 0,
                  },
                },
              },
            } as MessageEvent);
          } else if (message.type === 'cancel') {
            this.onmessage?.({
              data: {
                type: 'cancelled',
                id: message.id,
                timestamp: new Date(),
              },
            } as MessageEvent);
          }
        }
      }

      // Use vi.spyOn to mock the Worker constructor
      const mockWorkerSpy = vi.spyOn(global, 'Worker').mockImplementation(
        (scriptUrl: string | URL, options?: WorkerOptions) => new InstantCompletionMockWorker(scriptUrl.toString())
      );

      // Re-instantiate workerManager to use the mocked Worker
      const tempWorkerManager = new WorkerManager(defaultOptions);

      // Simulate memory pressure with many concurrent imports
      const files = Array.from({ length: 50 }, (_, i) => 
        new File([`test${i}`.repeat(1000)], `large${i}.apkg`)
      )

      const promises = files.map(file => 
        tempWorkerManager.importAnkiDeck(file, mockConfig).catch(err => ({ error: err.message }))
      )

      const results = await Promise.all(promises)
      
      // Restore the original Worker mock
      mockWorkerSpy.mockRestore();
      tempWorkerManager.destroy();

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