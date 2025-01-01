const { chromium } = require('playwright'); // Use Playwright for browser automation

const BROKERS_ANALYTICS_URL = "https://chukul.com/brokers-analytics";

exports.fetchBrokersAnalyticsData = async (symbol, tab) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(BROKERS_ANALYTICS_URL, { waitUntil: 'domcontentloaded' });

    await page.fill('input[placeholder="Filter Symbols"]', symbol);

    await page.waitForSelector('.q-table__middle.scroll table.q-table tbody tr', { visible: true, timeout: 10000 });

    await page.waitForTimeout(3000);

    if (tab) {      
      await page.click(`div.q-tab__label:has-text("Top ${tab}")`);
      await page.waitForTimeout(500);

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

      return topSoldData;
    }

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

    await browser.close();
    
    return tableData;

  } catch (error) {
    await browser.close();
    throw new Error('Error fetching brokers analytics data: ' + error.message);
  }
};
