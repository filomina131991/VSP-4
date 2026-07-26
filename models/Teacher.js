// Teacher Model - Schema and database model
import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  // Reference to User account
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  
  // School association
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  
  // Teacher basic information
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  penNumber: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true,
    trim: true 
  },
  designation: { 
    type: String, 
    default: 'HST Default',
    trim: true 
  },
  
  // Contact information
  email: { 
    type: String, 
    trim: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    trim: true 
  },
  profileImage: { 
    type: String 
  },
  
  // Teacher assignments and subjects
  teachingSubjects: [{
    subjectCode: {
      type: String,
      required: true,
      trim: true
    },
    subjectName: {
      type: String,
      trim: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  assignedSubjects: [{
    type: String,
    trim: true
  }],
  
  // Class and division assignments
  assignedClasses: [{
    type: String,
    trim: true
  }],
  
  assignedDivisions: [{
    type: String,
    trim: true
  }],
  
  // Medium preferences
  mediums: [{
    mediumCode: {
      type: String,
      required: true,
      trim: true
    },
    mediumName: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Exam preferences
  examPreferences: {
    firstLanguagePapers: [{
      medium: {
        type: String,
        trim: true
      },
      paperType: {
        type: String,
        enum: ['AT', 'BT'],
        trim: true
      }
    }],
    examConfiguration: {
      type: String,
      enum: ['STANDARD', 'CUSTOM', 'ENHANCED'],
      default: 'STANDARD'
    }
  },
  
  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordChanged: {
    type: Boolean,
    default: false
  },
  
  // Audit fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
TeacherSchema.index({ schoolId: 1, penNumber: 1 }, { unique: true });
TeacherSchema.index({ schoolId: 1, status: 1 });
TeacherSchema.index({ userId: 1 });
TeacherSchema.index({ penNumber: 1 });
TeacherSchema.index({ "teachingSubjects.subjectCode": 1 });
TeacherSchema.index({ "mediums.mediumCode": 1 });

module.exports = mongoose.model('Teacher', TeacherSchema);
