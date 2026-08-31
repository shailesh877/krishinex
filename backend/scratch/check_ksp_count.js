const mongoose = require('mongoose');
try { require('dns').setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
    role: String,
    name: String,
    email: String
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function checkKsp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const total = await User.countDocuments({});
        console.log(`Total Users: ${total}`);
        
        const roles = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        console.log('Roles distribution:', roles);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkKsp();
