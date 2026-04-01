const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/krishinex');

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function check() {
    console.log("Checking DB for buyers with massive negative wallets...");
    const users = await User.find({ role: 'buyer', walletBalance: { $lt: 0 } });
    console.log(`Found ${users.length} users with negative wallet balance.`);
    for (let u of users) {
        console.log(`User: ${u.name || u.phone}, Wallet: ${u.walletBalance}`);
    }
    
    // Auto-fix: set negative wallets to 0
    if (users.length > 0) {
        await User.updateMany({ role: 'buyer', walletBalance: { $lt: 0 } }, { $set: { walletBalance: 0 } });
        console.log("Auto-fixed negative wallet balances to 0.");
    }
    
    process.exit(0);
}

check();
