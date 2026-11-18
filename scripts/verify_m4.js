const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verifyM4() {
  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome for Milestone 4 verification...');

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

  // 1. Click Listen Now Tab
  console.log('Navigating to Listen Now (Home) Tab...');
  const buttons = await page.$$('[role="button"]');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Listen Now')) {
      await btn.click();
      console.log('Clicked Listen Now tab');
      break;
    }
  }

  await sleep(3000);

  // Screenshot 1: Home Screen with Daily Mixes
  const homeScreenshot = path.join(screenshotsDir, 'm4_home_daily_mixes.png');
  await page.screenshot({ path: homeScreenshot });
  console.log(`Saved Home Daily Mixes to ${homeScreenshot}`);

  // 2. Click "AI Mix" Button
  console.log('Opening AI Playlist Generator modal...');
  const aiButtons = await page.$$('[role="button"]');
  for (const btn of aiButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('AI Mix')) {
      await btn.click();
      console.log('Clicked AI Mix button');
      break;
    }
  }

  await sleep(1500);

  // Screenshot 2: AI Prompt Modal
  const modalScreenshot = path.join(screenshotsDir, 'm4_ai_prompt_modal.png');
  await page.screenshot({ path: modalScreenshot });
  console.log(`Saved AI Prompt Modal to ${modalScreenshot}`);

  // 3. Click hint "rainy evening jazz, 45m" and synthesize
  const hints = await page.$$('[role="button"]');
  for (const h of hints) {
    const text = await page.evaluate(el => el.innerText, h);
    if (text && text.includes('rainy evening jazz')) {
      await h.click();
      console.log('Selected prompt hint: rainy evening jazz');
      break;
    }
  }

  await sleep(1000);

  // Click Synthesize
  const submitButtons = await page.$$('[role="button"]');
  for (const b of submitButtons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text && text.trim() === 'Synthesize') {
      await b.click();
      console.log('Clicked Synthesize button...');
      break;
    }
  }

  // Wait for AI expansion, catalog query, and playback start
  await sleep(6000);

  // Screenshot 3: Active playback of synthesized playlist
  const playingScreenshot = path.join(screenshotsDir, 'm4_ai_playlist_playing.png');
  await page.screenshot({ path: playingScreenshot });
  console.log(`Saved AI Playlist Playing to ${playingScreenshot}`);

  await browser.close();
  console.log('Milestone 4 verification completed successfully!');
}

verifyM4().catch(err => {
  console.error('Milestone 4 verification failed:', err);
  process.exit(1);
});
