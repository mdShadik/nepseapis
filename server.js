require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the CORS package
const stockRoutes = require('./routes/stockRoutes');
const floorsheetRoutes = require('./routes/floorsheetRoutes');
const historyRoutes = require('./routes/stockHistoryRoutes');
const watchlistRoute = require('./routes/watchlistRoutes');
const authRoutes = require('./routes/authRoutes');
const authValidation = require('./middleware/authMiddleware');

const app = express();
const port = 10000;

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace with your frontend URL
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
  }
  next();
});

// Use routes
app.use('/stocks', authValidation, stockRoutes);
app.use('/floorsheet', authValidation, floorsheetRoutes)
app.use('/history', authValidation, historyRoutes);
app.use('/watchlist', authValidation, watchlistRoute);
app.use('/auth', authRoutes);


app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
