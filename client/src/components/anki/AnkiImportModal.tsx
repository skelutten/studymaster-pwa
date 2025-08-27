import { useState, useEffect, useRef, useCallback } from 'react'
import { AnkiImportOrchestrator } from '../../services/anki/AnkiImportOrchestrator'
import { ImportConfiguration, ImportProgress, ImportError, ImportSummary } from '../../../../shared/types/anki'

interface AnkiImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (summary: ImportSummary) => void
}

interface ImportState {
  phase: 'idle' | 'configuring' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress?: ImportProgress
  error?: ImportError
  summary?: ImportSummary
  sessionId?: string
}

const AnkiImportModal = ({ isOpen, onClose, onImportComplete }: AnkiImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' })
  const [config, setConfig] = useState<Partial<ImportConfiguration>>({
    chunkSize: 100,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    sanitizationLevel: 'strict',
    mediaOptimization: true,
    skipDuplicateCards: true,
    skipDuplicateModels: true
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const orchestratorRef = useRef<AnkiImportOrchestrator>()

  // Initialize orchestrator
  useEffect(() => {
    if (isOpen && !orchestratorRef.current) {
      orchestratorRef.current = new AnkiImportOrchestrator()
    }
  }, [isOpen])

  // Cleanup orchestrator on unmount
  useEffect(() => {
    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.destroy()
        orchestratorRef.current = undefined
      }
    }
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    const ankiFile = files.find(file => file.name.toLowerCase().endsWith('.apkg'))
    
    if (ankiFile) {
      setSelectedFile(ankiFile)
    } else {
      setImportState({
        phase: 'failed',
        error: {
          type: 'validation',
          severity: 'medium',
          message: 'Please select a valid .apkg file',
          retryable: false,
          timestamp: new Date()
        }
      })
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Start import process
  const handleImport = async () => {
    if (!selectedFile || !orchestratorRef.current) return

    setImportState({ phase: 'processing' })

    try {
      const summary = await orchestratorRef.current.importAnkiDeck(
        selectedFile,
        config,
        (progress: ImportProgress) => {
          setImportState(prev => ({ ...prev, progress }))
        },
        (error: ImportError) => {
          setImportState({
            phase: 'failed',
            error
          })
        }
      )

      setImportState({
        phase: 'completed',
        summary
      })

      onImportComplete?.(summary)
    } catch (error) {
      setImportState({
        phase: 'failed',
        error: {
          type: 'system',
          severity: 'high',
          message: error instanceof Error ? error.message : 'Import failed',
          retryable: true,
          timestamp: new Date()
        }
      })
    }
  }

  // Cancel import
  const handleCancel = () => {
    if (importState.sessionId && orchestratorRef.current) {
      orchestratorRef.current.cancelImport(importState.sessionId)
    }
    handleClose()
  }

  // Retry import
  const handleRetry = () => {
    setImportState({ phase: 'idle' })
  }

  // Close modal and reset state
  const handleClose = () => {
    setSelectedFile(null)
    setImportState({ phase: 'idle' })
    setDragActive(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Import Anki Deck
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Import .apkg files with advanced security and processing features
              </p>
            </div>

            {/* Error Display */}
            {importState.error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-100 rounded">
                <div className="font-medium">Import Error</div>
                <div className="text-sm mt-1">{importState.error.message}</div>
                {importState.error.retryable && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm text-red-800 dark:text-red-200 underline hover:no-underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            {/* File Upload Area */}
            {importState.phase === 'idle' && (
              <div className="space-y-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="text-green-600 dark:text-green-400">
                        ✓ {selectedFile.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-500 dark:text-gray-400">
                        <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        Drop your .apkg file here
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        or click to browse
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".apkg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 btn btn-secondary"
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                </div>

                {/* Configuration Options */}
                {selectedFile && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Import Options</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Chunk Size
                        </label>
                        <select
                          value={config.chunkSize}
                          onChange={(e) => setConfig({...config, chunkSize: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value={50}>50 cards</option>
                          <option value={100}>100 cards</option>
                          <option value={200}>200 cards</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sanitization
                        </label>
                        <select
                          value={config.sanitizationLevel}
                          onChange={(e) => setConfig({...config, sanitizationLevel: e.target.value as ImportConfiguration['sanitizationLevel']})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="strict">Strict</option>
                          <option value="moderate">Moderate</option>
                          <option value="minimal">Minimal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.skipDuplicateCards}
                          onChange={(e) => setConfig({...config, skipDuplicateCards: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Skip duplicate cards
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.mediaOptimization}
                          onChange={(e) => setConfig({...config, mediaOptimization: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Optimize media files
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Processing State */}
            {importState.phase === 'processing' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Importing Deck
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {importState.progress?.currentPhase || 'Processing...'}
                  </p>
                </div>

                {importState.progress && (
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Overall Progress</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {Math.round(importState.progress.percentComplete)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importState.progress.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div className="font-medium text-gray-900 dark:text-white">Cards</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {importState.progress.cardsProcessed} / {importState.progress.cardsFound}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div className="font-medium text-gray-900 dark:text-white">Models</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {importState.progress.modelsProcessed} / {importState.progress.modelsFound}
                        </div>
                      </div>
                    </div>

                    {/* Errors/Warnings */}
                    {(importState.progress.errors?.length > 0 || importState.progress.warnings?.length > 0) && (
                      <div className="space-y-2">
                        {importState.progress.errors?.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 dark:text-red-400">
                            ⚠️ {error.message}
                          </div>
                        ))}
                        {importState.progress.warnings?.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-600 dark:text-yellow-400">
                            ⚠️ {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Completion State */}
            {importState.phase === 'completed' && importState.summary && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Import Completed Successfully
                  </h4>
                </div>

                {/* Import Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Import Summary</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Models Imported:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {importState.summary.modelsImported}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Cards Imported:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {importState.summary.cardsImported}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Duplicates Skipped:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {importState.summary.duplicatesSkipped}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Security Issues:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {importState.summary.securityIssuesFound}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              {importState.phase === 'processing' ? (
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel Import
                </button>
              ) : importState.phase === 'completed' ? (
                <button
                  onClick={handleClose}
                  className="btn btn-primary"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={handleClose}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  {selectedFile && (
                    <button
                      onClick={handleImport}
                      className="btn btn-primary"
                      disabled={importState.phase === 'processing'}
                    >
                      Start Import
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnkiImportModal