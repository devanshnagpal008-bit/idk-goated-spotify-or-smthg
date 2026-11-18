const puppeteer = require('puppeteer-core');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  // Resolve stream URL for Yellow (video id: 9qnqYL0eNNI)
  const res = await fetch('http://127.0.0.1:8000/api/streams/9qnqYL0eNNI');
  const meta = await res.json();
  console.log('Resolved URL:', meta.stream_url.slice(0, 80));

  await page.goto('http://localhost:8081');
  await new Promise(r => setTimeout(r, 1000));

  const audioDebug = await page.evaluate(async (url) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const events = [];
      const trackEvent = (name) => {
        audio.addEventListener(name, (e) => {
          events.push({
            name,
            currentTime: audio.currentTime,
            paused: audio.paused,
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error ? `${audio.error.code}: ${audio.error.message}` : null
          });
          if (name === 'playing' || name === 'error') {
            setTimeout(() => resolve(events), 1500);
          }
        });
      };

      ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'play', 'playing', 'pause', 'waiting', 'stalled', 'suspend', 'error'].forEach(trackEvent);

      audio.src = url;
      audio.play().catch(err => {
        events.push({ name: 'play_rejected', error: err.message, nameStr: err.name });
        resolve(events);
      });

      setTimeout(() => resolve(events), 6000);
    });
  }, meta.stream_url);

  console.log('Audio Events Debug:', JSON.stringify(audioDebug, null, 2));

  await browser.close();
})();
