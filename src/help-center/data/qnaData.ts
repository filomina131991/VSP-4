import { QnAItem } from '../types';

export const QNA_DATABASE: QnAItem[] = [
  {
    id: 'qna-add-student',
    question: 'How to add students?',
    answer: 'Follow these steps to add a new student.',
    keywords: ['add student', 'new student', 'create student', 'student add', 'student create'],
    intent: 'add_student',
    category: 'STUDENT_MANAGEMENT',
    steps: [
      'Go to Dashboard page',
      'Click "Student Management" from the main menu',
      'Select the Class (e.g., Class 10)',
      'Select the Division (e.g., A, B, C)',
      'Click "Add Student" button at the top right corner',
      'Fill in Student Name, Admission Number, Gender',
      'Select Medium (Malayalam / English / Tamil)',
      'Set First Language Paper 1 and Paper 2',
      'Click "Save" button to confirm'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-delete-student',
    question: 'How to delete student?',
    answer: 'Follow these steps to delete an existing student.',
    keywords: ['delete student', 'remove student', 'student delete', 'student remove'],
    intent: 'delete_student',
    category: 'STUDENT_MANAGEMENT',
    steps: [
      'Go to Dashboard page',
      'Click "Student Management" from the main menu',
      'Select the Class (e.g., Class 10)',
      'Select the Division (e.g., A)',
      'Find the student from the list',
      'Click the "Delete" icon (trash/bin button) next to the student name',
      'Confirm the deletion when the popup appears',
      'Student will be permanently removed'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-edit-student',
    question: 'How to edit student details?',
    answer: 'Follow these steps to edit student information.',
    keywords: ['edit student', 'update student', 'modify student', 'change student', 'student edit'],
    intent: 'edit_student',
    category: 'STUDENT_MANAGEMENT',
    steps: [
      'Go to Dashboard page',
      'Click "Student Management" from the main menu',
      'Select the Class (e.g., Class 10)',
      'Select the Division (e.g., A)',
      'Find the student and click "Edit" (pencil icon)',
      'Update the required fields (Name, Medium, Language, etc.)',
      'Click "Apply & Save" button',
      'Changes will be updated immediately'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-add-teacher',
    question: 'How to add teacher?',
    answer: 'Follow these steps to add a new teacher.',
    keywords: ['add teacher', 'new teacher', 'create teacher', 'teacher add', 'teacher create'],
    intent: 'add_teacher',
    category: 'TEACHER_PROFILE',
    steps: [
      'Log in with School (HM) account credentials',
      'Go to Dashboard page',
      'Click "Teacher Management" from the side menu',
      'Click "Add Teacher" button at the top',
      'Fill Teacher Name, PEN Number, Designation (e.g., HST Malayalam)',
      'Enter Mobile Number and Email',
      'Select teaching subjects and assigned divisions',
      'Click "Save" to create the teacher account'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-medium-issue',
    question: 'Medium Validation Error / Medium Issue',
    answer: 'Follow these steps to resolve medium-related issues.',
    keywords: ['medium issue', 'medium error', 'medium not showing', 'medium missing', 'medium validation', 'medium problem'],
    intent: 'medium_issue',
    category: 'MEDIUM_SELECTION',
    steps: [
      'Step 1: Go to "School Profile" page from dashboard menu',
      'Step 2: Click "Medium Configuration" tab',
      'Step 3: Check the boxes for Malayalam, English, Tamil mediums as Active',
      'Step 4: Click "Update Profile" button to save',
      'Step 5: Go to "Student Management" page',
      'Step 6: Select the Class (e.g., Class 10)',
      'Step 7: Select the Division',
      'Step 8: Click "Bulk Update Medium" option',
      'Step 9: Choose the correct Medium (e.g., Malayalam Medium)',
      'Step 10: Click "Update All" button',
      'Result: Medium issue resolved'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-language-validation',
    question: 'Language Validation Error / Language Mismatch',
    answer: 'Follow these steps to fix language validation errors.',
    keywords: ['language validation', 'language error', 'language mismatch', 'paper mismatch', 'first language error', 'AT BT error', 'language issue'],
    intent: 'language_validation',
    category: 'LANGUAGE_VALIDATION',
    steps: [
      'Step 1: Go to "Student Management" page from dashboard menu',
      'Step 2: Select Class 10 and target Division',
      'Step 3: Click "Edit Student" for the student with error',
      'Step 4: Verify First Language Paper 1 (e.g., Malayalam AT / Tamil AT)',
      'Step 5: Verify First Language Paper 2 matches Paper 1 stream (e.g., Malayalam BT)',
      'Step 6: Click "Apply & Save" button',
      'Step 7: Go to Dashboard page',
      'Step 8: Click "Re-calculate Validation" button',
      'Result: Language validation error cleared'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-subject-missing',
    question: 'Teacher Subject Missing / Subject Not Assigned',
    answer: 'Follow these steps to assign subjects to teachers.',
    keywords: ['subject missing', 'subject not assigned', 'teacher subject', 'assign subject', 'no subject', 'subject error'],
    intent: 'subject_missing',
    category: 'SUBJECT_ASSIGNMENT',
    steps: [
      'Log in with School (HM) account credentials',
      'Go to "Teacher Management" page',
      'Find the teacher by PEN Number or Name',
      'Click "Assign Subjects" button for that teacher',
      'Check the box for each subject (e.g., P05 Social Science, P06 Physics)',
      'Select the assigned divisions for each subject',
      'Click "Save Assignment" button',
      'Ask the teacher to log out and log back in'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-marks-entry',
    question: 'Marks Entry Not Working / Empty Grid',
    answer: 'Follow these steps to fix marks entry issues.',
    keywords: ['marks entry', 'empty grid', 'marks not saving', 'grades not saving', 'marks error', 'marks entry problem'],
    intent: 'marks_entry',
    category: 'MARKS_ENTRY',
    steps: [
      'Verify the active Exam is selected from the top header dropdown',
      'Check internet connection at the top of the app',
      'Fill marks or grades for all active students',
      'Type "Ab" for absent students (do not leave blank)',
      'Click "Draft Save" first to store temporary data',
      'Then click "Submit Final Subject Marks"',
      'Wait for green confirmation message'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-exam-config',
    question: 'Exam Configuration Missing / No Active Exam',
    answer: 'Follow these steps to configure exam settings.',
    keywords: ['exam config', 'exam configuration', 'exam missing', 'no exam', 'active exam', 'exam error'],
    intent: 'exam_config',
    category: 'EXAM_CONFIG',
    steps: [
      'Log in as School Administrator or DEO',
      'Go to "Exam Management" page',
      'Select current exam (e.g., SSLC Model Exam 2026)',
      'Click "Enable for School" button',
      'Set Maximum CE and TE marks for all 10 subjects',
      'Click "Save Exam Config" button'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-teacher-profile',
    question: 'Teacher Profile Incomplete / PEN Number Missing',
    answer: 'Follow these steps to complete teacher profile.',
    keywords: ['teacher profile', 'profile incomplete', 'pen number', 'complete profile', 'teacher profile error'],
    intent: 'teacher_profile',
    category: 'TEACHER_PROFILE',
    steps: [
      'Click on profile icon at top right corner',
      'Select "Teacher Profile" option',
      'Fill PEN Number (must be 6-8 digits)',
      'Select Designation (e.g., HST Malayalam / HSA Physical Science)',
      'Enter Mobile Number',
      'Select teaching mediums (Malayalam Medium, English Medium)',
      'Click "Update Profile" button'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-final-confirmation',
    question: 'Final Confirmation Button Disabled / Hidden',
    answer: 'Follow these steps to enable final confirmation.',
    keywords: ['final confirmation', 'final submit', 'confirmation disabled', 'submit disabled', 'final confirmation error'],
    intent: 'final_confirmation',
    category: 'FINAL_CONFIRMATION',
    steps: [
      'Go to Dashboard page',
      'Check "Final Submission Readiness Checklist"',
      'Ensure all 4 items are green checkmarks:',
      '  1. All Students Medium Mapped',
      '  2. All Subject Marks Confirmed by Teachers',
      '  3. Language Validation Clean - No Errors',
      '  4. HM Verification Check Complete',
      'Once all criteria are green, the blue "Submit Final School Confirmation" button will become active',
      'Click it to submit'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-dashboard-count',
    question: 'Dashboard Count Wrong / Student Count Mismatch',
    answer: 'Follow these steps to fix dashboard count.',
    keywords: ['dashboard count', 'wrong count', 'student count mismatch', 'count error', 'dashboard error'],
    intent: 'dashboard_count',
    category: 'DASHBOARD_COUNT',
    steps: [
      'Open Dashboard page',
      'Click "Refresh Analytics & Re-index" button at top right',
      'Wait 5 seconds for background calculation',
      'Clear browser cache if count still wrong',
      'Click "Force Re-sync" if using offline mode'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-ict-option',
    question: 'ICT Option Missing / IT Exam Marks Not Showing',
    answer: 'Follow these steps to enable ICT option.',
    keywords: ['ict', 'it exam', 'ict option', 'ict missing', 'information technology', 'computer marks'],
    intent: 'ict_option',
    category: 'ICT_OPTION',
    steps: [
      'Go to "School Profile" page',
      'Click "Exam Configurations" tab',
      'Toggle ON "Include ICT (Information Technology)" option',
      'Go to "Student Management" page',
      'Check Exemptions tab - ensure no regular student has ICT exempted',
      'Refresh Marks Entry page to see ICT column'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-login-issue',
    question: 'Login Issues / Cannot Login to Portal',
    answer: 'Follow these steps to resolve login issues.',
    keywords: ['login issue', 'cannot login', 'login error', 'login problem', 'forgot password', 'password reset', 'account locked'],
    intent: 'login_issue',
    category: 'SYSTEM_NETWORK',
    steps: [
      'Check your internet connection',
      'Clear browser cache and cookies',
      'Try using Chrome or Firefox browser',
      'Click "Forgot Password" link on login page',
      'Enter your registered email or username',
      'Check email for password reset link',
      'Click the reset link and create a new password',
      'Try logging in with the new password'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-sync-error',
    question: 'Sync Error / Data Not Syncing',
    answer: 'Follow these steps to fix sync issues.',
    keywords: ['sync error', 'sync issue', 'data not syncing', 'sync problem', 'offline sync'],
    intent: 'sync_error',
    category: 'SYSTEM_NETWORK',
    steps: [
      'Check internet connection status',
      'Go to Settings page',
      'Click "Force Sync" button',
      'Wait for sync completion indicator',
      'If sync fails, check IndexedDB storage quota',
      'Clear browser cache and try again',
      'Contact DEO Support if problem persists'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-student-count-mismatch',
    question: 'Student Count Mismatch (Sampoorna vs Vijayasree)',
    answer: 'Follow these steps to reconcile student counts.',
    keywords: ['sampoorna', 'student count mismatch', 'student count', 'roll count', 'enrolled vs appeared'],
    intent: 'student_count_mismatch',
    category: 'STUDENT_MANAGEMENT',
    steps: [
      'Go to "Student Management" page',
      'Click "CSV Import & Sync" tab',
      'Download the latest student export from Sampoorna portal',
      'Upload the CSV file',
      'Select "Update Existing & Add New" option',
      'Click "Run Reconciliation Check" button',
      'System will auto-merge records by Admission Number'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-paper1-missing',
    question: 'Paper I Missing (Malayalam/Tamil/Kannada AT)',
    answer: 'Follow these steps to fix Paper 1 missing error.',
    keywords: ['paper 1 missing', 'paper i missing', 'p01 missing', 'at paper', 'first language paper 1'],
    intent: 'paper1_missing',
    category: 'PAPER_MISMATCH',
    steps: [
      'Go to "Student Management" page',
      'Select the Division',
      'Find the student with error',
      'Click "Edit Student"',
      'Select First Language Paper 1 (e.g., Malayalam-AT / Malayalam-BT)',
      'Click "Save" button',
      'Refresh Marks Entry page'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-paper2-missing',
    question: 'Paper II Missing (Language Paper 2 Unassigned)',
    answer: 'Follow these steps to fix Paper 2 missing error.',
    keywords: ['paper 2 missing', 'paper ii missing', 'p02 missing', 'bt paper', 'first language paper 2'],
    intent: 'paper2_missing',
    category: 'PAPER_MISMATCH',
    steps: [
      'Go to "Student Management" page',
      'Click "Bulk Edit Languages" option',
      'Filter by Malayalam Medium candidates',
      'Set First Language Paper 2 = "Malayalam BT" for all candidates',
      'Click "Save All" button'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-language-distribution',
    question: 'Language Distribution Mismatch in Analytics',
    answer: 'Follow these steps to fix language distribution.',
    keywords: ['language distribution', 'analytics error', 'language analytics', 'distribution mismatch', 'pie chart error'],
    intent: 'language_distribution',
    category: 'LANGUAGE_VALIDATION',
    steps: [
      'Go to "Reports" page',
      'Click "Language Distribution Audit Report"',
      'Click "Highlight Overlapping Records" button',
      'Review students with multiple language assignments',
      'Go to "Student Management" page',
      'Correct the student language assignments'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-teacher-pending-confirmation',
    question: 'Pending Subject Confirmation from Teachers',
    answer: 'Follow these steps to resolve pending teacher confirmations.',
    keywords: ['pending confirmation', 'teacher lock', 'subject pending', 'teacher confirm', 'lock marks'],
    intent: 'teacher_pending_confirmation',
    category: 'FINAL_CONFIRMATION',
    steps: [
      'School Admin opens Dashboard page',
      'Click "Subject Status Tracker"',
      'Identify subjects with yellow "Pending Teacher Lock" status',
      'Contact the assigned subject teacher',
      'Ask teacher to log in and click "Confirm & Lock Marks" in Marks Entry',
      'Alternatively, HM can click "HM Override & Lock Subject" if authorized by DEO'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-password-reset',
    question: 'How to Reset Password?',
    answer: 'Follow these steps to reset your password.',
    keywords: ['reset password', 'password reset', 'change password', 'forgot password', 'new password'],
    intent: 'password_reset',
    category: 'SYSTEM_NETWORK',
    steps: [
      'Go to Login page',
      'Click "Forgot Password?" link below login button',
      'Enter your registered Email or Username',
      'Click "Send Reset Link" button',
      'Open your email inbox',
      'Click the password reset link from the email',
      'Enter your new password',
      'Confirm the new password',
      'Click "Reset Password" button',
      'Go back to Login page and sign in with new password'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-upload-result',
    question: 'How to Upload Results?',
    answer: 'Follow these steps to upload student results.',
    keywords: ['upload result', 'result upload', 'import result', 'result import', 'upload marks'],
    intent: 'upload_result',
    category: 'MARKS_ENTRY',
    steps: [
      'Go to Dashboard page',
      'Click "Marks Entry" from the main menu',
      'Select the Exam from dropdown',
      'Select Class and Division',
      'Enter marks for each student and subject',
      'Click "Draft Save" to save temporarily',
      'Click "Submit Final Subject Marks" after verification',
      'Wait for confirmation message'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  },
  {
    id: 'qna-generate-report',
    question: 'How to Generate Report / PDF?',
    answer: 'Follow these steps to generate reports.',
    keywords: ['generate report', 'pdf report', 'print report', 'report download', 'export report', 'consolidated report'],
    intent: 'generate_report',
    category: 'REPORTS_ANALYTICS',
    steps: [
      'Go to "Reports" page from dashboard menu',
      'Select Report Type (School Report / Subject Report / Consolidated)',
      'Filter by Class, Division, or Subject',
      'Click "Generate Report" button',
      'Preview the report on screen',
      'Click "Download PDF" button to save',
      'Or click "Print" button for hard copy'
    ],
    screenshots: [],
    lastUpdated: '2026-07-30'
  }
];
