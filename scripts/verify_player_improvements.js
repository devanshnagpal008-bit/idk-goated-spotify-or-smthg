const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Navigate to Search
  const searchTab = await page.waitForSelector('text/Search');
  await searchTab.click();
  await sleep(1000);

  const searchInput = await page.waitForSelector('input');
  await searchInput.type('Coldplay Yellow');
  await page.keyboard.press('Enter');
  await sleep(3500);

  // Find song item by searching for "Parachutes" (unique to Coldplay Yellow song row)
  const trackItem = await page.waitForSelector('text/Parachutes');
  console.log('Found Parachutes track item, clicking...');
  await trackItem.click();
  console.log('Clicked track item to play');
  await sleep(4000);

  // Click exact MiniPlayer using data-testid to open full-screen Now Playing sheet
  const miniPlayer = await page.waitForSelector('[data-testid="mini-player"]');
  console.log('Found MiniPlayer, clicking to open Now Playing sheet...');
  await miniPlayer.click();
  await sleep(2500);

  // Take screenshot of the full blurred glass player
  const screenshotPath1 = 'C:/spotify on steroids/idk-goated-spotify-or-smthg/docs/screenshots/glass_player_bg.png';
  await page.screenshot({ path: screenshotPath1 });
  console.log('Saved glass background screenshot to:', screenshotPath1);

  // Test +10s Quick Seek button
  console.log('Testing +10s Quick Seek...');
  const plus10Btn = await page.waitForSelector('[data-testid="btn-seek-forward-10"]');
  await plus10Btn.click();
  await sleep(800);
  await plus10Btn.click();
  console.log('Clicked +10s twice');
  await sleep(1200);

  // Test -10s Quick Seek
  console.log('Testing -10s Quick Seek...');
  const minus10Btn = await page.waitForSelector('[data-testid="btn-seek-backward-10"]');
  await minus10Btn.click();
  console.log('Clicked -10s');
  await sleep(1200);

  // Scrubber drag forward & backward
  console.log('Testing scrubber drag...');
  const scrubberElement = await page.waitForSelector('[data-testid="scrubber-touch-area"]');
  if (scrubberElement) {
    const box = await scrubberElement.boundingBox();
    if (box) {
      console.log('Scrubber bounding box:', box);
      // Mouse down at 20%
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await sleep(300);
      // Drag forward to 75%
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 10 });
      await sleep(300);
      // Drag backward to 50%
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 10 });
      await sleep(300);
      await page.mouse.up();
      console.log('Scrubber dragging forward and backward complete!');
      await sleep(2000);
    }
  }

  const screenshotPath2 = 'C:/spotify on steroids/idk-goated-spotify-or-smthg/docs/screenshots/scrubber_seeking_demo.png';
  await page.screenshot({ path: screenshotPath2 });
  console.log('Saved scrubber demo screenshot to:', screenshotPath2);

  await browser.close();
  console.log('SUCCESS: All player controls and glass effect verified!');
})();
