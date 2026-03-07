const mongoose = require('mongoose');
require('dotenv').config();

const itemSchema = new mongoose.Schema({
    name: String,
    category: String,
});
const Item = mongoose.model('Item', itemSchema);

async function findBike() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const items = await Item.find({ name: /bike/i });
        console.log('Search Results:');
        items.forEach(it => {
            console.log(`- ${it.name} [Category: ${it.category}]`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findBike();
