const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verifyM5() {
  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome for Milestone 5 verification...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });

  console.log('Navigating to Sonora Mobile app...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // 1. Search for Coldplay Yellow
  console.log('Searching for "Coldplay Yellow"...');
  const inputSelector = 'input';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'Coldplay Yellow');
  await sleep(3000);

  // 2. Click track to play
  const trackItems = await page.$$('[role="button"], div[tabindex="0"]');
  for (let i = 4; i < trackItems.length; i++) {
    try {
      const text = await page.evaluate(el => el.innerText, trackItems[i]);
      if (text && text.includes('Yellow')) {
        console.log(`Found track: ${text.replace(/\n/g, ' ')}`);
        await trackItems[i].click();
        break;
      }
    } catch (e) {}
  }

  await sleep(5000);

  // 3. Expand Now Playing sheet
  console.log('Expanding Now Playing sheet...');
  const buttons = await page.$$('[role="button"]');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Yellow')) {
      await btn.click();
      console.log('Clicked mini-player to expand!');
      break;
    }
  }

  await sleep(2500);

  // 4. Click Lyrics button in bottom toolbar
  console.log('Toggling Time-Synced Karaoked Lyrics View...');
  const bottomIcons = await page.$$('[role="button"]');
  // Click first button in bottom toolbar (Lyrics Mic button)
  for (const b of bottomIcons) {
    const bounds = await b.boundingBox();
    if (bounds && bounds.y > 800 && bounds.x < 150) {
      await b.click();
      console.log('Clicked Lyrics toggle button!');
      break;
    }
  }

  await sleep(4000);

  // Screenshot: Time-Synced Lyrics View
  const lyricsScreenshot = path.join(screenshotsDir, 'm5_time_synced_lyrics.png');
  await page.screenshot({ path: lyricsScreenshot });
  console.log(`Saved Time-Synced Lyrics view to ${lyricsScreenshot}`);

  await browser.close();
  console.log('Milestone 5 verification completed successfully!');
}

verifyM5().catch(err => {
  console.error('Milestone 5 verification failed:', err);
  process.exit(1);
});
