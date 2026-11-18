const puppeteer = require('puppeteer-core');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to Sonora...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Searching "Yellow"...');
  const input = await page.$('input');
  if (input) await input.type('Yellow');
  await new Promise(r => setTimeout(r, 3000));

  // Click the track
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div[tabindex="0"]'));
    const track = tabs.find(t => t.textContent.includes('Yellow') && t.textContent.includes('Coldplay'));
    if (track) track.click();
  });

  console.log('Waiting for stream resolution...');
  await new Promise(r => setTimeout(r, 4000));

  // Check state of all audio elements in page
  const audioInfo = await page.evaluate(async () => {
    // In ExponentAV.web.js, media is an Audio element.
    // Let's find all Audio elements via PerformanceObserver or Object inspection
    // If not in DOM, Audio elements created with new Audio() can be triggered
    return {
      title: document.title
    };
  });

  // Now let's click the Play/Pause button on the MiniPlayer
  console.log('Clicking Play/Pause button on MiniPlayer...');
  const clickedPlay = await page.evaluate(() => {
    // The miniplayer play/pause button is inside the bottom floating bar
    const buttons = Array.from(document.querySelectorAll('div[tabindex="0"], div[role="button"]'));
    // Find the miniplayer controls
    const playBtn = buttons.find(b => {
      // Find SVG play or pause icon inside
      const svg = b.querySelector('svg');
      return svg && b.closest('div[style*="position: absolute"]');
    });
    if (playBtn) {
      playBtn.click();
      return { success: true };
    }
    return { success: false, buttonCount: buttons.length };
  });

  console.log('Clicked Play button:', clickedPlay);
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
