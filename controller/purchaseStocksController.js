const { holdStocksServices, getholdingsService, sellStocksServices, getActivityService } = require("../service/purchaseService");

  async function purchaseStocksController(req, res) {
    try {
      const stocks = await holdStocksServices(req);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function getholdingsController(req, res) {
    try {
      const holdings = await getholdingsService(req);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function soldStocksController(req, res) {
    try {
      const holdings = await sellStocksServices(req);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function getActivityController(req, res) {
    try {
      const logs = await getActivityService(req);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  
  module.exports = {
    purchaseStocksController,
    getholdingsController,
    soldStocksController,
    getActivityController
  };
  