const puppeteer = require('puppeteer-core');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Fetch a stream URL from backend
  const res = await fetch('http://127.0.0.1:8000/api/streams/kJQP7kiw5Fk');
  const streamData = await res.json();
  console.log('Stream URL resolved:', streamData.codec, streamData.label);

  await page.goto('http://localhost:8081');
  await new Promise(r => setTimeout(r, 2000));

  // Test playing audio directly in page context
  const playResult = await page.evaluate(async (url) => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onplay = () => resolve({ success: true, message: 'Playing started!' });
      audio.onerror = (e) => resolve({
        success: false,
        error: audio.error ? `Code ${audio.error.code}: ${audio.error.message}` : 'Unknown error'
      });
      audio.oncanplay = () => {
        audio.play().catch(err => resolve({ success: false, error: err.message }));
      };
      setTimeout(() => resolve({ success: false, timeout: true, readyState: audio.readyState }), 8000);
    });
  }, streamData.stream_url);

  console.log('Play result in Chrome:', playResult);
  await browser.close();
})();
