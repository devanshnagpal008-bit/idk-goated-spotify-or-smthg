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

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const input = await page.$('input');
  if (input) await input.type('Yellow');
  await new Promise(r => setTimeout(r, 3000));

  // Click the Yellow track
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div[tabindex="0"]'));
    const track = tabs.find(t => t.textContent.includes('Yellow') && t.textContent.includes('Coldplay'));
    if (track) track.click();
  });

  console.log('Waiting 3 seconds for playback to begin...');
  await new Promise(r => setTimeout(r, 3000));

  // Sample position at t=0
  const pos1 = await page.evaluate(() => {
    // Check Now Playing or any progress indicators
    return {
      time: Date.now()
    };
  });

  // Let's click the MiniPlayer to open the NowPlayingSheet and see the scrubber & time
  console.log('Opening NowPlayingSheet...');
  await page.evaluate(() => {
    // Click the miniplayer text container
    const mini = Array.from(document.querySelectorAll('div')).find(d => {
      const t = d.textContent || '';
      return t === 'Yellow' && d.closest('div[style*="position: absolute"]');
    });
    if (mini) mini.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Screenshot the Now Playing Sheet
  await page.screenshot({ path: 'C:\\Users\\techn\\.gemini\\antigravity\\scratch\\sonora\\docs\\screenshots\\test_now_playing_time.png' });

  // Read time texts from page
  const times = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => /^\d+:\d\d$/.test(el.textContent.trim()))
      .map(el => el.textContent.trim());
  });

  console.log('Detected playback timestamps:', times);

  await new Promise(r => setTimeout(r, 3000));

  const timesAfter3s = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => /^\d+:\d\d$/.test(el.textContent.trim()))
      .map(el => el.textContent.trim());
  });

  console.log('Detected timestamps after 3s:', timesAfter3s);

  await browser.close();
})();
