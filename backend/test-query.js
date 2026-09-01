const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://kassgroup2026_db_user:8WKOB5O4UzcS4n3D@cluster0.lwrokis.mongodb.net/krishinex?retryWrites=true&w=majority')
  .then(async () => {
    const User = require('./models/User.js');
    const query = { 
      $and: [ 
        { $or: [{ role: 'labour' }, { role: 'labourer' }, { labourDetails: { $exists: true } }] },
        { $or: [ 
          { name: { $regex: 'tester', $options: 'i' } }, 
          { phone: { $regex: 'tester', $options: 'i' } }, 
          { businessName: { $regex: 'tester', $options: 'i' } }, 
          { address: { $regex: 'tester', $options: 'i' } } 
        ] } 
      ] 
    };
    
    try {
      const count = await User.countDocuments(query);
      console.log('Count for tester:', count);
      
      const all = await User.countDocuments({ $or: [{ role: 'labour' }, { role: 'labourer' }, { labourDetails: { $exists: true } }] });
      console.log('Total:', all);
    } catch(e) {
      console.error(e);
    }
    process.exit(0);
  })
  .catch(console.error);
