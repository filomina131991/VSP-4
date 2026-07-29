import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new Schema({
  username:        { type: String, required: true, unique: true },
  password:        { type: String, required: true },
  role:            { type: String, required: true, enum: ['WEBMASTER', 'DEO', 'DIET', 'SCHOOL', 'SUBJECT_EXPERT', 'RESOURCE_PERSON', 'TEACHER'] }, // Enforced enum
  name:            { type: String, default: '' },
  email:           { type: String, default: '' },
  phone:           { type: String, default: '' },
  active:          { type: Boolean, default: true },
  passwordChanged: { type: Boolean, default: false },
  previousPasswords:{ type: [String], default: [] }, // For password history
  lastLogin:       { type: Date },
  loginAttempts:   { type: Number, default: 0 },
  lockedUntil:     { type: Date },
  refreshToken:    { type: String, default: null, index: true },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  // School-only fields
  schoolCode:      { type: String, default: '' },
  schoolType:      { type: String, default: '' },
  hmName:          { type: String, default: '' },
  hmEmail:         { type: String, default: '' },
  hmMobile:        { type: String, default: '' },
  coordinatorName:  { type: String, default: '' },
  coordinatorEmail: { type: String, default: '' },
  coordinatorMobile:{ type: String, default: '' },
  address:         { type: String, default: '' },
  schoolEmail:     { type: String, default: '' },
  schoolTelephone: { type: String, default: '' },
  udiseCode:       { type: String, default: '' },
  profileCompleted:{ type: Boolean, default: false },
  
  // New fields for Question Repository Ecosystem
  penNumber:       { type: String, default: '' },
  designation:     { type: String, default: '' },
  teachingSubjects:{ type: [String], default: [] }, // Deprecated
  teachingSubjectIds:{ type: [String], default: [] },
  skills:          { type: [String], default: [] },
  joiningDate:     { type: Date },
  dob:             { type: Date },
  qualification:   { type: String, default: '' },
  assignedSubjects:{ type: [String], default: [] }, // Actually classes
  mediums:         { type: [String], default: [] }, // Deprecated
  mediumIds:       { type: [String], default: [] },
  teacherAssignments: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // Region references stored as string IDs for UI compatibility
  mainDistrictId:  { type: String, default: null },
  districtId:      { type: String, default: null },
  subDistrictId:   { type: String, default: null },
  schoolId:        { type: String, default: null },
  brcId:           { type: String, default: null },
  panchayatId:     { type: String, default: null },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual aliases for frontend compatibility
UserSchema.virtual('displayName')
  .get(function(this: any) { return this.name; })
  .set(function(this: any, v: string) { this.name = v; });

UserSchema.virtual('code')
  .get(function(this: any) { return this.schoolCode; })
  .set(function(this: any, v: string) { this.schoolCode = v; });

UserSchema.virtual('type')
  .get(function(this: any) { return this.schoolType; })
  .set(function(this: any, v: string) { this.schoolType = v; });

UserSchema.virtual('principalName')
  .get(function(this: any) { return this.hmName; })
  .set(function(this: any, v: string) { this.hmName = v; });

UserSchema.virtual('eduId')
  .get(function(this: any) { return this.subDistrictId; })
  .set(function(this: any, v: string) { this.subDistrictId = v; });

// ─── District ────────────────────────────────────────────────────────────────

const MainDistrictSchema = new Schema({
  id:   { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  code: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

const DistrictSchema = new Schema({
  id:             { type: String, required: true, unique: true, index: true },
  name:           { type: String, required: true },
  mainDistrictId: { type: String, default: 'main-1' },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Revenue Division ────────────────────────────────────────────────────────

const RevenueDivisionSchema = new Schema({
  id:         { type: String, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  districtId: { type: String, required: true },
  active:     { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Educational Sub-district ─────────────────────────────────────────────────

const EducationalDistrictSchema = new Schema({
  id:                { type: String, required: true, unique: true, index: true },
  name:              { type: String, required: true },
  districtId:        { type: String, required: true },
  revenueDivisionId: { type: String, default: '' },
  active:            { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Institution ─────────────────────────────────────────────────────────────

const InstitutionSchema = new Schema({
  id:                   { type: String, required: true, unique: true, index: true },
  name:                 { type: String, required: true },
  code:                 { type: String, default: '' },
  type:                 { type: String, enum: ['Government', 'Aided', 'Unaided'], default: 'Government' },
  districtId:           { type: String, default: '' },
  revenueDistrictId:    { type: String, default: '' },
  eduDistrictId:        { type: String, default: '' },
  address:              { type: String, default: '' },
  phone:                { type: String, default: '' },
  email:                { type: String, default: '' },
  hmName:               { type: String, default: '' },
  hmMobile:             { type: String, default: '' },
  hmEmail:              { type: String, default: '' },
  coordinatorName:      { type: String, default: '' },
  coordinatorMobile:    { type: String, default: '' },
  coordinatorEmail:     { type: String, default: '' },
  udiseCode:            { type: String, default: '' },
  schoolId:             { type: String, default: '' },
  active:               { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Medium ──────────────────────────────────────────────────────────────────

const MediumSchema = new Schema({
  id:           { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },   // "Tamil Medium", "English Medium"
  code:         { type: String, required: true },     // "TM", "EM", "MM", "KM"
  shortName:    { type: String, required: true },     // "Tamil", "English", etc.
  active:       { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

MediumSchema.index({ active: 1, displayOrder: 1 });

// ─── Subject ──────────────────────────────────────────────────────────────────

const SubjectSchema = new Schema({
  name:         { type: String, required: true },
  shortName:    { type: String, required: true }, // P01, P02, ...
  code:         { type: String, default: '' },    // P01, P02, ... P10
  medium:       { type: String, default: '' },    // TM, EM, MM, KM, etc. (legacy)
  mediumId:     { type: String, default: '' },    // FK to Medium.id
  mediumName:   { type: String, default: '' },    // Denormalized: "Tamil", "English"
  category:     { type: String, default: '' },    // FIRST_LANGUAGE | SECOND_LANGUAGE | THIRD_LANGUAGE | CORE
  paperType:    { type: String, default: '' },    // P01, P02, ... P10
  languageType: { type: String, default: '' },    // FIRST_PAPER_I | FIRST_PAPER_II | SECOND | THIRD
  active:       { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

SubjectSchema.index({ mediumId: 1, active: 1 });
SubjectSchema.index({ category: 1, active: 1 });
SubjectSchema.index({ paperType: 1, active: 1 });
SubjectSchema.index({ displayOrder: 1, code: 1 });


// ─── Exam ─────────────────────────────────────────────────────────────────────

const ExamSchema = new Schema({
  id:               { type: String, required: true, unique: true, index: true },
  name:             { type: String, required: true },
  standard:         { type: String, required: true, default: '10' },
  academicYear:     { type: String, required: true, default: '2024-2025' },
  startDate:        { type: Date },
  endDate:          { type: Date },
  status:           { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  active:           { type: Boolean, default: true },
  isDefault:        { type: Boolean, default: false },
  confirmedSchools: { type: [String], default: [] }, // Array used as Set logic in API
  confirmations:    { type: Object, default: {} },
  confirmedSubjects:{ type: Object, default: {} }, // SchoolId -> array of confirmed subject IDs
  maxMarks:         { type: Map, of: Number, default: {} },
  includeCEMarks:   { type: Boolean, default: false },
  includeICT:       { type: Boolean, default: false },
  allow_csv_upload: { type: Boolean, default: true },
  marksEntryMode:   { type: String, enum: ['marks', 'grades', 'both'], default: 'both' },
  hasMarkGroups:    { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Admin Mark Group Config ──────────────────────────────────────────────────

const AdminMarkGroupConfigSchema = new Schema({
  subjectId: { type: String, required: true, unique: true, index: true },
  groups: [{
    name: { type: String, required: true },
    maxQuestions: { type: Number, required: true, default: 1 },
    maxMarks: { type: Number, required: true },
    total: { type: Number, required: true, default: 0 }
  }]
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── School Exam Config ───────────────────────────────────────────────────────

const SchoolExamConfigSchema = new Schema({
  schoolId: { type: String, required: true, index: true },
  examId:   { type: String, required: true, index: true },
  pdfUrl:   { type: String },
  isSchoolConfirmed: { type: Boolean, default: false },
  schoolConfirmedAt: { type: Date },
  schoolConfirmedBy: { type: String },
  status: { type: String, enum: ['PENDING', 'FINAL_CONFIRMED'], default: 'PENDING' },
  // Legacy support
  subjects: [{
    subjectId: { type: String, required: true },
    isSubjectConfirmed: { type: Boolean, default: false },
    subjectConfirmedAt: { type: Date },
    subjectConfirmedBy: { type: String },
    // Workflow tracking per subject
    workflowStatus:     { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'TEACHER_CONFIRMED', 'COMPLETED'], default: 'NOT_STARTED' },
    teacherConfirmedAt: { type: Date },
    teacherConfirmedBy: { type: String },
    schoolReviewedAt:   { type: Date },
    schoolReviewedBy:   { type: String },
    groups: [{
      name: { type: String, required: true },
      maxQuestions: { type: Number, required: true, default: 1 },
      maxMarks: { type: Number, required: true },
      total: { type: Number, required: true, default: 0 }
    }]
  }],
  // New Exam Config Module (Marks Entry 2.0)
  firstLanguages: { type: [String], default: [] }, // Deprecated
  firstLanguageIds: { type: [String], default: [] },
  papers: [{
    id: { type: String, required: true }, // P01, P02...
    name: { type: String, required: true },
    subjects: { type: [String], default: [] }, // Deprecated
    subjectIds: { type: [String], default: [] },
    status: { type: Boolean, default: true },
    description: { type: String, default: '' }
  }]
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

SchoolExamConfigSchema.index({ schoolId: 1, examId: 1 }, { unique: true });

// ─── Student ──────────────────────────────────────────────────────────────────

const StudentSchema = new Schema({
  id:             { type: String, required: true, unique: true, index: true },
  globalId:       { type: String },           // Registration / roll number
  admissionNumber:{ type: String },
  name:           { type: String, required: true },
  schoolId:       { type: String, required: true },
  schoolCode:     { type: String, default: '' },  // school code for student code generation
  uniqueId:       { type: String },
  gender:         { type: String, default: 'Boy' },
  scribe:         { type: Boolean, default: false },
  className:      { type: String, default: '10' },
  division:       { type: String, default: '' },
  dob:            { type: Date },
  caste:          { type: String, default: '' },
  category:       { type: String, default: 'OBC' },
  religion:       { type: String, default: '' },
  fatherName:     { type: String, default: '' },
  motherName:     { type: String, default: '' },
  place:          { type: String, default: '' },
  mobile:         { type: String, default: '' },
  sslcRegNo:      { type: String, default: '' },
  lettersStatus:  { type: Number, default: 0 },
  readingStatus:  { type: Number, default: 0 },
  writingStatus:  { type: Number, default: 0 },
  medium:         { type: String, default: '' },
  mediumId:                 { type: String, default: '', index: true },
  firstLangPaper1:{ type: String, default: '' },
  firstLangPaper1SubjectId: { type: String, default: '', index: true },
  firstLangPaper2:{ type: String, default: '' },
  firstLangPaper2SubjectId: { type: String, default: '', index: true },
  secondLang:     { type: String, default: 'English' },
  secondLanguageSubjectId:  { type: String, default: '', index: true },
  thirdLang:      { type: String, default: 'Hindi' },
  thirdLanguageSubjectId:   { type: String, default: '', index: true },
  academicYear:   { type: String, required: true },
  subjects:       { type: [String], default: [] }, // Deprecated
  subjectIds:     { type: [String], default: [] },
  status:         { type: String, enum: ['Active', 'Inactive', 'Transferred'], default: 'Active' },
  active:         { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// Compound unique index for Registration Number within a school and year
StudentSchema.index({ globalId: 1, schoolId: 1, academicYear: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, className: 1, academicYear: 1 });
StudentSchema.index({ schoolId: 1, active: 1, className: 1 });
StudentSchema.index({ schoolId: 1, className: 1, active: 1, gender: 1 });
StudentSchema.index({ className: 1, active: 1, gender: 1, schoolId: 1 });
StudentSchema.index({ schoolId: 1, mediumId: 1 });


// Virtual aliases for frontend compatibility
StudentSchema.virtual('vGlobalId')
  .get(function(this: any) { return this.globalId; })
  .set(function(this: any, v: string) { this.globalId = v; });

StudentSchema.virtual('isScribe')
  .get(function(this: any) { return this.scribe; })
  .set(function(this: any, v: boolean) { this.scribe = v; });

StudentSchema.virtual('classStandard')
  .get(function(this: any) { return this.className; })
  .set(function(this: any, v: string) { this.className = v; });

StudentSchema.virtual('letterStatus')
  .get(function(this: any) { return this.lettersStatus; })
  .set(function(this: any, v: number) { this.lettersStatus = v; });

// ─── Mark Entry ───────────────────────────────────────────────────────────────

const MarkSchema = new Schema({
  schoolId:   { type: String, index: true },
  examId:     { type: String, required: true },
  studentId:  { type: String, required: true },
  subjectId:  { type: String, required: true },
  subjectCode:{ type: String, index: true },
  className:  { type: String },
  
  // New Marks Entry 2.0 fields
  status:     { type: String, enum: ['Present', 'Absent', 'Exempted'], default: 'Present' },
  rawScore:   { type: Number },
  rawMaximum: { type: Number },
  normalizedScore: { type: Number },
  percentage: { type: Number },
  isAbsent:   { type: Boolean, default: false },
  isPresent:  { type: Boolean, default: true },
  isEvaluated:{ type: Boolean, default: true },
  
  // Legacy fields retained for backwards compatibility during migration
  grade:      { type: String },
  mark:       { type: Number },
  previousGrade: { type: String },
  gradePoint: { type: Number },
  ceMark:     { type: Number },
  total:      { type: Number },
  
  markGroups: { type: [Schema.Types.Mixed], default: [] },
  enteredBy:  { type: String }, // User ID of who entered
  source:     { type: String, enum: ['manual', 'ai'], default: 'manual' },
  locked:     { type: Boolean, default: false },
  finalLocked:{ type: Boolean, default: false },

  // Workflow tracking fields
  workflowStatus:     { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'TEACHER_CONFIRMED', 'COMPLETED'], default: 'NOT_STARTED' },
  teacherConfirmedAt: { type: Date },
  teacherConfirmedBy: { type: String },
  schoolReviewedAt:   { type: Date },
  schoolReviewedBy:   { type: String },
  lastEditedBy:       { type: String },
  lastEditedAt:       { type: Date },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// Compound unique index to prevent duplicate marks
MarkSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });
MarkSchema.index({ examId: 1, schoolId: 1 });
MarkSchema.index({ examId: 1, subjectId: 1, grade: 1 });
MarkSchema.index({ schoolId: 1, examId: 1, subjectId: 1, grade: 1 });
MarkSchema.index({ examId: 1, studentId: 1 });
MarkSchema.index({ examId: 1, subjectId: 1, schoolId: 1, workflowStatus: 1 });

// ─── Preferences ──────────────────────────────────────────────────────────────

const PreferenceSchema = new Schema({
  id:    { type: String, default: 'global', unique: true, index: true },
  key:   { type: String, default: 'global', unique: true },
  data:  { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Grade Boundaries ─────────────────────────────────────────────────────────

const GradeConfigSchema = new Schema({
  id:      { type: String, default: 'global', unique: true, index: true },
  key:     { type: String, default: 'global', unique: true },
  std9_10: { type: [Schema.Types.Mixed], default: [] },
  std8:    { type: [Schema.Types.Mixed], default: [] },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Resource Materials ──────────────────────────────────────────────────────

const ResourceSchema = new Schema({
  id:          { type: String, required: true, unique: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, default: 'General', index: true },
  className:   { type: String, default: '' },
  medium:      { type: String, default: 'English' },
  subject:     { type: String, default: 'English' },
  fileUrl:     { type: String, required: true },
  publicId:    { type: String, required: true }, // Cloudinary public ID
  resourceType:{ type: String, default: 'raw' }, // image | raw
  fileType:    { type: String, required: true }, // pdf | docx | etc
  originalName:{ type: String },
  fileSize:    { type: Number },
  downloadCount:{ type: Number, default: 0 },
  uploadedBy:  { type: String }, // User ID
  active:      { type: Boolean, default: true, index: true },
  expiresAt:   { type: Date },
  publishDateTime: { type: Date }, // Optional: when the resource becomes available for download
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

const AuditLogSchema = new Schema({
  action:      { type: String, required: true },
  entityType:  { type: String, required: true },
  entityId:    { type: String },
  performedBy: { type: String, required: true }, // User ID
  details:     { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Message Alert ────────────────────────────────────────────────────────────

const MessageAlertSchema = new Schema({
  id:            { type: String, required: true, unique: true, index: true },
  title:         { type: String, required: true },
  content:       { type: String, required: true },
  target:        { type: String, enum: ['ALL', 'UNCONFIRMED', 'SPECIFIC'], default: 'ALL' },
  targetSchools: { type: [String], default: [] },
  active:        { type: Boolean, default: true },
  createdBy:     { type: String }, // User ID
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Pre-computed Analytics Summaries ──────────────────────────────────────────

const DashboardSummarySchema = new Schema({
  id:          { type: String, required: true, unique: true, index: true }, // e.g., state_exam-1, dist_9_exam-1, edu_91_exam-1
  level:       { type: String, enum: ['STATE', 'DISTRICT', 'EDU_DISTRICT'], required: true },
  refId:       { type: String, default: 'ALL' }, // 'ALL' for state, district id, or edu district id
  examId:      { type: String, required: true },
  className:   { type: String, default: '10' },
  stats:       { type: Schema.Types.Mixed, default: {} }, // pre-calculated appeared, passed, fullAPlus, grades
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

DashboardSummarySchema.index({ examId: 1, level: 1, refId: 1 }, { unique: true });

const SchoolSummarySchema = new Schema({
  schoolId:    { type: String, required: true, index: true },
  examId:      { type: String, required: true, index: true },
  className:   { type: String, default: '10' },
  stats:       { type: Schema.Types.Mixed, default: {} },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

SchoolSummarySchema.index({ schoolId: 1, examId: 1, className: 1 }, { unique: true });

// ─── Region Analytics Summary ───────────────────────────────────────────────

const RegionAnalyticsSummarySchema = new Schema({
  examId:    { type: String, required: true },
  className: { type: String, default: '10' },
  regions:   { type: Schema.Types.Mixed, default: [] },
  allDistrictsPassPct: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

RegionAnalyticsSummarySchema.index({ examId: 1, className: 1 }, { unique: true });

// ─── Question Repository Ecosystem ─────────────────────────────────────────────

const QuestionFamilySchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  masterQuestionId: { type: String },
  name: { type: String },
  notes: { type: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const QuestionSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  academicYear: { type: String, required: true },
  className: { type: String, required: true },
  subjectId: { type: String, required: true },
  medium: { type: String, required: true },
  unit: { type: String },
  chapter: { type: String },
  subUnit: { type: String },
  learningOutcome: { type: String },
  questionType: { type: String, required: true },
  marks: { type: Number, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  bloomLevel: { type: String, enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'], default: 'Understand' },
  status: { type: String, enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Needs Correction', 'Archived', 'Deleted'], default: 'Draft' },
  
  content: { type: String, required: true },
  options: { type: [Schema.Types.Mixed], default: [] }, // For MCQs
  explanation: { type: String },
  correctAnswer: { type: String },
  
  createdBy: { type: String, required: true }, // User ID (RP/Teacher)
  schoolId: { type: String, required: true },
  approvedBy: { type: String }, // User ID (Subject Expert)
  approvalDate: { type: Date },
  
  version: { type: Number, default: 1 },
  familyId: { type: String },
  isMaster: { type: Boolean, default: false },
  
  similarityHash: { type: String }, // Used for quick duplicate checking
  tags: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  remarks: { type: String },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Indexes for fast querying in repository
QuestionSchema.index({ subjectId: 1, className: 1, status: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ schoolId: 1 });

const QuestionVersionSchema = new Schema({
  questionId: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  contentSnapshot: { type: Schema.Types.Mixed, required: true },
  modifiedBy: { type: String, required: true },
  modifyReason: { type: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const SchoolTargetSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  schoolId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  targetCount: { type: Number, required: true },
  achievedCount: { type: Number, default: 0 },
  deadline: { type: Date },
  status: { type: String, enum: ['Pending', 'Completed', 'Overdue'], default: 'Pending' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const QuestionPaperBlueprintSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  className: { type: String, required: true },
  subjectId: { type: String, required: true },
  medium: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  createdBy: { type: String, required: true },
  config: { type: Schema.Types.Mixed, required: true },
  questionIds: { type: [String], default: [] }, // Specific questions picked
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const SubjectChapterSchema = new Schema({
  medium: { type: String, required: true, index: true },
  className: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  chapterName: { type: String, required: true },
  subUnits: { type: [String], default: [] },
}, { timestamps: true });

export const SubjectChapter = (mongoose.models['SubjectChapter'] || mongoose.model('SubjectChapter', SubjectChapterSchema, 'subject_chapters'));

const QuestionTaskSchema = new Schema({
  subjectExpertId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  unit: { type: String, required: true },
  questionsCount: { type: Number, required: true },
  markDistribution: [{
    mark: { type: Number, required: true },
    count: { type: Number, required: true }
  }],
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
}, { timestamps: true });

const BlueprintTemplateSchema = new Schema({
  createdBy: { type: String, required: true },
  subjectId: { type: String, required: true },
  className: { type: String, required: true },
  sections: [{
    title: { type: String },
    instruction: { type: String },
    markValue: { type: Number, required: true },
  }]
}, { timestamps: true });

// ─── Model Exports ────────────────────────────────────────────────────────────
// School and User both map to the 'users' collection — School is a filtered view.

export const User               = (mongoose.models['User'] || mongoose.model('User', UserSchema, 'users'));
export const School             = User; // School uses the same collection and schema
export const MainDistrict       = (mongoose.models['MainDistrict'] || mongoose.model('MainDistrict', MainDistrictSchema, 'maindistricts'));
export const District           = (mongoose.models['District'] || mongoose.model('District', DistrictSchema, 'districts'));
export const RevenueDivision    = (mongoose.models['RevenueDivision'] || mongoose.model('RevenueDivision', RevenueDivisionSchema, 'revenuedivisions'));
export const EducationalDistrict= (mongoose.models['EducationalDistrict'] || mongoose.model('EducationalDistrict', EducationalDistrictSchema, 'subdistricts'));
export const Institution       = (mongoose.models['Institution'] || mongoose.model('Institution', InstitutionSchema, 'institutions'));
export const Medium             = (mongoose.models['Medium'] || mongoose.model('Medium', MediumSchema, 'mediums'));
export const Subject            = (mongoose.models['Subject'] || mongoose.model('Subject', SubjectSchema, 'subjects'));
export const Exam               = (mongoose.models['Exam'] || mongoose.model('Exam', ExamSchema, 'exams'));
export const Student            = (mongoose.models['Student'] || mongoose.model('Student', StudentSchema, 'students'));
export const Mark               = (mongoose.models['Mark'] || mongoose.model('Mark', MarkSchema, 'markentries'));
export const Preference         = (mongoose.models['Preference'] || mongoose.model('Preference', PreferenceSchema, 'preferences'));
export const GradeConfig        = (mongoose.models['GradeConfig'] || mongoose.model('GradeConfig', GradeConfigSchema, 'grades'));
export const Grade              = GradeConfig;
export const Resource           = (mongoose.models['Resource'] || mongoose.model('Resource', ResourceSchema, 'resources'));
export const AuditLog           = (mongoose.models['AuditLog'] || mongoose.model('AuditLog', AuditLogSchema, 'auditlogs'));
export const MessageAlert       = (mongoose.models['MessageAlert'] || mongoose.model('MessageAlert', MessageAlertSchema, 'messagealerts'));
export const AdminMarkGroupConfig = (mongoose.models['AdminMarkGroupConfig'] || mongoose.model('AdminMarkGroupConfig', AdminMarkGroupConfigSchema, 'adminmarkgroupconfigs'));
export const SchoolExamConfig   = (mongoose.models['SchoolExamConfig'] || mongoose.model('SchoolExamConfig', SchoolExamConfigSchema, 'schoolexamconfigs'));
export const RegionAnalyticsSummary = (mongoose.models['RegionAnalyticsSummary'] || mongoose.model('RegionAnalyticsSummary', RegionAnalyticsSummarySchema, 'regionanalyticssummaries'));

export const QuestionFamily = (mongoose.models['QuestionFamily'] || mongoose.model('QuestionFamily', QuestionFamilySchema, 'questionfamilies'));
export const Question = (mongoose.models['Question'] || mongoose.model('Question', QuestionSchema, 'questions'));
export const QuestionVersion = (mongoose.models['QuestionVersion'] || mongoose.model('QuestionVersion', QuestionVersionSchema, 'questionversions'));
export const BlueprintTemplate = (mongoose.models['BlueprintTemplate'] || mongoose.model('BlueprintTemplate', BlueprintTemplateSchema));
export const SchoolTarget = (mongoose.models['SchoolTarget'] || mongoose.model('SchoolTarget', SchoolTargetSchema, 'schooltargets'));
export const QuestionPaperBlueprint = (mongoose.models['QuestionPaperBlueprint'] || mongoose.model('QuestionPaperBlueprint', QuestionPaperBlueprintSchema, 'questionpaperblueprints'));
export const QuestionTask = (mongoose.models['QuestionTask'] || mongoose.model('QuestionTask', QuestionTaskSchema, 'questiontasks'));

export const DashboardSummary = (mongoose.models['DashboardSummary'] || mongoose.model('DashboardSummary', DashboardSummarySchema, 'dashboardsummaries'));
export const SchoolSummary = (mongoose.models['SchoolSummary'] || mongoose.model('SchoolSummary', SchoolSummarySchema, 'schoolsummaries'));

// School is just a User with role === 'SCHOOL'
// We keep a School model to simplify queries in server.ts.

async function seedInitialData() {
  if (await Medium.countDocuments() === 0) {
    await Medium.insertMany([
      { id: 'medium-tm', name: 'Tamil Medium',     code: 'TM', shortName: 'Tamil',     displayOrder: 1, active: true },
      { id: 'medium-em', name: 'English Medium',    code: 'EM', shortName: 'English',   displayOrder: 2, active: true },
      { id: 'medium-mm', name: 'Malayalam Medium',  code: 'MM', shortName: 'Malayalam', displayOrder: 3, active: true },
      { id: 'medium-km', name: 'Kannada Medium',    code: 'KM', shortName: 'Kannada',   displayOrder: 4, active: true },
    ]);
  }

  const subjectList = [
    { name: 'FIRST LANGUAGE (PAPER I) TAMIL AT - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 10, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER I) MALAYALAM AT - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 12, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER I) KANNADA AT - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 13, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'ADDL. ENGLISH - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 14, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'ADDL. HINDI - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 15, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER I) ARABIC - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 16, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER I) URDU - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 17, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER I) SANSKRIT - P01', shortName: 'P01', code: 'P01', category: 'FIRST_LANGUAGE', paperType: 'P01', displayOrder: 18, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    
    { name: 'FIRST LANGUAGE (PAPER II) TAMIL BT - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 21, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER II) MALAYALAM BT - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 22, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER II) KANNADA BT - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 23, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'SPECIAL. ENGLISH - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 24, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'SPECIAL. HINDI - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 25, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER II) ARABIC - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 26, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER II) URDU - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 27, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'FIRST LANGUAGE (PAPER II) SANSKRIT - P02', shortName: 'P02', code: 'P02', category: 'FIRST_LANGUAGE', paperType: 'P02', displayOrder: 28, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },

    { name: 'ENGLISH (SECOND LANGUAGE) - P03', shortName: 'P03', code: 'P03', category: 'SECOND_LANGUAGE', paperType: 'P03', displayOrder: 30, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'HINDI (THIRD LANGUAGE) - P04', shortName: 'P04', code: 'P04', category: 'THIRD_LANGUAGE', paperType: 'P04', displayOrder: 40, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'SOCIAL SCIENCE - P05', shortName: 'P05', code: 'P05', category: 'CORE', paperType: 'P05', displayOrder: 50, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'PHYSICS - P06', shortName: 'P06', code: 'P06', category: 'CORE', paperType: 'P06', displayOrder: 60, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'CHEMISTRY - P07', shortName: 'P07', code: 'P07', category: 'CORE', paperType: 'P07', displayOrder: 70, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'BIOLOGY - P08', shortName: 'P08', code: 'P08', category: 'CORE', paperType: 'P08', displayOrder: 80, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'MATHEMATICS - P09', shortName: 'P09', code: 'P09', category: 'CORE', paperType: 'P09', displayOrder: 90, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' },
    { name: 'INFORMATION TECHNOLOGY - P10', shortName: 'P10', code: 'P10', category: 'CORE', paperType: 'P10', displayOrder: 100, active: true, medium: '', mediumId: '', mediumName: '', languageType: '' }
  ];

  if (await Subject.countDocuments() === 0) {
    await Subject.insertMany(subjectList);
  }

  if (await MainDistrict.countDocuments() === 0) {
    await MainDistrict.insertMany([
      { id: 'main-1', name: 'Palakkad Zone / Main District', code: 'PKD', createdAt: new Date(), updatedAt: new Date() }
    ]);
  }

  if (await District.countDocuments() === 0) {
    await District.insertMany([
      { id: 'dist-1',  name: 'Thiruvananthapuram', mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-2',  name: 'Kollam',              mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-3',  name: 'Pathanamthitta',      mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-4',  name: 'Alappuzha',           mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-5',  name: 'Kottayam',            mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-6',  name: 'Idukki',              mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-7',  name: 'Ernakulam',           mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-8',  name: 'Thrissur',            mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-9',  name: 'Palakkad',            mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-10', name: 'Malappuram',          mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-11', name: 'Kozhikode',           mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-12', name: 'Wayanad',             mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-13', name: 'Kannur',              mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'dist-14', name: 'Kasaragod',           mainDistrictId: 'main-1', createdAt: new Date(), updatedAt: new Date() },
    ]);
  }

  if (await Exam.countDocuments() === 0) {
    await Exam.insertMany([
      { id: 'exam-1', name: 'SSLC Term 1', standard: '10', active: true, confirmedSchools: [], confirmations: {}, allow_csv_upload: true },
      { id: 'exam-2', name: 'SSLC Term 2', standard: '10', active: true, confirmedSchools: [], confirmations: {}, allow_csv_upload: true }
    ]);
  }

  if (await User.countDocuments() === 0) {
    const hashedPassword = await bcrypt.hash('admin', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'WEBMASTER',
      name: 'Super Admin',
      email: 'admin@vsp.local',
      active: true,
      passwordChanged: true
    });
  }

  // Completely purge any legacy demo seed data for SCH001 and SCH002
  const legacyCodes = ['SCH001', 'SCH002'];
  const legacySchools = await User.find({ $or: [{ username: { $in: legacyCodes } }, { schoolCode: { $in: legacyCodes } }] });
  const legacySchoolIds = legacySchools.map(s => s._id.toString());

  await User.deleteMany({ $or: [{ username: { $in: legacyCodes } }, { schoolCode: { $in: legacyCodes } }] });
  await Student.deleteMany({ $or: [{ schoolId: { $in: legacySchoolIds } }, { schoolCode: { $in: legacyCodes } }, { id: { $regex: /SCH00[12]/i } }] });
  await Mark.deleteMany({ $or: [{ schoolId: { $in: legacySchoolIds } }, { studentId: { $regex: /SCH00[12]/i } }] });

  await Preference.findOneAndUpdate(
    { key: 'global' },
    { key: 'global', data: { theme: 'light', compactView: false, showSummary: true, autoSave: true, notifications: true } },
    { upsert: true, returnDocument: 'after' }
  );

  await Grade.findOneAndUpdate(
    { key: 'global' },
    {
      key: 'global',
      std9_10: [
        { grade: 'A+', min: 90, range: '90-99',   scores: { '25': '23-25', '30': '27-30', '35': '32-35', '40': '36-40', '80': '72-80' } },
        { grade: 'A',  min: 80, range: '80-89',   scores: { '25': '20-22', '30': '24-26', '35': '28-31', '40': '32-35', '80': '64-71' } },
        { grade: 'B+', min: 70, range: '70-79',   scores: { '25': '18-19', '30': '21-23', '35': '25-27', '40': '28-31', '80': '56-63' } },
        { grade: 'B',  min: 60, range: '60-69',   scores: { '25': '15-17', '30': '18-20', '35': '21-24', '40': '24-27', '80': '48-55' } },
        { grade: 'C+', min: 50, range: '50-59',   scores: { '25': '13-14', '30': '15-17', '35': '18-20', '40': '20-23', '80': '40-47' } },
        { grade: 'C',  min: 40, range: '40-49',   scores: { '25': '10-12', '30': '12-14', '35': '14-17', '40': '16-19', '80': '32-39' } },
        { grade: 'D+', min: 30, range: '30-39',   scores: { '25': '8-9',   '30': '9-11',  '35': '11-13', '40': '12-15', '80': '24-31' } },
        { grade: 'D',  min: 20, range: '20-29',   scores: { '25': '5-7',   '30': '6-8',   '35': '7-10',  '40': '8-11',  '80': '16-23' } },
        { grade: 'E',  min: 0,  range: '0-19',    scores: { '25': '0-4',   '30': '0-5',   '35': '0-6',   '40': '0-7',   '80': '0-15' } },
      ],
      std8: [
        { grade: 'A', min: 80, range: 'Above 80%', scores: { '20': '16-20', '40': '32-40', '50': '40-50', '60': '48-60', '80': '64-80' } },
        { grade: 'B', min: 60, range: '60%-79%', scores: { '20': '12-15', '40': '24-31', '50': '30-39', '60': '36-47', '80': '48-63' } },
        { grade: 'C', min: 40, range: '40%-59%', scores: { '20': '8-11', '40': '16-23', '50': '20-29', '60': '24-35', '80': '32-47' } },
        { grade: 'D+', min: 30, range: '30-39%', scores: { '20': '6-7', '40': '12-15', '50': '15-19', '60': '18-23', '80': '24-31' } },
        { grade: 'D', min: 20, range: '20-29%', scores: { '20': '4-5', '40': '8-11', '50': '10-14', '60': '12-17', '80': '16-23' } },
        { grade: 'E', min: 0,  range: 'Below 20%', scores: { '20': 'Below 4', '40': 'Below 8', '50': 'Below 10', '60': 'Below 12', '80': 'Below 16' } },
      ]
    },
    { upsert: true, returnDocument: 'after' }
  );
}

export async function recalculateAllGrades() {
  console.log("Starting automatic recalculation of student grades...");
  try {
    const gradeDoc = await Grade.findOne({ key: 'global' });
    if (!gradeDoc) {
      console.warn("No grade config found in database for recalculation.");
      return;
    }

    const std8Config = gradeDoc.std8 || [];
    const std9_10Config = gradeDoc.std9_10 || [];

    const getGradeFromConfig = (mark: number, total: number, className: string) => {
      if (!total || mark === undefined || mark === null || isNaN(mark)) return '';
      const pct = Math.round((mark * 100) / total);
      const config = className === '8' ? std8Config : std9_10Config;
      if (config && config.length > 0) {
        const sorted = [...config].sort((a: any, b: any) => {
          const getMin = (g: any) => g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
          return getMin(b) - getMin(a);
        });
        for (const g of sorted) {
          const min = g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
          if (pct >= min) return g.grade;
        }
      }
      // Fallback
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C+';
      if (pct >= 40) return 'C';
      if (pct >= 30) return 'D+';
      if (pct >= 20) return 'D';
      return 'E';
    };

    const markEntries = await Mark.find({});
    let count = 0;
    for (const entry of markEntries) {
      if (entry.grade === 'Ab' || entry.grade === 'AB') continue;
      
      // Do not recalculate if mark is not provided or invalid (fixes issue where grades are overwritten with E)
      if (entry.mark === undefined || entry.mark === null || isNaN(Number(entry.mark))) {
        continue;
      }

      const currentMark = Number(entry.mark);
      const currentTotal = entry.total || 40;
      const currentClass = entry.className || '10';
      const correctGrade = getGradeFromConfig(currentMark, currentTotal, currentClass);
      
      if (correctGrade && entry.grade !== correctGrade) {
        console.log(`Updating student ${entry.studentId} mark entry: mark ${currentMark}/${currentTotal}, class ${currentClass}, grade ${entry.grade} -> ${correctGrade}`);
        entry.grade = correctGrade;
        await entry.save();
        count++;
      }
    }
    console.log(`Automatic recalculation finished. Updated ${count} marks.`);
  } catch (error) {
    console.error("Error during automatic grade recalculation:", error);
  }
}

async function mergeDuplicateSchools() {
  try {
    const alreadyMerged = await Preference.findOne({ key: 'schools_merged_v1' });
    if (alreadyMerged) {
      return; // Already executed once, no need to run on every server startup
    }

    console.log("Starting initial duplicate school rows cleanup/merge...");
    const allSchoolDocs = await User.find({ role: 'SCHOOL' });
    const schoolDocs = allSchoolDocs.filter(d => d.schoolCode && d.schoolCode.trim() !== "");
    const userOnlyDocs = allSchoolDocs.filter(d => !d.schoolCode || d.schoolCode.trim() === "");

    for (const school of schoolDocs) {
      const duplicates = userOnlyDocs.filter(u => 
        (u.username && u.username === school.schoolCode) || 
        (u.schoolId && u.schoolId === school._id.toString())
      );

      let updated = false;
      if (school.schoolId !== school._id.toString()) {
        school.schoolId = school._id.toString();
        updated = true;
      }
      if (school.username !== school.schoolCode) {
        school.username = school.schoolCode;
        updated = true;
      }

      if (duplicates.length > 0) {
        const primaryDuplicate = duplicates[0];
        school.password = primaryDuplicate.password || school.password;
        school.passwordChanged = primaryDuplicate.passwordChanged !== undefined ? primaryDuplicate.passwordChanged : school.passwordChanged;
        school.lastLogin = primaryDuplicate.lastLogin || school.lastLogin;
        school.loginAttempts = primaryDuplicate.loginAttempts !== undefined ? primaryDuplicate.loginAttempts : school.loginAttempts;
        school.lockedUntil = primaryDuplicate.lockedUntil || school.lockedUntil;
        school.refreshToken = primaryDuplicate.refreshToken || school.refreshToken;
        updated = true;

        for (const dup of duplicates) {
          await User.deleteOne({ _id: dup._id });
        }
      }

      if (!school.password) {
        school.password = await bcrypt.hash(school.schoolCode, 10);
        school.passwordChanged = false;
        updated = true;
      }

      if (updated) {
        await school.save();
      }
    }

    const remainingUserOnly = await User.find({ role: 'SCHOOL', $or: [{ schoolCode: "" }, { schoolCode: { $exists: false } }] });
    if (remainingUserOnly.length > 0) {
      for (const u of remainingUserOnly) {
        await User.deleteOne({ _id: u._id });
      }
    }

    await Preference.create({ key: 'schools_merged_v1', id: 'schools_merged_v1', data: { done: true } });
    console.log("Initial duplicate school rows cleanup/merge completed.");
  } catch (error) {
    console.error("Error during duplicate school merge:", error);
  }
}

let isConnected = false;

export async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  if (process.env.VERCEL && !process.env.MONGODB_URI) {
    console.error('✗ MONGODB_URI environment variable is not set in Vercel.');
    throw new Error("MONGODB_URI environment variable is missing. Please configure it in Vercel dashboard.");
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vsp';
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s so serverless doesn't hang
    });
    isConnected = true;
    console.log('✓ MongoDB connected:', mongoose.connection.db?.databaseName);
    
    // Both seedInitialData and mergeDuplicateSchools are completely disabled per user requirement.
    // Database data will remain 100% untouched and preserved on server startup.

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected. Attempting to reconnect...');
      isConnected = false;
    });
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
}
