import React, { useState } from 'react'
import ProgressBar from './ProgressBar'

const ProgressBarTest: React.FC = () => {
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const startTest = () => {
    setIsRunning(true)
    setProgress(0)
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          return 100
        }
        return prev + 2
      })
    }, 100)
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Progress Bar Test</h3>
      
      <ProgressBar
        progress={progress}
        label="Test Progress"
        className="mb-4"
      />
      
      <button
        onClick={startTest}
        disabled={isRunning}
        className="btn btn-primary disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Start Test'}
      </button>
      
      <div className="mt-2 text-sm text-gray-600">
        Progress: {progress}%
      </div>
    </div>
  )
}

export default ProgressBarTest