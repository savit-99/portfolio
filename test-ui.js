import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  // Wait for intro screen
  await page.waitForSelector('#btn-static');
  
  // Click STANDARD PORTFOLIO
  await page.click('#btn-static');
  
  // Wait for static portfolio
  await page.waitForSelector('#static-portfolio:not(.hidden)');
  
  // Verify it's visible
  const staticDisplay = await page.$eval('#static-portfolio', el => getComputedStyle(el).display);
  console.log('Static Portfolio Display:', staticDisplay);
  
  // Click BOOT FLIGHT SIMULATOR
  await page.click('#btn-back-to-fly');
  
  // Check if static portfolio is hidden
  const staticHidden = await page.$eval('#static-portfolio', el => el.classList.contains('hidden'));
  console.log('Static Portfolio Hidden?', staticHidden);
  
  // Check if canvas is visible
  const canvasDisplay = await page.$eval('#gameCanvas', el => getComputedStyle(el).display);
  console.log('Canvas Display:', canvasDisplay);
  
  await browser.close();
})();
