
const express = require('express');
const { addWatchListController, getWatchlistController, deleteWatchlistController } = require('../controller/watchlistController');

const router = express.Router();

router.post('/add', addWatchListController);
router.get('/get', getWatchlistController);
router.delete('/:id', deleteWatchlistController);

module.exports = router;
