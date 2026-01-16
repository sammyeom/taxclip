const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: true });

  const receipts = [
    { name: 'receipt_openai', file: 'receipt_openai.html' },
    { name: 'receipt_office_depot', file: 'receipt_office_depot.html' },
    { name: 'receipt_restaurant', file: 'receipt_restaurant.html' },
  ];

  for (const receipt of receipts) {
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });

    const filePath = `file://${path.join(__dirname, receipt.file)}`;
    await page.goto(filePath, { waitUntil: 'networkidle0' });

    // Get the actual content height
    const bodyHandle = await page.$('body');
    const { height } = await bodyHandle.boundingBox();
    await page.setViewport({ width: 400, height: Math.ceil(height) + 40 });

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', `${receipt.name}.png`),
      fullPage: true,
    });

    console.log(`Screenshot saved: ${receipt.name}.png`);
    await page.close();
  }

  await browser.close();
  console.log('All screenshots completed!');
}

takeScreenshots().catch(console.error);
