export type RoleCategory = 'ALL' | 'TEACHER' | 'SCHOOL' | 'DISTRICT' | 'DIET' | 'SUPPORT';

export type ErrorCategory = 
  | 'LANGUAGE_VALIDATION'
  | 'MEDIUM_SELECTION'
  | 'SUBJECT_ASSIGNMENT'
  | 'MARKS_ENTRY'
  | 'TEACHER_PROFILE'
  | 'DASHBOARD_COUNT'
  | 'EXAM_CONFIG'
  | 'ICT_OPTION'
  | 'FINAL_CONFIRMATION'
  | 'STUDENT_MANAGEMENT'
  | 'REPORTS_ANALYTICS'
  | 'PAPER_MISMATCH'
  | 'SYSTEM_NETWORK';

export interface ErrorRecord {
  id: string;
  title: string;
  category: ErrorCategory;
  roles: RoleCategory[];
  keywords: string[];
  symptoms: string[];
  causes: string[];
  solution: string[];
  malayalamSolution?: string[];
  screenshot?: string;
  relatedErrorIds?: string[];
  faqIds?: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt?: string;
}

export interface InteractiveStep {
  stepNumber: number;
  id: string;
  englishTitle: string;
  malayalamTitle: string;
  englishDescription: string;
  malayalamDescription: string;
  screenshot: string;
  warning?: string;
  malayalamWarning?: string;
  tip?: string;
  malayalamTip?: string;
  role: RoleCategory;
  targetModule: string;
}

export interface FaqItem {
  id: string;
  question: string;
  malayalamQuestion?: string;
  answer: string;
  malayalamAnswer?: string;
  category: ErrorCategory;
  keywords: string[];
  relatedErrorId?: string;
}

export interface KbArticle {
  id: string;
  title: string;
  category: ErrorCategory;
  summary: string;
  content: string;
  tags: string[];
  author?: string;
  updatedAt: string;
  image?: string;
  relatedArticleIds?: string[];
  rating?: {
    up: number;
    down: number;
  };
}

export interface WorkflowNode {
  id: string;
  title: string;
  malayalamTitle: string;
  role: RoleCategory;
  description: string;
  prerequisites: string[];
  nextSteps: string[];
  icon: string;
  commonErrorIds: string[];
}

export interface SupportTicket {
  id: string;
  schoolName: string;
  district: string;
  mobileNumber: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  screenshotUrl?: string;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface AppSetting {
  theme: 'light' | 'dark' | 'system';
  languagePreference: 'en' | 'ml' | 'both';
  autoOfflineSync: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
