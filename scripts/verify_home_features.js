const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log('Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    await sleep(2500);

    const hasRecentlyPlayed = await page.evaluate(() => {
      return document.body.innerText.includes('Recently Played');
    });
    const hasRecommended = await page.evaluate(() => {
      return document.body.innerText.includes('Recommended For You');
    });
    const hasTopCharts = await page.evaluate(() => {
      return document.body.innerText.includes('Your Top Charts');
    });

    console.log('Verification findings:', {
      hasRecentlyPlayed,
      hasRecommended,
      hasTopCharts
    });

    const screenshotPath = 'C:\\Users\\techn\\.gemini\\antigravity\\brain\\0280ac8f-8b53-4976-bd01-284dd278b793\\home_recommendations_and_charts.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
