const floorsheetService = require('../service/floorsheetService');

exports.getFloorsheetData = async (req, res) => {
  try {
    const { symbol, tab } = req.query;

    // Fetch data from the service
    const data = await floorsheetService.fetchBrokersAnalyticsData(symbol, tab);

    // Return the scraped data as a JSON response
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
