import { WorkflowNode } from '../types';

export const WORKFLOW_NODES_DATA: WorkflowNode[] = [
  {
    id: "wf-1-login",
    title: "School Login",
    malayalamTitle: "സ്കൂൾ ലോഗിൻ",
    role: "SCHOOL",
    description: "Access Vijayasree portal using School Code & Password.",
    prerequisites: ["Valid School Code", "Internet / Local PWA Cache"],
    nextSteps: ["wf-2-profile"],
    icon: "LogIn",
    commonErrorIds: ["auth-school-pwd-forget", "auth-teacher-pwd-forget"]
  },
  {
    id: "wf-2-profile",
    title: "Profile Configuration",
    malayalamTitle: "പ്രൊഫൈൽ ക്രമീകരിക്കൽ",
    role: "SCHOOL",
    description: "Verify School and active Mediums, HM Name, HM Mobile, Vijayasree Coordinator Mobile and Email.",
    prerequisites: ["wf-1-login"],
    nextSteps: ["wf-3-students"],
    icon: "Building",
    commonErrorIds: ["medium-missing", "teacher-class-subject-config"]
  },
  {
    id: "wf-3-students",
    title: "Student Management",
    malayalamTitle: "വിദ്യാർത്ഥി വിവരങ്ങൾ",
    role: "SCHOOL",
    description: "Import candidates, assign Medium, Paper 1, Paper 2, and CWSN exemptions.",
    prerequisites: ["wf-2-profile"],
    nextSteps: ["wf-4-dashboard"],
    icon: "Users",
    commonErrorIds: ["language-validation", "paper-1-missing", "paper-2-missing", "student-count-mismatch"]
  },
  {
    id: "wf-4-dashboard",
    title: "Dashboard Overview",
    malayalamTitle: "ഡാഷ്‌ബോർഡ് അവലോകനം",
    role: "SCHOOL",
    description: "Monitor school candidate enrollment, medium breakdown, and validation checklist.",
    prerequisites: ["wf-3-students"],
    nextSteps: ["wf-5-examconfig"],
    icon: "LayoutDashboard",
    commonErrorIds: ["dashboard-count-wrong"]
  },
  {
    id: "wf-5-examconfig",
    title: "Exam Configuration",
    malayalamTitle: "പരീക്ഷാ ഘടന",
    role: "SCHOOL",
    description: "Enable active exam term, set CE/TE max marks, enable ICT option.",
    prerequisites: ["wf-4-dashboard"],
    nextSteps: ["wf-6-marksentry"],
    icon: "Settings",
    commonErrorIds: ["exam-config-missing", "ict-option-missing"]
  },
  {
    id: "wf-6-marksentry",
    title: "Teacher Marks Entry",
    malayalamTitle: "അധ്യാപക മാർക്ക് എൻട്രി",
    role: "TEACHER",
    description: "Teachers log in, select subject/division, and enter student grades/absents.",
    prerequisites: ["wf-5-examconfig"],
    nextSteps: ["wf-7-teacherconfirm"],
    icon: "FileEdit",
    commonErrorIds: ["subject-missing", "marks-entry-empty", "teacher-profile-incomplete"]
  },
  {
    id: "wf-7-teacherconfirm",
    title: "Teacher Confirmation",
    malayalamTitle: "അധ്യാപക സ്ഥിരീകരണം",
    role: "TEACHER",
    description: "Subject teacher inspects summary and locks subject marks.",
    prerequisites: ["wf-6-marksentry"],
    nextSteps: ["wf-8-schoolverify"],
    icon: "Lock",
    commonErrorIds: ["pending-subject-confirmation"]
  },
  {
    id: "wf-8-schoolverify",
    title: "School Verification",
    malayalamTitle: "സ്കൂൾ തല പരിശോധന",
    role: "SCHOOL",
    description: "HM verifies all 10 subjects locked and executes automated validation engine.",
    prerequisites: ["wf-7-teacherconfirm"],
    nextSteps: ["wf-9-finalsubmit"],
    icon: "CheckSquare",
    commonErrorIds: ["language-validation", "pending-subject-confirmation"]
  },
  {
    id: "wf-9-finalsubmit",
    title: "Final Confirmation",
    malayalamTitle: "ഫൈനൽ സബ്മിഷൻ",
    role: "SCHOOL",
    description: "HM submits final school confirmation to DEO Palakkad.",
    prerequisites: ["wf-8-schoolverify"],
    nextSteps: ["wf-10-reports"],
    icon: "Award",
    commonErrorIds: ["final-confirmation-hidden"]
  },
  {
    id: "wf-10-reports",
    title: "Reports & Certificates",
    malayalamTitle: "റിപ്പോർട്ടുകൾ",
    role: "SCHOOL",
    description: "Download PDF/Excel summary reports, grade analytics, and A+ lists.",
    prerequisites: ["wf-9-finalsubmit"],
    nextSteps: [],
    icon: "FileText",
    commonErrorIds: []
  }
];
