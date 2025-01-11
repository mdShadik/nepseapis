
const express = require('express');
const { purchaseStocksController, getholdingsController, soldStocksController, getActivityController } = require('../controller/purchaseStocksController');
const router = express.Router();

router.post('/holdings', purchaseStocksController);
router.get('/holding-list', getholdingsController);
router.post('/sell', soldStocksController);
router.get('/logs', getActivityController);

module.exports = router;
