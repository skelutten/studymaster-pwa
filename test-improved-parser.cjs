const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const initSqlJs = require('sql.js');

// Helper function to clean field content (same as in deckStore.ts)
const cleanFieldContent = (content) => {
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\[sound:[^\]]*\]/g, '') // Remove sound references
    .trim()
}

// Helper function to detect the best field combination (same as in deckStore.ts)
const detectBestFieldCombination = (sampleFields) => {
  if (sampleFields.length === 0) {
    return { frontIndex: 0, backIndex: 1 }
  }
  
  const fieldCount = sampleFields[0].length
  const combinations = []
  
  console.log(`🔍 Analyzing ${sampleFields.length} sample notes with ${fieldCount} fields each...`)
  
  // Try different field combinations
  for (let front = 0; front < fieldCount; front++) {
    for (let back = front + 1; back < fieldCount; back++) {
      let score = 0
      let validPairs = 0
      
      for (const fields of sampleFields) {
        const frontContent = cleanFieldContent(fields[front] || '')
        const backContent = cleanFieldContent(fields[back] || '')
        
        // Score based on content quality
        if (frontContent && backContent) {
          validPairs++
          
          // Prefer combinations where both fields have substantial content
          if (frontContent.length > 2 && backContent.length > 2) {
            score += 10
          }
          
          // Prefer combinations where fields are different
          if (frontContent !== backContent) {
            score += 5
          }
          
          // Avoid fields that look like audio references or numbers only
          if (!frontContent.match(/^\[sound:/) && !backContent.match(/^\[sound:/)) {
            score += 3
          }
          
          if (!frontContent.match(/^\d+$/) && !backContent.match(/^\d+$/)) {
            score += 2
          }
        }
      }
      
      // Normalize score by number of valid pairs
      const normalizedScore = validPairs > 0 ? score / validPairs : 0
      combinations.push({ frontIndex: front, backIndex: back, score: normalizedScore, validPairs })
      
      console.log(`  Combination ${front}->${back}: ${validPairs} valid pairs, score: ${normalizedScore.toFixed(2)}`)
    }
  }
  
  // Sort by score and return the best combination
  combinations.sort((a, b) => b.score - a.score)
  
  if (combinations.length > 0 && combinations[0].score > 0) {
    console.log(`✅ Best field combination: ${combinations[0].frontIndex} -> ${combinations[0].backIndex} (score: ${combinations[0].score.toFixed(2)})`)
    return { frontIndex: combinations[0].frontIndex, backIndex: combinations[0].backIndex }
  }
  
  // Fallback to 0->1 or 0->2 if available
  if (fieldCount >= 3) {
    console.log(`⚠️ Using fallback: 0 -> 2`)
    return { frontIndex: 0, backIndex: 2 }
  }
  console.log(`⚠️ Using fallback: 0 -> 1`)
  return { frontIndex: 0, backIndex: 1 }
}

// Test the improved parsing logic
async function testImprovedParser() {
  try {
    console.log('🚀 Testing improved .apkg parser...')
    
    // Check if the Spanish deck file exists
    const apkgPath = path.join(__dirname, 'Spanish_Top_5000_Vocabulary.apkg')
    if (!fs.existsSync(apkgPath)) {
      console.error('❌ Spanish_Top_5000_Vocabulary.apkg not found!')
      return
    }
    
    console.log('📁 Loading Spanish vocabulary deck...')
    
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
    })

    // Read the .apkg file
    const fileBuffer = fs.readFileSync(apkgPath)
    
    // Extract the ZIP file
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(fileBuffer)
    
    // Get the collection.anki2 file (SQLite database)
    const dbFile = zipContent.file('collection.anki2')
    if (!dbFile) {
      throw new Error('Invalid .apkg file: collection.anki2 not found')
    }
    
    // Read the database file
    const dbArrayBuffer = await dbFile.async('arraybuffer')
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer))
    
    // Query to get deck name
    const deckQuery = db.exec("SELECT decks FROM col LIMIT 1")
    let deckName = 'Spanish_Top_5000_Vocabulary'
    if (deckQuery.length > 0 && deckQuery[0].values.length > 0) {
      try {
        const decksJson = deckQuery[0].values[0][0]
        const decks = JSON.parse(decksJson)
        const deckIds = Object.keys(decks).filter(id => id !== '1')
        if (deckIds.length > 0) {
          deckName = decks[deckIds[0]].name || deckName
        }
      } catch (e) {
        console.warn('Could not parse deck names, using filename')
      }
    }
    
    console.log(`📚 Deck name: ${deckName}`)
    
    // Query to get notes and cards
    const notesQuery = db.exec(`
      SELECT n.flds, n.tags, c.type
      FROM notes n
      JOIN cards c ON n.id = c.nid
      WHERE c.type >= 0
      ORDER BY n.id
    `)
    
    if (notesQuery.length === 0) {
      throw new Error('No notes found in database')
    }
    
    console.log(`📊 Found ${notesQuery[0].values.length} total cards`)
    
    // Analyze a sample of fields to determine the best field combination
    const sampleSize = Math.min(10, notesQuery[0].values.length)
    const sampleFields = []
    
    console.log(`🔬 Analyzing first ${sampleSize} notes for field structure...`)
    
    for (let i = 0; i < sampleSize; i++) {
      const fields = notesQuery[0].values[i][0].split('\x1f')
      sampleFields.push(fields)
      
      console.log(`Note ${i + 1}: ${fields.length} fields`)
      fields.forEach((field, index) => {
        const cleaned = cleanFieldContent(field)
        console.log(`  Field ${index}: "${cleaned.substring(0, 50)}${cleaned.length > 50 ? '...' : ''}"`)
      })
    }
    
    // Detect the best field combination
    const { frontIndex, backIndex } = detectBestFieldCombination(sampleFields)
    
    // Process all cards using the detected field combination
    const cards = []
    let processedCount = 0
    let skippedCount = 0
    
    console.log(`\n🔄 Processing all cards using field combination ${frontIndex} -> ${backIndex}...`)
    
    for (const row of notesQuery[0].values) {
      const fields = row[0].split('\x1f')
      
      if (fields.length > Math.max(frontIndex, backIndex)) {
        const front = cleanFieldContent(fields[frontIndex] || '')
        const back = cleanFieldContent(fields[backIndex] || '')
        
        if (front && back && front !== back) {
          cards.push({ front, back })
          processedCount++
          
          // Show first few examples
          if (processedCount <= 5) {
            console.log(`  Card ${processedCount}: "${front}" → "${back}"`)
          }
        } else {
          skippedCount++
        }
      } else {
        skippedCount++
      }
    }
    
    db.close()
    
    console.log(`\n✅ Parsing completed!`)
    console.log(`📈 Successfully parsed: ${processedCount} cards`)
    console.log(`⚠️ Skipped: ${skippedCount} cards`)
    console.log(`📊 Success rate: ${((processedCount / (processedCount + skippedCount)) * 100).toFixed(1)}%`)
    
    if (cards.length === 0) {
      throw new Error('No valid cards found in the .apkg file')
    }
    
    // Show some sample cards
    console.log(`\n📝 Sample cards:`)
    for (let i = 0; i < Math.min(10, cards.length); i++) {
      console.log(`${i + 1}. "${cards[i].front}" → "${cards[i].back}"`)
    }
    
    return { name: deckName, cards, totalProcessed: processedCount, totalSkipped: skippedCount }
    
  } catch (error) {
    console.error('❌ Error testing parser:', error.message)
    throw error
  }
}

// Run the test
testImprovedParser()
  .then(result => {
    console.log(`\n🎉 Test completed successfully!`)
    console.log(`Final result: ${result.cards.length} cards ready for import`)
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message)
    process.exit(1)
  })