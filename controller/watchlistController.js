const {
    addWatchlistSymbol, getWatchlist, deleteWatchlistById
  } = require("../service/stockWatchListService");
  
  async function addWatchListController(req, res) {
    try {
      const response = await addWatchlistSymbol(req);
      return res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function getWatchlistController(req, res) {
    try {
      const response = await getWatchlist(req);
      return res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function deleteWatchlistController(req, res) {
    try {
      const response = await deleteWatchlistById(req);
      return res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  module.exports = {
    addWatchListController,
    getWatchlistController,
    deleteWatchlistController
  };
  