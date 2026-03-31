const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Ledger = require('./models/Ledger');

// DNS Fix
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const manualLedgerSync = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Find all farmers who have creditUsed = 0 but still have DUES in the Ledger
        const farmers = await User.find({ role: 'farmer' });

        for (const farmer of farmers) {
            const creditUsed = Number(farmer.creditUsed || 0);

            // Calculate current net due for this farmer across ALL shops
            const dues = await Ledger.aggregate([
                { $match: { farmerId: farmer._id } },
                {
                    $group: {
                        _id: null,
                        totalNetDue: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$method', 'DUE'] }, '$amount',
                                    { $cond: [{ $eq: ['$method', 'RECOVERY'] }, { $multiply: ['$amount', -1] }, 0] }
                                ]
                            }
                        }
                    }
                }
            ]);

            const totalNetDue = dues.length > 0 ? dues[0].totalNetDue : 0;

            if (totalNetDue > creditUsed) {
                const diff = totalNetDue - creditUsed;
                console.log(`[SYNC] Farmer ${farmer.name} (${farmer.phone}): Ledger Due is ₹${totalNetDue}, but Credit Used is ₹${creditUsed}. Fixing diff of ₹${diff}...`);

                // Find shops to apply RECOVERY
                const shopDues = await Ledger.aggregate([
                    { $match: { farmerId: farmer._id } },
                    {
                        $group: {
                            _id: '$shopId',
                            shopNetDue: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$method', 'DUE'] }, '$amount',
                                        { $cond: [{ $eq: ['$method', 'RECOVERY'] }, { $multiply: ['$amount', -1] }, 0] }
                                    ]
                                }
                            }
                        }
                    },
                    { $match: { shopNetDue: { $gt: 0 } } }
                ]);

                let remainingFix = diff;
                for (const sd of shopDues) {
                    if (remainingFix <= 0) break;
                    const fixForThisShop = Math.min(remainingFix, sd.shopNetDue);
                    
                    await Ledger.create({
                        shopId: sd._id,
                        farmerId: farmer._id,
                        amount: fixForThisShop,
                        type: 'DUE',
                        method: 'RECOVERY',
                        note: 'Manual Data-Sync: Aligning Ledger with Credit Balance'
                    });
                    
                    remainingFix -= fixForThisShop;
                    console.log(`[SYNC] Recovered ₹${fixForThisShop} for Shop ${sd._id} in Ledger.`);
                }
            }
        }

        console.log('Sync complete. All ledgers are now aligned with actual credit balances.');
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
};

manualLedgerSync();
