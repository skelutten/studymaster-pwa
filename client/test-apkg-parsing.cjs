const fs = require('fs');
const JSZip = require('jszip');
const initSqlJs = require('sql.js');

async function testApkgParsing() {
  try {
    console.log('Testing .apkg parsing functionality...');
    
    // Read the test .apkg file
    const apkgPath = '../test-deck.apkg';
    if (!fs.existsSync(apkgPath)) {
      console.error('Test .apkg file not found at:', apkgPath);
      return;
    }
    
    const fileBuffer = fs.readFileSync(apkgPath);
    console.log('✓ Successfully read .apkg file, size:', fileBuffer.length, 'bytes');
    
    // Extract ZIP contents
    const zip = await JSZip.loadAsync(fileBuffer);
    console.log('✓ Successfully loaded ZIP file');
    console.log('ZIP contents:', Object.keys(zip.files));
    
    // Check for collection.anki2
    const collectionFile = zip.files['collection.anki2'];
    if (!collectionFile) {
      console.error('✗ collection.anki2 not found in ZIP');
      return;
    }
    console.log('✓ Found collection.anki2 in ZIP');
    
    // Extract the SQLite database
    const dbBuffer = await collectionFile.async('arraybuffer');
    console.log('✓ Extracted SQLite database, size:', dbBuffer.byteLength, 'bytes');
    
    // Initialize sql.js
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(dbBuffer));
    console.log('✓ Successfully opened SQLite database');
    
    // Query deck information
    const deckQuery = `
      SELECT decks FROM col LIMIT 1
    `;
    const deckResult = db.exec(deckQuery);
    if (deckResult.length > 0) {
      const decksJson = deckResult[0].values[0][0];
      const decks = JSON.parse(decksJson);
      console.log('✓ Found decks:', Object.keys(decks).map(id => decks[id].name));
    }
    
    // Query notes and cards
    const notesQuery = `
      SELECT n.flds, n.tags, c.did 
      FROM notes n 
      JOIN cards c ON n.id = c.nid 
      LIMIT 10
    `;
    const notesResult = db.exec(notesQuery);
    
    if (notesResult.length > 0) {
      console.log('✓ Found', notesResult[0].values.length, 'cards');
      
      const cards = notesResult[0].values.map(row => {
        const [flds, tags, did] = row;
        const fields = flds.split('\x1f');
        return {
          front: fields[0] || '',
          back: fields[1] || '',
          tags: tags || '',
          deckId: did
        };
      });
      
      console.log('✓ Parsed cards:');
      cards.forEach((card, index) => {
        console.log(`  ${index + 1}. Front: "${card.front}" | Back: "${card.back}"`);
      });
      
      console.log('\n🎉 .apkg parsing test completed successfully!');
      console.log('The implementation should work correctly for importing .apkg files.');
      
    } else {
      console.log('✗ No cards found in database');
    }
    
    db.close();
    
  } catch (error) {
    console.error('✗ Error during .apkg parsing test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testApkgParsing();