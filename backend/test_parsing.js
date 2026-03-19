const parsePriceInQuintals = (priceStr) => {
    if (!priceStr) return 0;
    const str = String(priceStr);
    console.log('Parsing:', str);
    // Look for ₹XX / Quintal or (₹XX / Quintal)
    const qmatch = str.match(/₹(\d+)\s*\/\s*Quintal/i);
    if (qmatch) {
        console.log('qmatch hit:', qmatch[1]);
        return parseInt(qmatch[1]) || 0;
    }
    // Fallback if no ₹ but has Quintal
    if (str.toLowerCase().includes('quintal')) {
        const fallback = str.match(/(\d+)\s*\/\s*Quintal/i);
        if (fallback) {
            console.log('fallback hit:', fallback[1]);
            return parseInt(fallback[1]) || 0;
        }
    }
    // Fallback: If it's XX / KG, multiply by 100
    if (str.toLowerCase().includes('/ kg')) {
        const kgVal = parseFloat(str) || 0;
        console.log('kg fallback hit:', kgVal);
        return kgVal * 100;
    }
    const final = parseFloat(str) || 0;
    console.log('Last resort:', final);
    return final;
};

console.log('Result 1:', parsePriceInQuintals("1 / KG (₹100 / Quintal)"));
console.log('Result 2:', parsePriceInQuintals("1 / KG (100 / Quintal)"));
console.log('Result 3:', parsePriceInQuintals("1 / KG"));
console.log('Result 4:', parsePriceInQuintals("₹100 / Quintal"));
