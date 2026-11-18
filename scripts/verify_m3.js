const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verifyM3() {
  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome for Milestone 3 verification...');

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

  // 1. Click Library Tab
  console.log('Navigating to Library Tab...');
  const buttons = await page.$$('[role="button"]');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Library')) {
      await btn.click();
      console.log('Clicked Library tab');
      break;
    }
  }

  await sleep(2500);

  // Screenshot 1: Library Screen with Local Lossless Files
  const libraryScreenshot = path.join(screenshotsDir, 'm3_library_screen.png');
  await page.screenshot({ path: libraryScreenshot });
  console.log(`Saved Library Screen to ${libraryScreenshot}`);

  // 2. Click "New" to create a playlist
  console.log('Opening "New Playlist" modal...');
  const newButtons = await page.$$('[role="button"]');
  for (const btn of newButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.trim() === 'New') {
      await btn.click();
      break;
    }
  }

  await sleep(1000);
  const titleInput = await page.$('input[placeholder="Playlist Title"]');
  if (titleInput) {
    await titleInput.type('Chill Sunday Vibes');
    const createBtn = await page.$$('[role="button"]');
    for (const b of createBtn) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text && text.trim() === 'Create') {
        await b.click();
        console.log('Created playlist "Chill Sunday Vibes"');
        break;
      }
    }
  }

  await sleep(2000);

  // Screenshot 2: Updated Library with Playlists
  const playlistsScreenshot = path.join(screenshotsDir, 'm3_library_playlists_created.png');
  await page.screenshot({ path: playlistsScreenshot });
  console.log(`Saved Library Playlists to ${playlistsScreenshot}`);

  // 3. Click the local lossless track to test Lossless playback
  console.log('Playing local lossless audio track...');
  const allCards = await page.$$('[role="button"]');
  for (const card of allCards) {
    const text = await page.evaluate(el => el.innerText, card);
    if (text && text.includes('acoustic_resonance')) {
      await card.click();
      console.log('Clicked local track "acoustic_resonance"');
      break;
    }
  }

  await sleep(3500);

  // Screenshot 3: Active playback with Lossless audio badge
  const losslessScreenshot = path.join(screenshotsDir, 'm3_lossless_now_playing.png');
  await page.screenshot({ path: losslessScreenshot });
  console.log(`Saved Lossless Audio playback state to ${losslessScreenshot}`);

  await browser.close();
  console.log('Milestone 3 verification completed successfully!');
}

verifyM3().catch(err => {
  console.error('Milestone 3 verification failed:', err);
  process.exit(1);
});
