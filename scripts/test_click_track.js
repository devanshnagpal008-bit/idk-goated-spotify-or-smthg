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

  console.log('Typing "Yellow"...');
  const input = await page.$('input');
  if (input) await input.type('Yellow');
  await new Promise(r => setTimeout(r, 3000));

  // Click the Yellow track
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div[tabindex="0"]'));
    const track = tabs.find(t => {
      const txt = t.textContent.trim();
      return txt.includes('Yellow') && txt.includes('Coldplay');
    });
    if (track) {
      track.click();
      return { success: true, text: track.textContent.trim().slice(0, 60) };
    }
    return { success: false };
  });

  console.log('Track Clicked:', clicked);
  
  // Wait 4 seconds for stream resolution & sound init
  await new Promise(r => setTimeout(r, 4000));

  // Inspect the MiniPlayer UI in DOM
  const miniPlayerUI = await page.evaluate(() => {
    // Find miniplayer text
    const textNodes = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.includes('Coldplay'))
      .map(el => ({ tag: el.tagName, text: el.textContent.trim() }));

    // Find any audio elements in window or document
    return {
      textNodes: textNodes.slice(-5)
    };
  });

  console.log('UI after click:', JSON.stringify(miniPlayerUI, null, 2));

  // Take a screenshot of the playing screen
  await page.screenshot({ path: 'C:\\Users\\techn\\.gemini\\antigravity\\scratch\\sonora\\docs\\screenshots\\test_playing_now.png' });
  console.log('Screenshot saved to test_playing_now.png');

  await browser.close();
})();
