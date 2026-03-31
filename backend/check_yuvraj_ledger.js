const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const logs = await mongoose.connection.collection('ledgers').find({ 
            farmerId: new mongoose.Types.ObjectId('69aa9ddf748b875747eeda37') 
        }).toArray();
        console.log(JSON.stringify(logs, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
