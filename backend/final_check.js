const mongoose = require('mongoose');
require('dotenv').config();

const itemSchema = new mongoose.Schema({
    name: String,
    category: String,
});
const Item = mongoose.model('Item', itemSchema);

async function finalCheck() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const categories = await Item.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 }, examples: { $push: "$name" } } }
        ]);

        console.log('Final Category Distribution:');
        categories.forEach(c => {
            console.log(`- ${c._id}: ${c.count} items (Examples: ${c.examples.slice(0, 3).join(', ')})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

finalCheck();
