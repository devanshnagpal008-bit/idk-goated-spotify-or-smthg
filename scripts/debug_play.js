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

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Search tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div, button, a'));
    const t = tabs.find(el => el.textContent && el.textContent.trim() === 'Search');
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const input = await page.$('input');
  if (input) await input.type('Coldplay');
  await new Promise(r => setTimeout(r, 3000));

  // List all buttons/clickable elements with their text
  const clickableItems = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="button"]'));
    return buttons.map(b => ({
      text: b.textContent ? b.textContent.trim().slice(0, 40) : '',
      className: b.className,
      childCount: b.children.length
    }));
  });

  console.log('Clickable elements found:', clickableItems);

  // Now click the first track item specifically (not tab or clear button)
  const trackBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="button"]'));
    const btn = buttons.find(b => {
      const txt = b.textContent || '';
      return (txt.includes('Coldplay') || txt.includes('Yellow') || txt.includes('Hymn')) &&
             !txt.startsWith('Search') &&
             !txt.startsWith('Listen Now') &&
             !txt.startsWith('Library');
    });
    if (btn) {
      btn.click();
      return { success: true, text: btn.textContent.slice(0, 50) };
    }
    return { success: false };
  });

  console.log('Track button clicked:', trackBtn);

  // Wait 4 seconds for audio loading
  await new Promise(r => setTimeout(r, 4000));

  // Check state of player
  const playerInfo = await page.evaluate(() => {
    // Check if MiniPlayer is visible
    const mini = Array.from(document.querySelectorAll('div')).find(d => {
      const t = d.textContent || '';
      return (t.includes('Coldplay') || t.includes('Hymn')) && (t.includes('AAC') || t.includes('Opus'));
    });
    return {
      miniPlayerVisible: !!mini,
      miniText: mini ? mini.textContent.slice(0, 80) : 'none'
    };
  });

  console.log('Player Info:', playerInfo);

  await browser.close();
})();
