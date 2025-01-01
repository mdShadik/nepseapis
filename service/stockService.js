// services/stockService.js
const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.sharesansar.com/live-trading";

async function fetchStockData() {
  try {
    const { data: html } = await axios.get(URL);
    const $ = cheerio.load(html);
    const tableRows = $('#headFixed tbody tr');

    const stocks = [];
    tableRows.each((index, row) => {
      const cells = $(row).find('td');
      const stockData = {
        id: $(cells[0]).text().trim(),
        symbol: $(cells[1]).text().trim(),
        ltp: $(cells[2]).text().trim(),
        pointChange: $(cells[3]).text().trim(),
        percentChange: $(cells[4]).text().trim(),
        open: $(cells[5]).text().trim(),
        high: $(cells[6]).text().trim(),
        low: $(cells[7]).text().trim(),
        volume: $(cells[8]).text().trim(),
        prevClose: $(cells[9]).text().trim(),
      };
      stocks.push(stockData);
    });

    return {
      success: true,
      message: "Stock Details Fetched Successfully",
      data: stocks,
    };
  } catch (error) {
    throw new Error('Error fetching stock data: ' + error.message);
  }
}

module.exports = { fetchStockData };
