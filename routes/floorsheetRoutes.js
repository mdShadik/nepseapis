const express = require('express');
const floorsheetController = require('../controller/floorsheetController');

const router = express.Router();

// Define the route to get the floorsheet data
router.get('/', floorsheetController.getFloorsheetData);

module.exports = router;
