// services/stockService.js
const axios = require('axios');
const { databases, ID, Query } = require('../config/db');
const { DateTime } = require('luxon');
const { calculateCharges } = require('../common/calculateCharges');


async function holdStocksServices(req) {
    const { symbol, quantity, rate, date, totalAmount } = req.body;

    // Validate required fields
    if (!symbol || !quantity || !rate || !totalAmount) {
        return { message: 'Missing required fields.' };
    }

    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;
    const activityCollectionId = process.env.APPWRITE_ACTIVITY_TABLE;

    // Calculate amount and charges
    const amount = parseFloat(quantity) * parseFloat(rate);
    const charges = parseFloat(totalAmount) - amount;
    const avgRate = (parseFloat(totalAmount) / parseFloat(quantity)).toFixed(2)

    // Validate calculations
    if (charges < 0) {
        return { message: 'Invalid total amount. It must be greater than or equal to the calculated amount.' };
    }

    // Determine date and time
    const currentTime = date
        ? DateTime.fromISO(date).setZone('Asia/Kolkata')
        : DateTime.now().setZone('Asia/Kolkata');
    const localTime = currentTime.toISO();

    try {
        // Check if the stock already exists in holdings
        const existingStock = await databases.listDocuments(databaseId, holdingCollectionId, [
            Query.equal('symbol', symbol),
        ]);

        if (existingStock.documents.length > 0) {
            // Update existing stock
            const stock = existingStock.documents[0];
            const prevQuantity = parseFloat(stock.quantity);
            const prevAmount = parseFloat(stock.amount);
            const prevCharges = parseFloat(stock.total_charges);
            const prevTotalAmount = parseFloat(stock.total_amount);

            // Update values
            const updatedQuantity = (prevQuantity + parseFloat(quantity)).toString();
            const updatedAmount = (prevAmount + amount).toFixed(2);
            const updatedCharges = (prevCharges + charges).toFixed(2);
            const updatedTotalAmount = (prevTotalAmount + parseFloat(totalAmount)).toFixed(2);
            const updatedRate = (parseFloat(updatedAmount) / parseFloat(updatedQuantity)).toFixed(2);
            const updatedAvgRate = (parseFloat(updatedTotalAmount) / parseFloat(updatedQuantity)).toFixed(2);

            // Update the document in the database
            await databases.updateDocument(databaseId, holdingCollectionId, stock.$id, {
                quantity: updatedQuantity.toString(),
                rate: updatedRate.toString(),
                amount: updatedAmount.toString(),
                total_charges: updatedCharges.toString(),
                total_amount: updatedTotalAmount.toString(),
                avg_rate: updatedAvgRate.toString(),
                date: localTime,
            });
        } else {
            // Create a new stock entry
            await databases.createDocument(databaseId, holdingCollectionId, ID.unique(), {
                symbol,
                quantity: parseFloat(quantity).toString(),
                rate: parseFloat(rate).toFixed(2).toString(),
                avg_rate: avgRate.toString(),
                amount: amount.toFixed(2).toString(),
                total_charges: charges.toFixed(2).toString(),
                total_amount: parseFloat(totalAmount).toFixed(2).toString(),
                date: localTime,
            });
        }

        // Log activity
        await databases.createDocument(databaseId, activityCollectionId, ID.unique(), {
            symbol,
            type: 'buy',
            quantity: parseFloat(quantity).toString(),
            rate: parseFloat(rate).toFixed(2).toString(),
            avg_rate: parseFloat(avgRate).toFixed(2).toString(),
            amount: amount.toFixed(2).toString(),
            charges: charges.toFixed(2).toString(),
            total_amount: parseFloat(totalAmount).toFixed(2).toString(),
            date: localTime,
        });

        return {
            success: true,
            message: 'Stock added/updated in holdings and activity log updated.',
        };
    } catch (error) {
        console.error('Error adding/updating stock:', error);
        return { message: 'Error adding/updating stock.' };
    }
}


const getholdingsService = async (req) => {
    const { limit = 10, page = 1, date, symbol } = req.query;
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;

        if (!dbId || !holdingCollectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        const filters = [];

        if (date) {
            const targetDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' });
            const startOfDayUTC = targetDate.startOf('day').toUTC().toISO();
            const endOfDayUTC = targetDate.endOf('day').toUTC().toISO();


            filters.push(Query.greaterThanEqual('date', startOfDayUTC));
            filters.push(Query.lessThanEqual('date', endOfDayUTC));
        }

        if (symbol) {
            filters.push(Query.equal('symbol', symbol));
        }

        const offset = (page - 1) * limit;

        const documents = await databases.listDocuments(dbId, holdingCollectionId, [
            ...filters,
            Query.orderDesc('$createdAt'),
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

 const sellStocksServices = async (req, res) => {
    const { symbol, sellQuantity, sellRate, totalSellAmount } = req.body;

    if (!symbol || !sellQuantity || !sellRate || !totalSellAmount) {
        return { message: 'Missing required fields.' };
    }

    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;
    const activityCollectionId = process.env.APPWRITE_ACTIVITY_TABLE;

    const currentTime = DateTime.now().setZone('Asia/Kolkata');
    const today = currentTime.startOf('day');
    const startOfDay = today.toISO();
    const endOfDay = today.endOf('day').toISO();
    const localTime = currentTime.toISO();

    if (!databaseId || !holdingCollectionId || !activityCollectionId) {
        throw new Error('Database ID or Collection ID is missing');
    }


    try {
        const stockResponse = await databases.listDocuments(databaseId, holdingCollectionId, [
            Query.equal('symbol', symbol),
        ]);

        if (stockResponse.documents.length === 0) {
            return { message: 'Stock not found.' };
        }

        const stock = stockResponse.documents[0];
        const quantity = parseFloat(stock.quantity);
        const totalAmount = parseFloat(stock.total_amount);
        const avgRate = parseFloat(stock.avg_rate);
        const avgSellRate = (parseFloat(totalSellAmount) / parseFloat(sellQuantity)).toFixed(2)


        if (parseFloat(sellQuantity) > parseFloat(quantity)) {
            return { message: 'Insufficient quantity to sell.' };
        }

        const totalActualAmount = parseFloat(sellQuantity) * parseFloat(sellRate);
        let totalActualCharges = parseFloat(totalSellAmount) - parseFloat(totalActualAmount)

        if (totalActualCharges < 0) {
            totalActualCharges *= -1
        }

        const totalAverageAmount = avgRate * parseFloat(sellQuantity)

        const profitOrLoss = parseFloat(totalSellAmount) - totalAverageAmount;
        const profitOrLossPercentage = (profitOrLoss / totalAverageAmount) * 100;

        if (parseInt(sellQuantity) === parseInt(quantity)) {
            await databases.deleteDocument(databaseId, holdingCollectionId, stock.$id);
        } else {
            const remainingQuantity = parseInt(quantity) - parseInt(sellQuantity);

            await databases.updateDocument(databaseId, holdingCollectionId, stock.$id, {
                quantity: remainingQuantity.toString(),
            });
        }

        await databases.createDocument(databaseId, activityCollectionId, ID.unique(), {
            symbol,
            type: 'sell',
            quantity: sellQuantity.toString(),
            rate: parseFloat(sellRate).toFixed(2).toString(),
            avg_rate: parseFloat(avgSellRate).toString(),
            amount: parseFloat(totalActualAmount).toFixed(2).toString(),
            charges: parseFloat(totalActualCharges).toFixed(2).toString(),
            total_amount: parseFloat(totalSellAmount).toFixed(2).toString(),
            pl_amount: parseFloat(profitOrLoss).toFixed(2).toString(),
            pl_rate: parseFloat(profitOrLossPercentage).toFixed(2).toString(),
            date: localTime,
        });

        return {
            message: 'Stock sold successfully.',
            success: true,
            data: {
                profitOrLoss: parseFloat(profitOrLoss).toFixed(2),
                profitOrLossPercentage: parseFloat(profitOrLossPercentage).toFixed(2),
                totalCharges: parseFloat(totalActualCharges).toFixed(2),
            }
        };
    } catch (error) {
        console.error('Error selling stock:', error);
        return { message: 'Error selling stock.', error };
    }
};


const getActivityService = async (req) => {
    const { limit = 10, page = 1, date, symbol, type } = req.query;
    try {
        const dbId = process.env.APPWRITE_DB_ID;
        const activityCollectionId = process.env.APPWRITE_ACTIVITY_TABLE;

        if (!dbId || !activityCollectionId) {
            throw new Error('Database ID or Collection ID is missing');
        }

        const filters = [];

        if (date) {
            const targetDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' });
            const startOfDayUTC = targetDate.startOf('day').toUTC().toISO();
            const endOfDayUTC = targetDate.endOf('day').toUTC().toISO();

            filters.push(Query.greaterThanEqual('date', startOfDayUTC));
            filters.push(Query.lessThanEqual('date', endOfDayUTC));
        }

        if (symbol) {
            filters.push(Query.equal('symbol', symbol));
        }

        if (type) {
            filters.push(Query.equal('type', type));
        }

        const offset = (page - 1) * limit;

        const documents = await databases.listDocuments(dbId, activityCollectionId, [
            ...filters,
            Query.orderDesc('$createdAt'),
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


module.exports = { 
    holdStocksServices,
    getholdingsService,
    sellStocksServices,
    getActivityService
};
