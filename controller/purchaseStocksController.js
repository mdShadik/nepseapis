const { holdStocksServices, getholdingsService, sellStocksServices, getActivityService, updateStockDetailsService, getUnrealizedProfitLossService } = require("../service/purchaseService");

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

  async function updateStockDetailsController(req, res) {
    try {
      const updateLtp = await updateStockDetailsService(req);
      res.json(updateLtp);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function getUnrealizedProfitLossController(req, res) {
    try {
      const data = await getUnrealizedProfitLossService(req);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  module.exports = {
    purchaseStocksController,
    getholdingsController,
    soldStocksController,
    getActivityController,
    updateStockDetailsController,
    getUnrealizedProfitLossController
  };
  