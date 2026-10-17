const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    await page.goto('http://localhost:3000/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking Mii Maker...');
    await page.evaluate(() => {
      document.querySelector('.app-trigger[data-app="miiMaker"]').click();
    });
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  } catch(e) {
    console.error("SCRIPT ERROR:", e);
  }
})();
