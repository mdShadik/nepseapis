
const express = require('express');
const { purchaseStocksController, getholdingsController, soldStocksController, getActivityController, updateStockDetailsController, getUnrealizedProfitLossController } = require('../controller/purchaseStocksController');
const router = express.Router();

router.post('/holdings', purchaseStocksController);
router.get('/holding-list', getholdingsController);
router.post('/sell', soldStocksController);
router.get('/logs', getActivityController);
router.put('/holdings', updateStockDetailsController);
router.get('/profit', getUnrealizedProfitLossController);

module.exports = router;
