import { DotExtractor } from '../extractors/dotExtractor';
import * as fs from 'fs';
import * as path from 'path';

async function testJustin() {
  console.log('🚀 Testing extraction for Justin Paterson\n');
  console.log('=' .repeat(50) + '\n');
  
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize('dot-storage.json');
    
    // Test with Justin Paterson
    const results = await extractor.extractFullData({
      memberId: '950551249',
      firstName: 'Justin',
      lastName: 'Paterson',
      birthDate: '12/29/1989',
      fromDate: '2024-01-01T00:00:00Z',
      toDate: '2025-09-13T00:00:00Z',
      allFamily: true
    });
    
    // Save results
    const outputDir = 'out';
    fs.mkdirSync(outputDir, { recursive: true });
    
    const filename = `extraction-justin-paterson-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    console.log('\n✨ Extraction completed!');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  } finally {
    await extractor.close();
  }
}

testJustin().catch(console.error);