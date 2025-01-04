const {
  createStockHistoryService,
  getStockHistoryService,
  deleteStockHistoryById,
  deleteStockHistoryByDateAndSymbol,
} = require("../service/stockHistoryService");

async function createHistory(req, res) {
  try {
    const response = await createStockHistoryService(req);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getHistory(req, res) {
  try {
    const response = await getStockHistoryService(req);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteStockHistoryByIdController(req, res) {
  try {
    const response = await deleteStockHistoryById(req);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteStockHistoryByDateAndSymbolController(req, res) {
  try {
    const response = await deleteStockHistoryByDateAndSymbol(req);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createHistory,
  getHistory,
  deleteStockHistoryByIdController,
  deleteStockHistoryByDateAndSymbolController
};
