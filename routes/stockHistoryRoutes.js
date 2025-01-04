const express = require("express");
const {
  createHistory,
  getHistory,
  deleteStockHistoryByIdController,
  deleteStockHistoryByDateAndSymbolController,
} = require("../controller/stockHistoryController");

const router = express.Router();

router.post("/save", createHistory);
router.get("/list", getHistory);
router.delete("/delete", deleteStockHistoryByIdController);
router.delete("/delete-date", deleteStockHistoryByDateAndSymbolController);

module.exports = router;
