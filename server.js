require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the CORS package
const stockRoutes = require('./routes/stockRoutes');
const floorsheetRoutes = require('./routes/floorsheetRoutes');

const app = express();
const port = 10000;

// Configure CORS
app.use(cors({
    origin: 'http://localhost:3000/',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Use routes
app.use('/stocks', stockRoutes);
app.use('/floorsheet', floorsheetRoutes);

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
