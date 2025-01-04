
const { databases, ID, Query } = require('../config/db');
const { fetchStockData } = require('./stockService');

const addWatchlistSymbol = async (req) => {
    const { symbol } = req.body;
  
    if (!symbol) {
        throw new Error('Symbol is required');
    }
  
    try {
        const stockDataResponse = await fetchStockData();
        const stockData = stockDataResponse.data.find((stock) => stock.symbol === symbol);
  
        if (!stockData) {
            throw new Error(`Stock data for symbol "${symbol}" not found`);
        }
  
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = process.env.APPWRITE_WATCHLIST_STOCKS_TABLE;
  
        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }
  
        const existingDocuments = await databases.listDocuments(dbId, collectionId, [
            Query.equal('symbol', symbol),
        ]);
  
        if (existingDocuments.documents.length > 0) {
            const existingDocumentId = existingDocuments.documents[0].$id;
  
            const updatedDocument = await databases.updateDocument(
                dbId,
                collectionId,
                existingDocumentId,
                stockData
            );
  
            return { success: true, message: 'Watchlist updated successfully' };
        } else {
            const newDocument = await databases.createDocument(
                dbId,
                collectionId,
                ID.unique(),
                stockData
            );
  
            return { success: true, message: 'Symbol added to watchlist successfully' };
        }
    } catch (error) {
        console.error('Error adding symbol to watchlist:', error);
        return { success: false, error: error.message };
    }
  };
  
  const getWatchlist = async (req) => {
    const { symbol, limit = 10, page = 1 } = req.query;
  
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = process.env.APPWRITE_WATCHLIST_STOCKS_TABLE;
  
        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }
  
        const filters = [];
  
        if (symbol) {
            filters.push(Query.equal('symbol', symbol));
        }
  
        const offset = (page - 1) * limit;
  
        const documents = await databases.listDocuments(dbId, collectionId, [
            ...filters,
            Query.limit(parseInt(limit, 10)),
            Query.offset(offset),
        ]);
  
        return {
            success: true,
            data: documents.documents,
            total: documents.total,
            limit: parseInt(limit, 10),
            page: parseInt(page, 10),
        };
    } catch (error) {
        console.error('Error fetching watchlist data:', error);
        return { success: false, error: error.message };
    }
  };

  const deleteWatchlistById = async (req) => {
    const { id } = req.params
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = process.env.APPWRITE_WATCHLIST_STOCKS_TABLE;

        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        await databases.deleteDocument(dbId, collectionId, id);

        return {
            success: true,
            message: `Document with ID ${id} has been successfully deleted.`,
        };
    } catch (error) {
        console.error('Error deleting watchlist document:', error);
        return { success: false, error: error.message };
    }
};

  module.exports = {
    addWatchlistSymbol,
    getWatchlist,
    deleteWatchlistById
  }