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

  // Find all elements containing text "Listen Now" or "Search"
  const inspectElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim().length > 0)
      .slice(0, 20)
      .map(el => ({
        tag: el.tagName,
        text: el.textContent.trim(),
        parentTag: el.parentElement ? el.parentElement.tagName : null,
        parentRole: el.parentElement ? el.parentElement.getAttribute('role') : null,
        parentTabIndex: el.parentElement ? el.parentElement.getAttribute('tabindex') : null,
        parentCursor: el.parentElement ? window.getComputedStyle(el.parentElement).cursor : null
      }));
  });

  console.log('Inspected Elements:', inspectElements);
  await browser.close();
})();
