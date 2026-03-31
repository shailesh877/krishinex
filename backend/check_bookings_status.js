require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

const RentalSchema = new mongoose.Schema({
    status: String,
    machine: mongoose.Schema.Types.ObjectId,
    fromDate: Date,
    toDate: Date
}, { timestamps: true });

const Rental = mongoose.model('Rental', RentalSchema);

async function checkBookings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        const bookings = await Rental.find({
            status: { $in: ['New', 'Accepted', 'In Progress'] }
        }).sort({ createdAt: -1 }).limit(10);

        console.log('Recent Active Bookings:');
        bookings.forEach(b => {
            console.log(`ID: ${b._id}, Status: ${b.status}, Machine: ${b.machine}, From: ${b.fromDate}, To: ${b.toDate}, CreatedAt: ${b.createdAt}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBookings();
