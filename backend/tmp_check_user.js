const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function checkPartner() {
    try {
        await mongoose.connect(MONGODB_URI);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const id = '69b83847c0598a737e48f34b';
        const user = await User.findById(id).lean();
        if (user) {
            console.log('ID:', user._id);
            console.log('Role:', user.role);
            console.log('Keys:', Object.keys(user));
            console.log('BankDetails:', user.bankDetails);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkPartner();
