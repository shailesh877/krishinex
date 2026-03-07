const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const LabourJob = require('./models/LabourJob');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a few Farmer users if not exist (or find existing)
        let farmers = await User.find({ role: 'buyer' }).limit(2);
        if (farmers.length === 0) {
            console.log('No farmers found, creating a dummy one...');
            const dummyFarmer = new User({
                role: 'buyer',
                name: 'Ram Charan',
                phone: '9876543210',
                address: 'Indore, MP',
                status: 'approved'
            });
            await dummyFarmer.save();
            farmers = [dummyFarmer];
        }

        // 2. Create Labourers
        const labourData = [
            {
                role: 'labour',
                name: 'Suresh Kumar',
                businessName: 'Suresh Team',
                phone: '9988776655',
                address: 'Ujjain, MP',
                status: 'approved',
                labourDetails: {
                    skills: ['Harvesting', 'Pesticide Spray'],
                    availability: 'active',
                    jobsCompleted: 15,
                    rating: 4.8
                }
            },
            {
                role: 'labour',
                name: 'Mahesh Yadav',
                businessName: 'Mahesh Krishi Seva',
                phone: '8877665544',
                address: 'Dewas, MP',
                status: 'approved',
                labourDetails: {
                    skills: ['Sowing', 'Land Preparation'],
                    availability: 'active',
                    jobsCompleted: 8,
                    rating: 4.5
                }
            },
            {
                role: 'labour',
                name: 'Gopal Singh',
                phone: '7766554433',
                address: 'Indore, MP',
                status: 'pending',
                labourDetails: {
                    skills: ['General Support'],
                    availability: 'inactive',
                    jobsCompleted: 0,
                    rating: 0
                }
            }
        ];

        console.log('Seeding labourers...');
        const createdLabourers = [];
        for (const ld of labourData) {
            let existing = await User.findOne({ phone: ld.phone });
            if (!existing) {
                const newUser = new User(ld);
                await newUser.save();
                createdLabourers.push(newUser);
                console.log(`Created labourer: ${ld.name}`);
            } else {
                console.log(`Labourer with phone ${ld.phone} already exists`);
                createdLabourers.push(existing);
            }
        }

        // 3. Create Sample Jobs
        console.log('Seeding jobs...');
        const jobs = [
            {
                labour: createdLabourers[0]._id,
                farmer: farmers[0]._id,
                workType: 'Wheat Harvesting',
                acresCovered: 5,
                amount: 3500,
                rating: 5,
                status: 'Completed'
            },
            {
                labour: createdLabourers[1]._id,
                farmer: farmers[0]._id,
                workType: 'Cotton Sowing',
                hoursWorked: 8,
                amount: 1200,
                rating: 4,
                status: 'Completed'
            },
            {
                labour: createdLabourers[0]._id,
                farmer: farmers[0]._id,
                workType: 'Pesticide Spray',
                acresCovered: 10,
                amount: 5000,
                status: 'In Progress'
            }
        ];

        for (const job of jobs) {
            const newJob = new LabourJob(job);
            await newJob.save();
        }

        console.log('Seeding complete! 🚀');
        process.exit(0);

    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
