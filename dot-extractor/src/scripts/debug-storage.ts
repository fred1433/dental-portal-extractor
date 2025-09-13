import { chromium } from 'playwright';

async function debugStorage() {
  console.log('🔍 Debugging localStorage content...\n');
  
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: 'dot-storage.json' });
  const page = await ctx.newPage();
  
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', { 
    waitUntil: 'domcontentloaded' 
  });

  const storageData = await page.evaluate(() => {
    // @ts-ignore
    const storage = localStorage;
    const result: Record<string, any> = {};
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        try {
          result[key] = JSON.parse(value!);
        } catch {
          result[key] = value;
        }
      }
    }
    
    return result;
  });

  await browser.close();

  console.log('localStorage keys found:');
  Object.keys(storageData).forEach(key => {
    console.log(`  - ${key}`);
  });
  
  console.log('\n📦 Full localStorage content:');
  console.log(JSON.stringify(storageData, null, 2));
  
  // Look for tokens in the data
  console.log('\n🔑 Searching for tokens...');
  
  for (const [key, value] of Object.entries(storageData)) {
    if (typeof value === 'object' && value !== null) {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.includes('accessToken') || jsonStr.includes('Bearer') || jsonStr.includes('idToken')) {
        console.log(`\n✅ Found potential token in key: ${key}`);
        console.log('Value:', JSON.stringify(value, null, 2).substring(0, 500));
      }
    }
  }
}

debugStorage();