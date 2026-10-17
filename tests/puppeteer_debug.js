const puppeteer = require('puppeteer');

(async () => {
    const logs = [];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => logs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.toString()}`));
    page.on('requestfailed', request => {
        logs.push(`[FAILED] ${request.url()} - ${request.failure().errorText}`);
    });
    page.on('response', response => {
        if (!response.ok()) {
            logs.push(`[BAD RESPONSE] ${response.status()} ${response.url()}`);
        }
    });

    try {
        await page.goto('http://localhost:3000/?nocache=' + Date.now(), { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Wait another 3s just in case
        await new Promise(r => setTimeout(r, 3000));
        
        // Try clicking Mii Maker
        await page.evaluate(() => {
            const miiIcon = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Mii Maker') || el.textContent === 'Mii');
            if (miiIcon) miiIcon.click();
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const fs = require('fs');
        fs.writeFileSync('browser-debug.log', logs.join('\n'));
        console.log('Successfully captured logs.');
    } catch (e) {
        console.error('Puppeteer error:', e);
    } finally {
        await browser.close();
    }
})();
