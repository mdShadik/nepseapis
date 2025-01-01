// server.js
require('dotenv').config();
const express = require('express');
const stockRoutes = require('./routes/stockRoutes');
const floorsheetRoutes = require('./routes/floorsheetRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Use routes
app.use('/stocks', stockRoutes);
app.use('/floorsheet', floorsheetRoutes);

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
  

/*
Directory Structure:

controllers/
  - stockController.js
  - floorsheetController.js

services/
  - stockService.js
  - floorsheetService.js

routes/
  - stockRoutes.js
  - floorsheetRoutes.js
*/
