const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://filomina131991:KQ4C4aexfx5mwIUY@ac-l9ryjno-shard-00-00.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-01.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-02.xud2thb.mongodb.net:27017/vijayasree_palakkad?ssl=true&replicaSet=atlas-5bg85g-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
    
    const db = mongoose.connection.db;
    const markentriesCol = db.collection('markentries');

    const agg = await markentriesCol.aggregate([
      { 
        $match: { 
          $or: [{ isAbsent: false }, { isAbsent: { $exists: false } }, { status: 'Present' }] 
        } 
      },
      { 
        $group: { 
          _id: '$schoolId', 
          count: { $sum: 1 } 
        } 
      }
    ]).toArray();
    
    console.log(agg);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
