const mongoose = require('mongoose');
require('dotenv').config();

const itemSchema = new mongoose.Schema({
    name: String,
    category: String,
});
const Item = mongoose.model('Item', itemSchema);

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const migrations = [
            { old: 'fert', new: 'fertilizer' },
            { old: 'pest', new: 'pesticide' },
            { old: 'tool', new: 'equipment' }
        ];

        for (const m of migrations) {
            const result = await Item.updateMany(
                { category: m.old },
                { $set: { category: m.new } }
            );
            console.log(`Migrated ${m.old} -> ${m.new}: ${result.modifiedCount} items updated.`);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
