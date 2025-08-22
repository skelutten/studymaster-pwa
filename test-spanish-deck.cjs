const fs = require('fs');
const JSZip = require('jszip');
const initSqlJs = require('sql.js');
const path = require('path');

async function testSpanishDeck() {
  try {
    console.log('Testing Spanish_Top_5000_Vocabulary.apkg...');
    
    const filePath = 'Spanish_Top_5000_Vocabulary.apkg';
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    console.log('✓ File size:', fileBuffer.length, 'bytes');
    
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, 'node_modules/sql.js/dist/', file)
    });
    
    // Extract ZIP
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(fileBuffer);
    console.log('✓ ZIP extracted, files:', Object.keys(zipContent.files));
    
    // Get collection.anki2
    const dbFile = zipContent.file('collection.anki2');
    if (!dbFile) {
      console.error('❌ collection.anki2 not found');
      return;
    }
    
    const dbArrayBuffer = await dbFile.async('arraybuffer');
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer));
    console.log('✓ Database loaded');
    
    // Check tables
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tables:', tables[0]?.values?.map(row => row[0]) || 'None');
    
    // Check notes count
    const notesCount = db.exec('SELECT COUNT(*) FROM notes');
    console.log('📝 Notes count:', notesCount[0]?.values[0][0] || 0);
    
    // Check cards count
    const cardsCount = db.exec('SELECT COUNT(*) FROM cards');
    console.log('🃏 Cards count:', cardsCount[0]?.values[0][0] || 0);
    
    // Check notes table structure
    const notesStructure = db.exec("PRAGMA table_info(notes)");
    console.log('📝 Notes table columns:', notesStructure[0]?.values?.map(row => row[1]) || 'None');
    
    // Check cards table structure
    const cardsStructure = db.exec("PRAGMA table_info(cards)");
    console.log('🃏 Cards table columns:', cardsStructure[0]?.values?.map(row => row[1]) || 'None');
    
    // Try different queries to understand the data
    console.log('\n🔍 Testing different queries...');
    
    // Query 1: Basic notes
    try {
      const basicNotes = db.exec('SELECT flds FROM notes LIMIT 3');
      console.log('Query 1 - Basic notes:', basicNotes[0]?.values?.length || 0, 'rows');
      if (basicNotes[0]?.values?.length > 0) {
        basicNotes[0].values.slice(0, 2).forEach((row, i) => {
          const fields = row[0].split('\x1f');
          console.log(`  Sample ${i+1}: ${fields.length} fields, first: "${fields[0]?.substring(0, 50)}..."`);
        });
      }
    } catch (e) {
      console.log('Query 1 failed:', e.message);
    }
    
    // Query 2: Cards with type filter
    try {
      const cardsWithType = db.exec('SELECT type FROM cards LIMIT 10');
      console.log('Query 2 - Card types:', cardsWithType[0]?.values?.map(row => row[0]) || 'None');
    } catch (e) {
      console.log('Query 2 failed:', e.message);
    }
    
    // Query 3: Join query (our current approach)
    try {
      const joinQuery = db.exec(`
        SELECT n.flds, n.tags, c.type
        FROM notes n
        JOIN cards c ON n.id = c.nid
        WHERE c.type >= 0
        ORDER BY n.id
        LIMIT 5
      `);
      console.log('Query 3 - Join query:', joinQuery[0]?.values?.length || 0, 'rows');
      if (joinQuery[0]?.values?.length > 0) {
        joinQuery[0].values.slice(0, 2).forEach((row, i) => {
          const fields = row[0].split('\x1f');
          console.log(`  Join ${i+1}: ${fields.length} fields, first: "${fields[0]?.substring(0, 50)}..."`);
        });
      }
    } catch (e) {
      console.log('Query 3 failed:', e.message);
    }
    
    // Query 4: Try without type filter
    try {
      const noTypeFilter = db.exec(`
        SELECT n.flds, n.tags, c.type
        FROM notes n
        JOIN cards c ON n.id = c.nid
        ORDER BY n.id
        LIMIT 5
      `);
      console.log('Query 4 - No type filter:', noTypeFilter[0]?.values?.length || 0, 'rows');
    } catch (e) {
      console.log('Query 4 failed:', e.message);
    }
    
    // Query 5: Check for suspended cards
    try {
      const suspendedCards = db.exec('SELECT COUNT(*) FROM cards WHERE type < 0');
      console.log('Query 5 - Suspended cards:', suspendedCards[0]?.values[0][0] || 0);
    } catch (e) {
      console.log('Query 5 failed:', e.message);
    }
    
    db.close();
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testSpanishDeck();