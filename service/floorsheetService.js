const { chromium } = require('playwright'); // Use Playwright for browser automation

const BROKERS_ANALYTICS_URL = process.env.BROKER_URL;

exports.fetchBrokersAnalyticsData = async (symbol, tab) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Go to the page
    await page.goto(BROKERS_ANALYTICS_URL, { waitUntil: 'domcontentloaded' });

    // Step 2: Wait for the input field with the placeholder "Filter Symbols" and type the symbol
    await page.waitForSelector('input[placeholder="Filter Symbols"]', { visible: true });
    await page.fill('input[placeholder="Filter Symbols"]', symbol);

    console.log(symbol);

    // Step 3: Wait for the table to be populated after typing the symbol
    await page.waitForSelector('.q-table__middle.scroll table.q-table tbody tr', { visible: true, timeout: 10000 });

    // Optional: Add a small delay (2-3 seconds) to ensure all data is loaded
    await page.waitForTimeout(3000);

    // If tab is true, click the "Top Sold" tab
    if (tab) {
      await page.waitForSelector('.q-tab__label', { visible: true });
      
      // Click on the "Top Sold" tab (the correct tab will have the label "Top Sold")
      await page.click(`div.q-tab__label:has-text("Top ${tab}")`);

      // Wait for the new data to be populated
      await page.waitForTimeout(1000); // Wait for 3 seconds to allow data to load

      // You can scrape the data again for "Top Sold" after clicking the tab
      const topSoldData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.q-table__middle.scroll table.q-table tbody tr'));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return {
            symbol: cells[0]?.innerText.trim(),
            buyer: cells[1]?.innerText.trim(),
            quantity: cells[2]?.innerText.trim(),
            amount: cells[3]?.innerText.trim(),
            rate: cells[4]?.innerText.trim(),
          };
        });
      });

      // Return the "Top Sold" data
      return topSoldData;
    }

    // Step 4: Scrape the original table data if tab is false
    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.q-table__middle.scroll table.q-table tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          symbol: cells[0]?.innerText.trim(),
          buyer: cells[1]?.innerText.trim(),
          quantity: cells[2]?.innerText.trim(),
          amount: cells[3]?.innerText.trim(),
          rate: cells[4]?.innerText.trim(),
        };
      });
    });

    // Close the browser
    await browser.close();
    
    return tableData;

  } catch (error) {
    await browser.close();
    throw new Error('Error fetching brokers analytics data: ' + error.message);
  }
};
