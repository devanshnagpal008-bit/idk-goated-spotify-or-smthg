const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verifyM2() {
  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome for Milestone 2 verification...');

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

  // 1. Search and start playback
  console.log('Searching for "Dua Lipa Levitating"...');
  const inputSelector = 'input';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'Dua Lipa Levitating');
  await sleep(3000);

  // Click first track in results
  console.log('Clicking track to start audio playback...');
  const trackItems = await page.$$('[role="button"], div[tabindex="0"]');
  for (let i = 4; i < trackItems.length; i++) {
    try {
      const text = await page.evaluate(el => el.innerText, trackItems[i]);
      if (text && text.includes('Levitating')) {
        console.log(`Found track: ${text.replace(/\n/g, ' ')}`);
        await trackItems[i].click();
        break;
      }
    } catch (e) {}
  }

  // Wait for stream resolution and mini-player
  await sleep(5000);

  // 2. Click MiniPlayer to expand full-screen Now Playing sheet
  console.log('Clicking MiniPlayer to expand Now Playing Sheet...');
  const miniPlayerSelector = 'div[style*="rgba(28, 28, 30"]';
  const miniPlayer = await page.$(miniPlayerSelector) || (await page.$$('[role="button"]'))[trackItems.length - 1];
  
  // Find mini player in page
  const buttons = await page.$$('[role="button"]');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Levitating')) {
      await btn.click();
      console.log('Clicked mini-player!');
      break;
    }
  }

  await sleep(2500);

  // Screenshot 1: Full-Screen Now Playing Sheet
  const nowPlayingScreenshot = path.join(screenshotsDir, 'm2_now_playing_sheet.png');
  await page.screenshot({ path: nowPlayingScreenshot });
  console.log(`Saved Now Playing sheet to ${nowPlayingScreenshot}`);

  // 3. Open Queue Drawer
  console.log('Opening Queue Drawer...');
  // Click queue icon button in Now Playing sheet
  const allIcons = await page.$$('[role="button"]');
  if (allIcons.length > 0) {
    // Click last button (Queue button)
    await allIcons[allIcons.length - 1].click();
    await sleep(2000);

    const queueScreenshot = path.join(screenshotsDir, 'm2_queue_drawer.png');
    await page.screenshot({ path: queueScreenshot });
    console.log(`Saved Queue Drawer to ${queueScreenshot}`);

    // Close Queue Drawer
    const closeButtons = await page.$$('[role="button"]');
    for (const b of closeButtons) {
      const aria = await page.evaluate(el => el.getAttribute('aria-label') || el.innerText, b);
      if (aria === '' && (await page.evaluate(el => el.offsetWidth, b)) === 36) {
        await b.click();
        break;
      }
    }
    await sleep(1500);
  }

  // 4. Open Audio Settings & Equalizer Modal
  console.log('Opening Audio Settings Modal...');
  const buttonsAfter = await page.$$('[role="button"]');
  // First button in top right of Now Playing or bottom left
  for (const b of buttonsAfter) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text === '') {
      const bounds = await b.boundingBox();
      if (bounds && bounds.x > 350 && bounds.y < 80) {
        await b.click();
        console.log('Clicked Audio Settings button');
        break;
      }
    }
  }

  await sleep(2000);
  const audioSettingsScreenshot = path.join(screenshotsDir, 'm2_audio_settings_eq.png');
  await page.screenshot({ path: audioSettingsScreenshot });
  console.log(`Saved Audio Settings EQ to ${audioSettingsScreenshot}`);

  await browser.close();
  console.log('Milestone 2 verification completed successfully!');
}

verifyM2().catch(err => {
  console.error('Milestone 2 verification failed:', err);
  process.exit(1);
});
