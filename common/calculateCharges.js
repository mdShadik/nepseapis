const { databases, ID, Query } = require('../config/db');


async function calculateCharges(amount, isDpCharged) {

    const sebonCharge = amount * 0.00015;

    let dpCharge = 0;

    if (isDpCharged) {
        dpCharge = 25;
    }

    let commission = 0;
    if (amount <= 2500) {
        commission = 10;
    } else if (amount <= 50000) {
        commission = amount * 0.0036;
    } else if (amount <= 500000) {
        commission = amount * 0.0033;
    } else if (amount <= 2000000) {
        commission = amount * 0.0031;
    } else if (amount <= 10000000) {
        commission = amount * 0.0027;
    } else {
        commission = amount * 0.0024;
    }
    
    
    const totalCharges = sebonCharge + dpCharge + commission;
    const response = {
        sebonCharge,
        dpCharge,
        commission,
        totalCharges,
    }
    return response;
}

module.exports = {
    calculateCharges
}