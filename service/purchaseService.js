// services/stockService.js
const axios = require('axios');
const { databases, ID, Query } = require('../config/db');
const { DateTime } = require('luxon');
const { calculateCharges } = require('../common/calculateCharges');
const { fetchStockData } = require('./stockService');


async function holdStocksServices(req) {
    const { symbol, quantity, rate, date, isDpCharged } = req.body;

    if (!symbol || !quantity || !rate) {
        return { message: 'Missing required fields.' };
    }
    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;
    const activityCollectionId = process.env.APPWRITE_ACTIVITY_TABLE;

    const totalActualAmount = parseFloat(rate) * parseFloat(quantity);
    const { sebonCharge, dpCharge, commission, totalCharges } = await calculateCharges(totalActualAmount, isDpCharged);

    const totalPaidAmount = totalActualAmount + parseFloat(totalCharges);
    const avgRate = (parseFloat(totalPaidAmount) / parseFloat(quantity)).toFixed(2);

    const currentTime = date
        ? DateTime.fromISO(date).setZone('Asia/Kolkata')
        : DateTime.now().setZone('Asia/Kolkata');
    const localTime = currentTime.toISO();

    try {
        const stockData = await fetchStockData();
        const stockDetails = stockData?.data.find(stock => stock.symbol === symbol);

        if (!stockDetails) {
            throw new Error(`Stock details not found for symbol: ${symbol}`);
        }
        const { ltp, pointChange } = stockDetails;

        const existingStock = await databases.listDocuments(databaseId, holdingCollectionId, [
            Query.equal('symbol', symbol),
        ]);

        if (existingStock.documents.length > 0) {
            const stock = existingStock.documents[0];
            const prevQuantity = parseFloat(stock.quantity);
            const prevAmount = parseFloat(stock.amount);
            const prevCharges = parseFloat(stock.total_charges);
            const prevTotalAmount = parseFloat(stock.total_amount);

            const updatedQuantity = (prevQuantity + parseFloat(quantity)).toString();
            const updatedAmount = (prevAmount + totalActualAmount).toFixed(2);
            const updatedCharges = (prevCharges + totalCharges).toFixed(2);
            const updatedTotalAmount = (prevTotalAmount + parseFloat(totalPaidAmount)).toFixed(2);
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
                ltp: ltp.toString(),
                point_change: pointChange.toString(),
                date: localTime,
            });
        } else {
            // Create a new stock entry
            await databases.createDocument(databaseId, holdingCollectionId, ID.unique(), {
                symbol,
                quantity: parseFloat(quantity).toString(),
                rate: parseFloat(rate).toFixed(2).toString(),
                avg_rate: avgRate.toString(),
                amount: totalActualAmount.toFixed(2).toString(),
                total_charges: totalCharges.toFixed(2).toString(),
                total_amount: parseFloat(totalPaidAmount).toFixed(2).toString(),
                ltp: ltp.toString(),
                point_change: pointChange.toString(),
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
            amount: totalActualAmount.toFixed(2).toString(),
            charges: totalCharges.toFixed(2).toString(),
            total_amount: parseFloat(totalPaidAmount).toFixed(2).toString(),
            date: localTime,
        });

        return {
            success: true,
            message: 'Stock added/updated in holdings and activity log updated.',
            data: {
                sebonCharge,
                dpCharge,
                commission,
                totalCharges,
                totalPaidAmount,
                avgRate,
                ltp,
                pointChange,
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
            Query.orderDesc('$updatedAt'),
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
    const { symbol, sellQuantity, sellRate, isDpCharged, isBelowOneYear } = req.body;

    if (!symbol || !sellQuantity || !sellRate ) {
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

        if (parseFloat(sellQuantity) > parseFloat(quantity)) {
            return { message: 'Insufficient quantity to sell.' };
        }

        const totalActualAmount = parseFloat(sellQuantity) * parseFloat(sellRate);
        const { 
            sebonCharge,
            dpCharge,
            commission,
            totalCharges, 
        } = await calculateCharges(totalActualAmount, isDpCharged)

        let totalCharges2 = totalCharges;
        if(totalCharges < 0){
            totalCharges2 *= -1;
        }

        const totalPaidAmount = parseFloat(avgRate) * sellQuantity;

        const remainingAmount = parseFloat(totalActualAmount) - parseFloat(totalCharges2)
        const netGain = remainingAmount - totalPaidAmount;
        const totalAverageAmount = parseFloat(avgRate) * parseFloat(sellQuantity)

        let capitalGainTaxRate = 5;
        if(isBelowOneYear){
            capitalGainTaxRate = 7.5;
        }

        const capitalGainTax = (parseFloat(capitalGainTaxRate) * netGain) / 100
        const totalReceivableAmount = remainingAmount - capitalGainTax;
        const avgSellRate = (parseFloat(totalReceivableAmount) / parseFloat(sellQuantity)).toFixed(2)
        const totalActualCharges = totalCharges2 + capitalGainTax;
        const profitOrLoss = parseFloat(totalReceivableAmount) - totalAverageAmount;
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
            total_amount: parseFloat(totalReceivableAmount).toFixed(2).toString(),
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
                sebonCharge,
                dpCharge,
                commission,
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
            Query.orderDesc('$updatedAt'),
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

async function updateStockDetailsService(req) {
    const { symbol } = req.body;

    if (!symbol) {
        return { message: 'Symbol is required.' };
    }

    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;

    try {
        // Fetch stock data using fetchStockData
        const stockData = await fetchStockData(); // Assuming this fetches all stock details
        const stockDetails = stockData?.data.find(stock => stock.symbol === symbol);

        if (!stockDetails) {
            return { message: `Stock details not found for symbol: ${symbol}` };
        }

        const { ltp, pointChange } = stockDetails;

        // Fetch the existing holding for the given symbol
        const existingStock = await databases.listDocuments(databaseId, holdingCollectionId, [
            Query.equal('symbol', symbol),
        ]);

        if (existingStock.documents.length === 0) {
            return { message: `No holdings found for symbol: ${symbol}` };
        }

        const stock = existingStock.documents[0];

        // Update the ltp and pointChange in the holdings collection
        await databases.updateDocument(databaseId, holdingCollectionId, stock.$id, {
            ltp: ltp.toString(),
            point_change: pointChange.toString(),
        });

        return {
            success: true,
            message: `LTP and point change updated successfully for symbol: ${symbol}`,
            data: {
                symbol,
                ltp,
                pointChange,
            },
        };
    } catch (error) {
        console.error('Error updating stock details:', error);
        return { success: false, message: 'Error updating stock details.' };
    }
}

async function getUnrealizedProfitLossService() {
    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;

    try {
        const holdings = await databases.listDocuments(databaseId, holdingCollectionId);

        if (holdings.documents.length === 0) {
            return { success: true, message: 'No holdings found.', data: [] };
        }

        const results = holdings.documents.map(holding => {
            const ltp = parseFloat(holding.ltp);
            const avgRate = parseFloat(holding.avg_rate);
            const quantity = parseFloat(holding.quantity);

            const unrealizedProfitLoss = (ltp - avgRate) * quantity;
            const unrealizedPercentage = ((ltp - avgRate) / avgRate) * 100;

            return {
                symbol: holding.symbol,
                quantity: quantity.toFixed(2),
                avg_rate: avgRate.toFixed(2),
                ltp: ltp.toFixed(2),
                unrealized_profit_loss: unrealizedProfitLoss.toFixed(2),
                unrealized_percentage: unrealizedPercentage.toFixed(2),
            };
        });

        return {
            success: true,
            message: 'Data fetched successfully.',
            data: results,
        };
    } catch (error) {
        console.error('Error calculating unrealized profit/loss:', error);
        return { success: false, message: 'Error calculating unrealized profit/loss.' };
    }
}

async function getPortfolioSummaryService() {
    const databaseId = process.env.APPWRITE_DB_ID;
    const holdingCollectionId = process.env.APPWRITE_HOLDING_TABLE;

    try {
        // Fetch all holdings
        const holdings = await databases.listDocuments(databaseId, holdingCollectionId);

        if (holdings.documents.length === 0) {
            return { 
                success: true, 
                message: 'No holdings found.', 
                data: {
                    totalInvestment: 0,
                    totalAverageAmount: 0,
                    profitLossAmount: 0,
                    profitLossPercentage: 0,
                }
            };
        }

        // Initialize variables
        let totalInvestment = 0;
        let totalAverageAmount = 0;

        // Calculate total investment and total average amount
        holdings.documents.forEach(holding => {
            const totalAmount = parseFloat(holding.total_amount); // Total investment for this holding
            const ltp = parseFloat(holding.ltp); // Latest trading price
            const quantity = parseFloat(holding.quantity); // Quantity of stocks

            totalInvestment += totalAmount;
            totalAverageAmount += ltp * quantity;
        });

        // Calculate profit/loss
        const profitLossAmount = totalAverageAmount - totalInvestment;
        const profitLossPercentage = (profitLossAmount / totalInvestment) * 100;

        return {
            success: true,
            message: 'Portfolio summary calculated successfully.',
            data: {
                totalInvestment: totalInvestment.toFixed(2),
                totalAverageAmount: totalAverageAmount.toFixed(2),
                profitLossAmount: profitLossAmount.toFixed(2),
                profitLossPercentage: profitLossPercentage.toFixed(2),
            },
        };
    } catch (error) {
        console.error('Error calculating portfolio summary:', error);
        return { 
            success: false, 
            message: 'Error calculating portfolio summary.', 
        };
    }
}



module.exports = { 
    holdStocksServices,
    getholdingsService,
    sellStocksServices,
    getActivityService,
    updateStockDetailsService,
    getUnrealizedProfitLossService,
    getPortfolioSummaryService,
};
