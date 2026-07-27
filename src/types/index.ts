export type UserRole = 'WEBMASTER' | 'DEO' | 'DIET' | 'SCHOOL' | 'SUBJECT_EXPERT' | 'RESOURCE_PERSON' | 'TEACHER';
export type SchoolType = 'ALL' | 'Government' | 'Aided' | 'Unaided';
export type Gender = 'ALL' | 'Boys' | 'Girls';
export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'E' | 'Ab';
export type SubjectCategory = 'FIRST_LANGUAGE' | 'SECOND_LANGUAGE' | 'THIRD_LANGUAGE' | 'CORE' | '';
export type WorkflowStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'TEACHER_CONFIRMED' | 'COMPLETED';

export interface Medium {
  _id?: string;
  id: string;
  name: string;
  code: string;
  shortName: string;
  active: boolean;
  displayOrder: number;
}

export interface Subject {
  _id?: string;
  id?: string;
  name: string;
  shortName: string;
  code: string;
  subjectCode?: string;
  medium: string;
  mediumId: string;
  mediumName: string;
  category: SubjectCategory;
  paperType: string;
  languageType: string;
  maxMarks?: number;
  displayOrder: number;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  districtId?: string;
  eduDistrictId?: string;
  subDistrictId?: string;
  schoolId?: string;
  brcId?: string;
  panchayatId?: string;
  schoolCode?: string;
  passwordChanged: boolean;
  profileCompleted?: boolean;
  
  // Custom profile and role-based fields
  mediums?: string[];
  teachingSubjects?: string[];
  eduId?: string;
  mainDistrictId?: string;
  name?: string;
  email?: string;
  phone?: string;
  schoolType?: string;
  hmName?: string;
  hmMobile?: string;
  udiseCode?: string;
  coordinatorName?: string;
  coordinatorMobile?: string;
  coordinatorEmail?: string;
  schoolEmail?: string;
  schoolTelephone?: string;
}

export interface DistrictResult {
  slNo: number;
  districtId: string;
  districtName: string;
  studentsAppeared: number;
  pass: number;
  fullAPlus: number;
  victoryPercentage: number;
}

export interface StudentResult {
  slNo: number;
  regNo: string;
  studentName: string;
  grades: Record<string, Grade>;
}

export interface SubjectGradeStats {
  slNo: number;
  subject: string;
  aPlus: number;
  a: number;
  bPlus: number;
  b: number;
  cPlus: number;
  c: number;
  dPlus: number;
  d: number;
  absents: number;
}

export interface Student {
  _id?: string;
  id?: string;
  admissionNumber?: string;
  name: string;
  gender?: string;
  className?: string;
  division?: string;
  schoolId?: string;
  medium?: string;
  mediumId?: string;
  firstLangPaper1?: string;
  firstLangPaper1SubjectId?: string;
  firstLangPaper2?: string;
  firstLangPaper2SubjectId?: string;
  secondLang?: string;
  secondLanguageSubjectId?: string;
  thirdLang?: string;
  thirdLanguageSubjectId?: string;
  subjects?: string[];
  exemptions?: string[];
  active?: boolean;
}

