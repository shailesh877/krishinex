const mongoose = require('mongoose');
require('dotenv').config();
const LabourJob = require('./models/LabourJob');
const Rental = require('./models/Rental');
const SoilRequest = require('./models/SoilRequest');
const User = require('./models/User');
const { Chat } = require('./models/Chat');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const empId = '69b8dc0d7a578aa7675e4f85'; // Yuvraj Singh
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await User.findById(empId).select('employeeModules');
    const allowedModules = ['labour', 'equipment', 'soil', 'doctor'];

    let pendingOrders = await LabourJob.countDocuments({ assignedTo: empId, status: { $in: ['Pending', 'Accepted', 'In Progress'] } });
    let completedOrders = await LabourJob.countDocuments({ assignedTo: empId, status: 'Completed' });
    let totalOrders = await LabourJob.countDocuments({ assignedTo: empId });

    let pendingRentals = await Rental.countDocuments({ assignedFieldExec: empId, status: { $in: ['New', 'Accepted', 'In Progress'] } });
    let totalRentals = await Rental.countDocuments({ assignedFieldExec: empId });

    let pendingSoil = await SoilRequest.countDocuments({ lab: empId, status: { $in: ['New', 'Accepted', 'InProgress'] } });
    let completedSoil = await SoilRequest.countDocuments({ lab: empId, status: 'Completed' });
    let totalSoil = await SoilRequest.countDocuments({ lab: empId });

    let totalChats = await Chat.countDocuments({ doctor: empId });

    const totalPending = pendingOrders + pendingRentals + pendingSoil;
    const totalCompleted = completedOrders + completedSoil;
    const totalAssigned = totalOrders + totalRentals + totalSoil + totalChats;

    console.log('Results for', empId, ':', {
        totalAssigned,
        totalPending,
        totalCompleted,
        detail: {
            labour: { total: totalOrders, pending: pendingOrders, completed: completedOrders },
            rental: { total: totalRentals, pending: pendingRentals },
            soil: { total: totalSoil, pending: pendingSoil, completed: completedSoil },
            chats: totalChats
        }
    });
    process.exit();
});
