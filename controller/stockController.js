// controllers/stockController.js
const {
  fetchStockData,
  addWatchlistSymbol,
  getWatchlist,
} = require("../service/stockService");

async function getAllStocks(req, res) {
  try {
    const stocks = await fetchStockData();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getStockBySymbol(req, res) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stockResponse = await fetchStockData();
    const stock = stockResponse.data.find((s) => s.symbol === symbol);

    if (stock) {
      res.json(stock);
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllStocks,
  getStockBySymbol,
};
