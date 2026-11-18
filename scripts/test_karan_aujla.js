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

  console.log('Opening Sonora...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Searching for "Karan Aujla"...');
  const input = await page.$('input');
  if (input) await input.type('Karan Aujla');
  await new Promise(r => setTimeout(r, 3000));

  // Find track with Karan Aujla
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div[tabindex="0"]'));
    const track = tabs.find(t => t.textContent.includes('Karan Aujla'));
    if (track) {
      track.click();
      return { success: true, text: track.textContent.trim().slice(0, 60) };
    }
    return { success: false };
  });

  console.log('Clicked track:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Capture screenshot of Karan Aujla playing
  await page.screenshot({ path: 'C:\\Users\\techn\\.gemini\\antigravity\\scratch\\sonora\\docs\\screenshots\\karan_aujla_playing.png' });
  console.log('Screenshot saved!');

  await browser.close();
})();
