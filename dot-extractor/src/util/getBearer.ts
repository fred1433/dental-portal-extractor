import { chromium } from 'playwright';

export async function getBearerFromStorage(storagePath = 'dot-storage.json') {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: storagePath });
  const page = await ctx.newPage();

  let bearer: string | undefined;
  page.on('request', req => {
    const auth = req.headers()['authorization'];
    if (auth?.startsWith('Bearer ')) {
      bearer = auth.slice(7);
    }
  });

  // 1) Navigate to home (session loaded)
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', { 
    waitUntil: 'domcontentloaded' 
  });

  // 2) Navigate to member-search which triggers API calls
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-search', {
    waitUntil: 'networkidle'
  });

  // 3) Wait briefly to capture the Authorization header
  const t0 = Date.now();
  while (!bearer && Date.now() - t0 < 2000) {
    await page.waitForTimeout(100);
  }

  await browser.close();
  
  if (!bearer) {
    throw new Error('Bearer token not captured (session expired?). Run `npm run login` then retry.');
  }
  
  console.log('✅ Bearer token captured successfully');
  return bearer;
}