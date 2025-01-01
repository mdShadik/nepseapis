// server.js
require('dotenv').config();
const express = require('express');
const stockRoutes = require('./routes/stockRoutes');
const floorsheetRoutes = require('./routes/floorsheetRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Use routes
app.use('/stocks', stockRoutes);
app.use('/floorsheet', floorsheetRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
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
