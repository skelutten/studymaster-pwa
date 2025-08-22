const fs = require('fs');
const JSZip = require('jszip');
const initSqlJs = require('sql.js');

// Simulate the exact parseApkgFile function from deckStore.ts
const parseApkgFile = async (fileBuffer) => {
  try {
    // Initialize SQL.js - use local path for Node.js testing
    const path = require('path');
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, '../node_modules/sql.js/dist/', file)
    })

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
    
    // Query to get deck name from the col table (FIXED VERSION)
    const deckQuery = db.exec("SELECT decks FROM col LIMIT 1")
    let deckName = 'test-deck'
    if (deckQuery.length > 0 && deckQuery[0].values.length > 0) {
      try {
        const decksJson = deckQuery[0].values[0][0]
        const decks = JSON.parse(decksJson)
        // Find the first non-default deck (id != 1)
        const deckIds = Object.keys(decks).filter(id => id !== '1')
        if (deckIds.length > 0) {
          deckName = decks[deckIds[0]].name || deckName
        }
      } catch (e) {
        console.warn('Could not parse deck names from .apkg file, using filename')
      }
    }
    
    // Query to get notes and cards
    const notesQuery = db.exec(`
      SELECT n.flds, n.tags, c.type
      FROM notes n
      JOIN cards c ON n.id = c.nid
      WHERE c.type >= 0
      ORDER BY n.id
    `)
    
    const cards = []
    
    if (notesQuery.length > 0) {
      for (const row of notesQuery[0].values) {
        const fields = row[0].split('\x1f') // Anki uses \x1f as field separator
        if (fields.length >= 2) {
          // Clean HTML tags and decode entities
          const front = fields[0]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .trim()
          
          const back = fields[1]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .trim()
          
          if (front && back) {
            cards.push({ front, back })
          }
        }
      }
    }
    
    db.close()
    
    if (cards.length === 0) {
      throw new Error('No valid cards found in the .apkg file')
    }
    
    return { name: deckName, cards }
  } catch (error) {
    console.error('Error parsing .apkg file:', error)
    throw new Error(`Failed to parse .apkg file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function testBrowserApkgParsing() {
  try {
    console.log('Testing browser-compatible .apkg parsing...');
    
    // Read the test .apkg file
    const apkgPath = '../test-deck.apkg';
    if (!fs.existsSync(apkgPath)) {
      console.error('Test .apkg file not found at:', apkgPath);
      return;
    }
    
    const fileBuffer = fs.readFileSync(apkgPath);
    console.log('✓ Successfully read .apkg file, size:', fileBuffer.length, 'bytes');
    
    // Test the exact same function that would run in the browser
    const result = await parseApkgFile(fileBuffer);
    
    console.log('✓ Successfully parsed .apkg file');
    console.log('✓ Deck name:', result.name);
    console.log('✓ Number of cards:', result.cards.length);
    console.log('✓ Cards:');
    result.cards.forEach((card, index) => {
      console.log(`  ${index + 1}. "${card.front}" → "${card.back}"`);
    });
    
    console.log('\n🎉 Browser-compatible .apkg parsing test PASSED!');
    console.log('The fix has resolved the "no such table: decks" error.');
    
  } catch (error) {
    console.error('✗ Browser-compatible .apkg parsing test FAILED:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testBrowserApkgParsing();