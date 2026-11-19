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

  // Search Coldplay
  console.log('Searching "Coldplay"...');
  const input = await page.$('input');
  if (input) await input.type('Coldplay');
  await new Promise(r => setTimeout(r, 3000));

  // Click Yellow track
  console.log('Clicking Yellow...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div[tabindex="0"]'));
    const track = tabs.find(t => t.textContent.includes('Yellow') && t.textContent.includes('Coldplay'));
    if (track) track.click();
  });
  await new Promise(r => setTimeout(r, 4000));

  // Click MiniPlayer to open NowPlayingSheet
  console.log('Expanding Now Playing Sheet...');
  await page.evaluate(() => {
    const mini = Array.from(document.querySelectorAll('div')).find(d => {
      const t = d.textContent || '';
      return t === 'Yellow' && d.closest('div[style*="position: absolute"]');
    });
    if (mini) mini.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot of Now Playing Sheet with 1440p Artwork
  await page.screenshot({ path: 'C:\\spotify on steroids\\idk-goated-spotify-or-smthg\\docs\\screenshots\\highres_now_playing.png' });
  console.log('Saved highres_now_playing.png');

  // Open Audio & Polish Settings modal (Sliders icon at top right)
  console.log('Opening Audio Settings Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div[tabindex="0"], div[role="button"]'));
    // Find button containing Sliders icon or top right dismiss
    const slidersBtn = buttons.find(b => b.querySelector('svg.lucide-sliders') || b.querySelector('svg'));
    if (slidersBtn) slidersBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot of Cover Art Quality settings
  await page.screenshot({ path: 'C:\\spotify on steroids\\idk-goated-spotify-or-smthg\\docs\\screenshots\\cover_art_quality_settings.png' });
  console.log('Saved cover_art_quality_settings.png');

  await browser.close();
})();
