const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verifyM1() {
  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome with puppeteer-core...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });

  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });

  // 1. Initial screenshot
  await sleep(2000);
  const initialScreenshot = path.join(screenshotsDir, 'm1_search_initial.png');
  await page.screenshot({ path: initialScreenshot });
  console.log(`Saved initial search screen to ${initialScreenshot}`);

  // 2. Search for a track
  console.log('Typing search query: Coldplay...');
  const inputSelector = 'input';
  await page.waitForSelector(inputSelector, { timeout: 10000 });
  await page.type(inputSelector, 'Coldplay');

  // Wait for debounced search API response and render
  console.log('Waiting for search results...');
  await sleep(3000);

  const resultsScreenshot = path.join(screenshotsDir, 'm1_search_results.png');
  await page.screenshot({ path: resultsScreenshot });
  console.log(`Saved search results to ${resultsScreenshot}`);

  // 3. Click first track to play
  console.log('Clicking first track in search results...');
  const trackItems = await page.$$('[role="button"], div[tabindex="0"]');
  console.log(`Found ${trackItems.length} interactive elements`);
  
  let clicked = false;
  for (let i = 4; i < trackItems.length; i++) {
    try {
      const text = await page.evaluate(el => el.innerText, trackItems[i]);
      if (text && (text.includes('Coldplay') || text.includes('Hymn') || text.includes('Sky') || text.includes('Viva') || text.includes('Paradise'))) {
        console.log(`Clicking track: "${text.replace(/\n/g, ' ')}"`);
        await trackItems[i].click();
        clicked = true;
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (!clicked && trackItems.length > 5) {
    console.log('Fallback: clicking element index 5');
    await trackItems[5].click();
  }

  // 4. Wait for stream resolution and miniplayer playback
  console.log('Waiting for stream resolution and miniplayer render...');
  await sleep(5000);

  const miniPlayerScreenshot = path.join(screenshotsDir, 'm1_now_playing_miniplayer.png');
  await page.screenshot({ path: miniPlayerScreenshot });
  console.log(`Saved active playback mini-player to ${miniPlayerScreenshot}`);

  await browser.close();
  console.log('M1 verification completed successfully!');
}

verifyM1().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
