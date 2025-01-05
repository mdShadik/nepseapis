require('dotenv').config();
const { databases, Query, ID } = require('../config/db');

const createStockHistoryService = async (req) => {
    const data = req.body;
    const { seller } = req.query;
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = seller ? process.env.APPWRITE_SELLER_TABLE : process.env.APPWRITE_BUYER_TABLE;

        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();

        const isBeforeStartTime = currentHour < 15 || (currentHour === 15 && currentMinutes < 30);
        const isAfterEndTime = currentHour === 23 && currentMinutes > 59;

        if (isBeforeStartTime || isAfterEndTime) {
            return {
                success: false,
                message: 'Service remains closed till 3:00 PM',
            };
        }

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const existingRecords = await databases.listDocuments(dbId, collectionId, [
            Query.greaterThanEqual('$createdAt', startOfDay),
            Query.lessThanEqual('$createdAt', endOfDay),
        ]);

        const existingSymbols = new Set(
            existingRecords.documents.map((doc) => doc.symbol)
        );

        const filteredData = data.filter(
            (entry) => entry.symbol !== 'Total' && !existingSymbols.has(entry.symbol)
        );

        if (filteredData.length === 0) {
            return { success: true, message: 'No new data to add. All symbols already exist for today or are excluded.' };
        }

        const promises = filteredData.map((document) =>
            databases.createDocument(dbId, collectionId, ID.unique(), document)
        );

        const results = await Promise.all(promises);

        return { success: true, results };
    } catch (error) {
        console.error('Error saving data to collection:', error);
        return { success: false, error: error.message };
    }
};


const getStockHistoryService = async (req) => {
    const { seller, limit = 10, page = 1, date, symbol } = req.query;
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = seller ? process.env.APPWRITE_SELLER_TABLE : process.env.APPWRITE_BUYER_TABLE;

        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        const filters = [];

        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
            filters.push(Query.greaterThanEqual('$createdAt', startOfDay))
            filters.push(Query.lessThanEqual('$createdAt', endOfDay))
        }

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
        console.error('Error fetching data from collection:', error);
        return { success: false, error: error.message };
    }
};

const deleteStockHistoryById = async (req) => {
    const { id, seller } = req.query;

    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = seller ? process.env.APPWRITE_SELLER_TABLE : process.env.APPWRITE_BUYER_TABLE;

        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        if (!id) {
            throw new Error('Document ID is required');
        }

        await databases.deleteDocument(dbId, collectionId, id);

        return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
        console.error('Error deleting document by ID:', error);
        return { success: false, error: error.message };
    }
};

const deleteStockHistoryByDateAndSymbol = async (req) => {
    const { date, symbol, seller } = req.query;

    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const collectionId = seller ? process.env.APPWRITE_SELLER_TABLE : process.env.APPWRITE_BUYER_TABLE;

        if (!dbId || !collectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        if (!date || !symbol) {
            throw new Error('Date and symbol are required for this operation');
        }

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

        const documents = await databases.listDocuments(dbId, collectionId, [
            Query.greaterThanEqual('$createdAt', startOfDay),
            Query.lessThanEqual('$createdAt', endOfDay),
            Query.equal('symbol', symbol),
        ]);

        const documentIds = documents.documents.map((doc) => doc.$id);

        if (documentIds.length === 0) {
            return { success: true, message: 'No documents found for the provided date and symbol' };
        }

        const promises = documentIds.map((docId) => databases.deleteDocument(dbId, collectionId, docId));

        await Promise.all(promises);

        return { success: true, message: 'Documents deleted successfully', deletedCount: documentIds.length };
    } catch (error) {
        console.error('Error deleting documents by date and symbol:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { 
    createStockHistoryService,
    getStockHistoryService,
    deleteStockHistoryById,
    deleteStockHistoryByDateAndSymbol
 };
