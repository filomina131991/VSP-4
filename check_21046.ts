import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const teachers = await mongoose.connection.db.collection('users').find({
      schoolCode: '21046',
      role: { $in: ['TEACHER', 'RESOURCE_PERSON'] }
    }).toArray();
    
    teachers.forEach(t => {
      if (t.name.includes('Litty') || t.name.includes('Chithra') || true) {
         console.log('--- Teacher:', t.name);
         console.log('teachingSubjects:', t.teachingSubjects);
         console.log('assignedSubjects:', t.assignedSubjects);
         console.log('teacherAssignments:', JSON.stringify(t.teacherAssignments));
      }
    });
  } finally {
    mongoose.disconnect();
  }
});
