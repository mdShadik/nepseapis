// services/stockService.js
const axios = require('axios');
const { databases, ID, Query } = require('../config/db');
const { DateTime } = require('luxon');
const { calculateCharges } = require('../common/calculateCharges');


async function holdStocksServices(req) {
    const { symbol, quantity, rate, date } = req.body;

    if (!symbol || !quantity || !rate) {
        return { message: 'Missing required fields.' };
    }

    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;
    const activityCollectionId = process.env.APPWRITE_ACTIVITY_TABLE;
    const amount = parseFloat(quantity) * parseFloat(rate);
    const currentTime = date
        ? DateTime.fromISO(date).setZone('Asia/Kolkata')
        : DateTime.now().setZone('Asia/Kolkata');
    const today = currentTime.startOf('day');
    const startOfDay = today.toISO();
    const endOfDay = today.endOf('day').toISO();
    const localTime = currentTime.toISO();

    try {
        // Check if the symbol already exists in the holdings
        const existingStock = await databases.listDocuments(databaseId, holdingCollectionId, [
            Query.equal('symbol', symbol),
        ]);

        let totalQuantity,
            totalAmount,
            avgRate,
            sebonCharge,
            dpCharge,
            commission,
            totalCharges,
            updatedSebon,
            updatedDp,
            updatedCommission,
            updatedTotalCharges;

        if (existingStock.documents.length > 0) {
            // Update existing stock
            const stock = existingStock.documents[0];
            const prevQuantity = parseFloat(stock.quantity);
            const prevAmount = parseFloat(stock.amount);
            const prevSebonCharge = parseFloat(stock.sebon_charges) || 0;
            const prevDpCharge = parseFloat(stock.dp_charges) || 0;
            const prevCommission = parseFloat(stock.broker_commission) || 0;
            const prevTotalCharges = parseFloat(stock.total_charges) || 0;

            // Calculate updated values
            totalQuantity = prevQuantity + parseFloat(quantity);
            totalAmount = prevAmount + amount;
            avgRate = totalAmount / totalQuantity;

            // Recalculate new charges for the current transaction
            ({ sebonCharge, dpCharge, commission, totalCharges } = await calculateCharges(
                symbol,
                amount,
                startOfDay,
                endOfDay,
                holdingCollectionId
            ));

            // Update charges by adding new charges to previous charges
            updatedSebon = prevSebonCharge + sebonCharge;
            updatedDp = prevDpCharge + dpCharge;
            updatedCommission = prevCommission + commission;
            updatedTotalCharges = prevTotalCharges + totalCharges;

            // Update stock document
            await databases.updateDocument(databaseId, holdingCollectionId, stock.$id, {
                quantity: totalQuantity.toString(),
                rate: avgRate.toFixed(2),
                total_amount: (totalAmount + updatedTotalCharges).toFixed(2),
                total_charges: updatedTotalCharges.toFixed(2),
                amount: totalAmount.toFixed(2),
                date: localTime,
                broker_commission: updatedCommission.toFixed(2),
                sebon_charges: updatedSebon.toFixed(2),
                dp_charges: updatedDp.toFixed(2),
            });
        } else {
            // Add new stock
            ({ sebonCharge, dpCharge, commission, totalCharges } = await calculateCharges(
                symbol,
                amount,
                startOfDay,
                endOfDay,
                holdingCollectionId
            ));

            totalQuantity = parseFloat(quantity);
            totalAmount = amount;
            updatedSebon = sebonCharge;
            updatedDp = dpCharge;
            updatedCommission = commission;
            updatedTotalCharges = totalCharges;

            await databases.createDocument(databaseId, holdingCollectionId, ID.unique(), {
                symbol,
                quantity: totalQuantity.toString(),
                rate: parseFloat(rate).toFixed(2),
                total_amount: (totalAmount + totalCharges).toFixed(2),
                total_charges: totalCharges.toFixed(2),
                amount: totalAmount.toFixed(2),
                date: localTime,
                broker_commission: commission.toFixed(2),
                sebon_charges: sebonCharge.toFixed(2),
                dp_charges: dpCharge.toFixed(2),
            });
        }

        // Log activity
        await databases.createDocument(databaseId, activityCollectionId, ID.unique(), {
            symbol,
            type: 'buy',
            quantity: parseFloat(quantity).toString(),
            rate: parseFloat(rate).toFixed(2),
            amount: amount.toFixed(2),
            charges: totalCharges.toFixed(2),
            total: (amount + totalCharges).toFixed(2),
            date: localTime,
        });

        return {
            success: true,
            message: 'Stock added/updated in holdings and activity log updated.',
            data: {
                sebonCharge: parseInt(updatedSebon).toFixed(2),
                dpCharge: parseInt(updatedDp).toFixed(2),
                commission: parseInt(updatedCommission).toFixed(2),
                totalCharges: parseInt(updatedTotalCharges).toFixed(2),
                totalAmount: parseInt(totalAmount + updatedTotalCharges).toFixed(2),
                totalQuantity: parseInt(totalQuantity).toString(),
                avgRate: parseInt(avgRate).toFixed(2),
            },
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
    const { symbol, sellQuantity, sellRate } = req.body;

    if (!symbol || !sellQuantity || !sellRate) {
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
        const amount = parseFloat(stock.amount);
        const rate = parseFloat(stock.rate);


        if (sellQuantity > quantity) {
            return { message: 'Insufficient quantity to sell.' };
        }

        // Calculate charges
        const { sebonCharge, dpCharge, commission, totalCharges } =
        await calculateCharges(
            symbol,
            amount,
            startOfDay,
            endOfDay,
            activityCollectionId,
            "sell"
        );

        const sellAmount = sellQuantity * sellRate + totalCharges;



        // Calculate profit or loss
        const buyAmount = rate * sellQuantity;
        const profitOrLoss = sellAmount - buyAmount;
        const profitOrLossPercentage = (profitOrLoss / buyAmount) * 100;

        // Update or remove the stock in the main table
        if (sellQuantity === quantity) {
            // Remove the stock if fully sold
            await databases.deleteDocument(databaseId, holdingCollectionId, stock.$id);
        } else {
            // Update the stock with remaining quantity
            const remainingQuantity = quantity - sellQuantity;
            const remainingAmount = remainingQuantity * rate;

            await databases.updateDocument(databaseId, holdingCollectionId, stock.$id, {
                quantity: remainingQuantity.toString(),
                // amount: remainingAmount,
            });
        }

        // Add to activity log
        await databases.createDocument(databaseId, activityCollectionId, ID.unique(), {
            symbol,
            type: 'sell',
            quantity: sellQuantity.toString(),
            rate: sellRate.toString(),
            amount: sellAmount.toString(),
            charges: totalCharges.toString(),
            total: (sellAmount - totalCharges).toString(),
            pl_amount: profitOrLoss.toString(),
            pl_rate: profitOrLossPercentage.toString(),
            date: localTime,
        });

        return {
            message: 'Stock sold successfully.',
            profitOrLoss,
            profitOrLossPercentage,
            sebonCharge,
            dpCharge,
            commission,
            totalCharges,
            total: (sellAmount - totalCharges)
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
