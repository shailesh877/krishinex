const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Item = require('./models/Item');

dotenv.config();

async function checkItems() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const items = await Item.find({}).populate('owner', 'name role');
        console.log(`Total items in shop: ${items.length}`);
        
        items.forEach(it => {
            console.log(`Item: ${it.name}, Owner: ${it.owner ? it.owner.name : 'NULL'}, OwnerRole: ${it.owner ? it.owner.role : 'NULL'}, OwnerId: ${it.owner ? it.owner._id : 'NULL'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkItems();
