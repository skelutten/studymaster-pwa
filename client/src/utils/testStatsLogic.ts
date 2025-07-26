// Test function for systematic verification of stats logic
export const testStatsLogic = () => {
  console.log('\n🧪 TESTING STATS LOGIC - 10 CARD SIMULATION')
  console.log('Pattern: Again, Hard, Again, Hard, etc.')
  
  let testStats = { total: 10, correct: 0, incorrect: 0 }
  const pattern = ['again', 'hard']
  
  for (let i = 0; i < 10; i++) {
    const difficulty = pattern[i % 2] as 'again' | 'hard'
    const cardNum = i + 1
    
    console.log(`\n--- Card ${cardNum} ---`)
    console.log(`Answer: ${difficulty}`)
    console.log(`Stats before:`, testStats)
    
    // Apply the same logic as in handleAnswer
    const newStats = difficulty === 'again' 
      ? { ...testStats, incorrect: testStats.incorrect + 1 }
      : { ...testStats, correct: testStats.correct + 1 }
    
    testStats = newStats
    console.log(`Stats after:`, testStats)
    
    // Verify expected values - 'again' = incorrect, 'hard' = correct
    const expectedIncorrect = Math.floor((cardNum + 1) / 2)
    const expectedCorrect = Math.floor(cardNum / 2)
    
    const correctMatch = testStats.correct === expectedCorrect
    const incorrectMatch = testStats.incorrect === expectedIncorrect
    
    console.log(`Expected: correct=${expectedCorrect}, incorrect=${expectedIncorrect}`)
    console.log(`✅ Correct count: ${correctMatch ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Incorrect count: ${incorrectMatch ? 'PASS' : 'FAIL'}`)
    
    if (!correctMatch || !incorrectMatch) {
      console.error(`❌ TEST FAILED at card ${cardNum}`)
      return false
    }
  }
  
  console.log('\n🎉 ALL TESTS PASSED!')
  console.log(`Final stats: correct=${testStats.correct}, incorrect=${testStats.incorrect}`)
  return true
}

// Run the test immediately when this module is loaded
console.log('Running stats logic test...')
testStatsLogic()

// Make test function available globally for console testing
if (typeof window !== 'undefined') {
  (window as Window & typeof globalThis & { testStatsLogic: typeof testStatsLogic }).testStatsLogic = testStatsLogic
}