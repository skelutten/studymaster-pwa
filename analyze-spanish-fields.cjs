const fs = require('fs');
const JSZip = require('jszip');
const initSqlJs = require('sql.js');
const path = require('path');

async function analyzeFields() {
  try {
    console.log('🔍 Analyzing Spanish deck field structure...');
    
    const fileBuffer = fs.readFileSync('Spanish_Top_5000_Vocabulary.apkg');
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, 'node_modules/sql.js/dist/', file)
    });
    
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(fileBuffer);
    const dbFile = zipContent.file('collection.anki2');
    const dbArrayBuffer = await dbFile.async('arraybuffer');
    const db = new SQL.Database(new Uint8Array(dbArrayBuffer));
    
    // Get sample notes to understand field structure
    const sampleNotes = db.exec('SELECT flds FROM notes LIMIT 3');
    
    console.log('📝 Field structure analysis:');
    sampleNotes[0].values.forEach((row, i) => {
      const fields = row[0].split('\x1f');
      console.log(`\nNote ${i+1}: ${fields.length} fields`);
      fields.forEach((field, j) => {
        const cleanField = field.replace(/<[^>]*>/g, '').trim();
        console.log(`  Field ${j}: "${cleanField.substring(0, 80)}${cleanField.length > 80 ? '...' : ''}"`);
      });
    });
    
    // Test our parsing logic
    console.log('\n🧪 Testing parsing logic...');
    const testQuery = db.exec(`
      SELECT n.flds, n.tags, c.type
      FROM notes n
      JOIN cards c ON n.id = c.nid
      WHERE c.type >= 0
      ORDER BY n.id
      LIMIT 3
    `);
    
    const cards = [];
    if (testQuery.length > 0) {
      for (const row of testQuery[0].values) {
        const fields = row[0].split('\x1f');
        console.log(`\nProcessing: ${fields.length} fields`);
        
        if (fields.length >= 2) {
          // Try different field combinations
          for (let i = 0; i < Math.min(fields.length - 1, 3); i++) {
            for (let j = i + 1; j < Math.min(fields.length, 4); j++) {
              const front = fields[i].replace(/<[^>]*>/g, '').trim();
              const back = fields[j].replace(/<[^>]*>/g, '').trim();
              
              if (front && back && front.length > 0 && back.length > 0) {
                console.log(`  Combination ${i}-${j}: "${front.substring(0, 40)}" → "${back.substring(0, 40)}"`);
                if (cards.length < 3) {
                  cards.push({ front, back, fieldCombo: `${i}-${j}` });
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Found ${cards.length} valid card combinations`);
    cards.forEach((card, i) => {
      console.log(`Card ${i+1} (${card.fieldCombo}): "${card.front}" → "${card.back}"`);
    });
    
    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeFields();