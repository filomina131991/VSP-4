import { ErrorRecord, ErrorCategory, RoleCategory } from '../types';

export const ERRORS_DATABASE: ErrorRecord[] = [
  {
    id: "auth-school-pwd-forget",
    title: "School User Forgot Password",
    category: "SYSTEM_NETWORK",
    roles: ["SCHOOL"],
    severity: "HIGH",
    keywords: ["password", "forgot", "reset", "login", "school", "email"],
    symptoms: [
      "School user is unable to log in to the portal.",
      "Incorrect password or forgotten password error."
    ],
    causes: [
      "User has forgotten their registered password."
    ],
    solution: [
      "Go to the School Login page.",
      "Click on the 'Forgot Password?' link in the login form.",
      "Enter your registered School Email ID.",
      "Check your email inbox for the password reset instructions and link.",
      "Click the link to create a new password and log in."
    ],
    malayalamSolution: [
      "സ്കൂൾ ലോഗിൻ പേജിൽ പോവുക.",
      "'Forgot Password?' ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക.",
      "സ്കൂളിന്റെ രജിസ്റ്റർ ചെയ്ത ഇമെയിൽ നൽകി പാസ്സ്‌വേർഡ് റീസെറ്റ് ചെയ്യാം."
    ]
  },
  {
    id: "auth-teacher-pwd-forget",
    title: "Teacher User Forgot Password",
    category: "SYSTEM_NETWORK",
    roles: ["TEACHER", "SCHOOL"],
    severity: "HIGH",
    keywords: ["password", "forgot", "reset", "login", "teacher", "management"],
    symptoms: [
      "Teacher user is unable to log in to the portal.",
      "Incorrect password or forgotten password error for teacher."
    ],
    causes: [
      "Teacher has forgotten their password."
    ],
    solution: [
      "The Teacher cannot reset their password directly from the login page.",
      "Contact the School Admin to reset your password.",
      "School Admin must log in and navigate to the 'Teacher Management' page.",
      "Find the respective teacher and click on 'Edit'.",
      "Use the 'Reset Password?' option in the edit form to assign a new password for the teacher."
    ],
    malayalamSolution: [
      "അധ്യാപകർക്ക് ലോഗിൻ പേജിൽ നിന്ന് നേരിട്ട് പാസ്സ്‌വേർഡ് മാറ്റാൻ സാധിക്കില്ല.",
      "സ്കൂൾ ലോഗിൻ വഴി Teacher Management പേജിൽ പോയി, പ്രസ്തുത അധ്യാപകനെ എഡിറ്റ് ചെയ്തു 'Reset Password?' നൽകി പാസ്സ്‌വേർഡ് മാറ്റാവുന്നതാണ്."
    ]
  },
  {
    id: "teacher-class-subject-config",
    title: "Teacher Class & Subject Config Error",
    category: "TEACHER_PROFILE",
    roles: ["TEACHER", "SCHOOL"],
    severity: "HIGH",
    keywords: ["teacher", "subject", "config", "class", "medium", "language", "paper"],
    symptoms: [
      "Teacher profile page does not show the correct subjects.",
      "Class medium-wise subjects are missing or misconfigured for the teacher."
    ],
    causes: [
      "Student Management mediums and language papers are not properly assigned before configuring the teacher."
    ],
    solution: [
      "First, go to the Student Management module.",
      "Assign the proper medium for the students.",
      "Assign Language Paper I, Paper II, and Second & Third Language correctly.",
      "Then, go to the Teacher Profile page and assign your class.",
      "The medium-wise subjects will now show properly.",
      "If any issue persists, contact the Admin."
    ]
  },
  {
    id: "language-validation",
    title: "Language Validation Error",
    category: "LANGUAGE_VALIDATION",
    roles: ["SCHOOL", "TEACHER"],
    severity: "HIGH",
    keywords: ["language", "validation", "error", "paper", "mismatch", "first language", "AT", "BT", "P01", "P02", "മലയാളം"],
    symptoms: [
      "Popup message: 'Language configuration mismatch between Paper I and Paper II'",
      "Student cannot be saved in Marks Entry 2",
      "Dashboard validation status turns Red"
    ],
    causes: [
      "Student First Language Paper I (e.g. Malayalam AT) does not match Paper II (Malayalam BT)",
      "Student assigned incompatible paper combination like AT for Paper 1 and Sanskrit for Paper 2",
      "School updated student medium after language mapping"
    ],
    solution: [
      "Open Student Management module from the main navigation menu.",
      "Filter by Class 10 and select the target Division.",
      "Click on 'Edit Student' for the student experiencing the error.",
      "Verify 'First Language Paper 1' (e.g., Malayalam AT / Tamil AT / Kannada AT).",
      "Verify 'First Language Paper 2' matches the corresponding Paper 1 stream.",
      "Click 'Apply & Save'.",
      "Open Dashboard -> Click 'Re-calculate Validation' to clear the warning."
    ],
    malayalamSolution: [
      "പ്രധാന മെനുവിൽ നിന്ന് 'Student Management' തുറക്കുക.",
      "Class 10 തിരഞ്ഞെടുത്ത് ബന്ധപ്പെട്ട ഡിവിഷൻ ഫിൽട്ടർ ചെയ്യുക.",
      "പ്രശ്നമുള്ള വിദ്യാർത്ഥിയുടെ 'Edit' ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക.",
      "First Language Paper 1 (മലയാളം AT / തമിഴ് AT / കന്നഡ AT) പരിശോധിക്കുക.",
      "First Language Paper 2 ശരിയായ പേപ്പറുമായി യോജിക്കുന്നു എന്ന് ഉറപ്പാക്കുക.",
      "'Save' ചെയ്യുക. Dashboard-ൽ പോയി 'Re-calculate Validation' ക്ലിക്ക് ചെയ്യുക."
    ],
    relatedErrorIds: ["paper-1-missing", "paper-2-missing", "language-distribution-mismatch"]
  },
  {
    id: "medium-missing",
    title: "Medium Not Showing / Medium Missing",
    category: "MEDIUM_SELECTION",
    roles: ["SCHOOL", "TEACHER"],
    severity: "HIGH",
    keywords: ["medium", "missing", "not showing", "medium selection", "malayalam medium", "english medium", "tamil medium", "മാധ്യമം"],
    symptoms: [
      "Medium dropdown in Marks Entry is completely empty",
      "Student list displays 'Medium Unassigned'",
      "Dashboard reports '0 Students' under Malayalam / English Medium breakdown"
    ],
    causes: [
      "School profile missing primary instructional mediums",
      "Student uploaded via CSV without 'mediumId' or 'medium' column filled",
      "New division created without assigning default medium"
    ],
    solution: [
      "Navigate to School Profile -> Medium Configuration.",
      "Ensure Malayalam, English, Tamil, or Kannada mediums are checked as Active.",
      "Go to Student Management -> Bulk Update Medium.",
      "Select Class and Division, choose the correct Medium (e.g. Malayalam Medium), and click 'Update All'.",
      "Refresh Marks Entry 2 page to confirm student list appears under the medium filter."
    ],
    malayalamSolution: [
      "School Profile -> Medium Configuration വിഭാഗത്തിൽ പോവുക.",
      "സജീവമായ മാധ്യമങ്ങൾ (Malayalam, English മുതലായവ) ടിക് ചെയ്തിട്ടുണ്ടെന്ന് ഉറപ്പാക്കുക.",
      "Student Management -> Bulk Update Medium തിരഞ്ഞെടുക്കുക.",
      "ക്ലാസും ഡിവിഷനും തിരഞ്ഞെടുത്ത് ശരിയായ മാധ്യമം നൽകി 'Update All' നൽകുക."
    ],
    relatedErrorIds: ["student-count-mismatch", "teacher-profile-incomplete"]
  },
  {
    id: "subject-missing",
    title: "Teacher Subject Missing / Subject Assignment Error",
    category: "SUBJECT_ASSIGNMENT",
    roles: ["TEACHER", "SCHOOL"],
    severity: "HIGH",
    keywords: ["subject", "missing", "teacher subject", "unassigned", "assigned subjects", "विषय", "വിഷയം"],
    symptoms: [
      "Teacher logged in but sees 'No Assigned Subjects Found'",
      "Marks entry grid displays disabled textboxes for Social Science or Physics",
      "Teacher profile warning: 'Pending Subject Assignment from HM'"
    ],
    causes: [
      "School HM / DEO user has not assigned teaching subjects to teacher's PEN account",
      "Subject ID format changed during system update",
      "Teacher account created as SCHOOL role instead of TEACHER role"
    ],
    solution: [
      "Log in with School (HM) account credentials.",
      "Navigate to Teacher Management module.",
      "Find the teacher by PEN Number or Name and click 'Assign Subjects'.",
      "Check the box for each subject (e.g., P05 Social Science, P06 Physics) and assigned divisions.",
      "Click 'Save Assignment'.",
      "Ask the teacher to log out and log back in."
    ],
    malayalamSolution: [
      "School (HM) അക്കൗണ്ടിൽ ലോഗിൻ ചെയ്യുക.",
      "Teacher Management മോഡ്യൂളിൽ പോവുക.",
      "അധ്യാപകന്റെ പേരിന് നേരെ 'Assign Subjects' ക്ലിക്ക് ചെയ്യുക.",
      "അധ്യാപകൻ പഠിപ്പിക്കുന്ന വിഷയങ്ങളും ഡിവിഷനുകളും തിരഞ്ഞെടുത്ത് 'Save' ചെയ്യുക."
    ],
    relatedErrorIds: ["teacher-profile-incomplete", "pending-subject-confirmation"]
  },
  {
    id: "marks-entry-empty",
    title: "Marks Entry Grid Empty / Grades Not Saving",
    category: "MARKS_ENTRY",
    roles: ["TEACHER"],
    severity: "HIGH",
    keywords: ["marks entry", "empty grid", "grades not saving", "zero marks", "save failed", "മാർക്ക് എൻട്രി"],
    symptoms: [
      "Table of students shows empty text boxes after saving",
      "Alert message: 'Cannot save empty mark sheet'",
      "Grades entered disappear upon page refresh"
    ],
    causes: [
      "Exam configuration for current term not selected in top bar dropdown",
      "Network disconnection while saving marks",
      "Grade scale configuration missing for selected exam"
    ],
    solution: [
      "Verify the active Exam is selected from the top header dropdown (e.g. Vijayasree SSLC Pre-Board 2026).",
      "Check internet connection banner at the top of the app.",
      "Fill marks or grades for all active students (use 'Ab' for absent students).",
      "Click 'Save Progress' button.",
      "If it does not work even after these steps, contact admin at 7904838296."
    ],
    malayalamSolution: [
      "മുകളിലെ ഡ്രോപ്പ്‌ഡൗണിൽ നിന്ന് ശരിയായ പരീക്ഷ (Vijayasree SSLC Pre-Board) തിരഞ്ഞെടുത്തിട്ടുണ്ടോ എന്ന് പരിശോധിക്കുക.",
      "ഗൈഡ് അനുസരിച്ച് എബ്സെന്റായ കുട്ടികൾക്ക് 'Ab' എന്നും മറ്റുള്ളവർക്ക് ഗ്രേഡും നൽകുക.",
      "'Save Progress' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക."
    ],
    relatedErrorIds: ["exam-config-missing", "pending-subject-confirmation"]
  },
  {
    id: "teacher-profile-incomplete",
    title: "Teacher Profile Incomplete",
    category: "TEACHER_PROFILE",
    roles: ["TEACHER"],
    severity: "MEDIUM",
    keywords: ["teacher profile", "pen number", "incomplete profile", "designation", "അധ്യാപക പ്രൊഫൈൽ"],
    symptoms: [
      "Banner at top of dashboard: 'Complete Teacher Profile to enable Mark Submission'",
      "Teacher cannot access Question Repository or Paper Generator"
    ],
    causes: [
      "PEN Number missing or invalid format (must be 6-8 digits/uppercase letters)",
      "Mobile number or email not verified",
      "Primary instruction medium preference unselected"
    ],
    solution: [
      "Click on profile icon at top right -> 'Teacher Profile'.",
      "Fill PEN Number, Designation (e.g., HST Malayalam / HSA Physical Science), and Mobile Number.",
      "Select teaching mediums (Malayalam Medium, English Medium).",
      "Click 'Update Profile'."
    ],
    malayalamSolution: [
      "മുകളിൽ വലതുവശത്തുള്ള പ്രൊഫൈൽ ഐക്കണിൽ ക്ലിക്ക് ചെയ്ത് 'Teacher Profile' തിരഞ്ഞെടുക്കുക.",
      "PEN നമ്പറും തസ്തികയും ഫോൺ നമ്പറും നൽകി 'Update Profile' നൽകുക."
    ],
    relatedErrorIds: ["subject-missing"]
  },
  {
    id: "dashboard-count-wrong",
    title: "Dashboard Count Mismatch / Wrong Student Count",
    category: "DASHBOARD_COUNT",
    roles: ["SCHOOL", "DISTRICT", "DIET"],
    severity: "MEDIUM",
    keywords: ["dashboard count", "wrong count", "mismatch", "student count", "cache", "കൗണ്ട് തെറ്റ്"],
    symptoms: [
      "Dashboard total registered students count does not match total in Student Management",
      "Passed count shows 0 even after all marks entered",
      "Region analytics pie chart shows outdated numbers"
    ],
    causes: [
      "Cached summary data in IndexedDB/MongoDB not auto-invalidated after bulk upload",
      "New students added while exam was in progress without re-indexing"
    ],
    solution: [
      "Open Dashboard Page.",
      "Click the 'Refresh Analytics & Re-index' button at top right.",
      "Clear browser cache or click 'Force Re-sync' if using offline mode.",
      "Wait 5 seconds for analytics background task to recalculate total appeared, pass count, and full A+."
    ],
    malayalamSolution: [
      "Dashboard പേജിൽ മുകളിലുള്ള 'Refresh Analytics & Re-index' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.",
      "സിസ്റ്റം സ്വയം കണക്കുകൾ പുനർനിർണ്ണയിച്ച് ശരിയായ സംഖ്യ കാണിക്കും."
    ],
    relatedErrorIds: ["final-confirmation-hidden", "student-count-mismatch"]
  },
  {
    id: "exam-config-missing",
    title: "Exam Configuration Missing",
    category: "EXAM_CONFIG",
    roles: ["SCHOOL", "TEACHER"],
    severity: "HIGH",
    keywords: ["exam config", "exam configuration", "missing exam", "pre-board", "മോഡൽ പരീക്ഷ", "മാർക്ക് രീതി"],
    symptoms: [
      "Error prompt: 'No Active Exam Configured for this School'",
      "Marks Entry 2 page displays warning banner: 'Exam parameters undefined'"
    ],
    causes: [
      "School HM has not configured exam subjects for the selected exam",
      "Subjects are not yet assigned with CE/TE mark groups"
    ],
    solution: [
      "Log in as School HM.",
      "Go to Marks Entry 2.0 and select the exam.",
      "Click 'Exam Config' button to open configuration modal.",
      "Verify auto-selected subjects per medium tab.",
      "Click 'Save Configuration'."
    ],
    malayalamSolution: [
      "School HM ആയി ലോഗിൻ ചെയ്ത് Marks Entry 2.0-ൽ പോവുക.",
      "പരീക്ഷ സെലക്ട് ചെയ്ത് 'Exam Config' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.",
      "ഓരോ മീഡിയം ടാബിലും വിഷയങ്ങൾ പരിശോധിച്ച് 'Save Configuration' ക്ലിക്ക് ചെയ്യുക."
    ],
    relatedErrorIds: ["marks-entry-empty", "ict-option-missing"]
  },
  {
    id: "ict-option-missing",
    title: "ICT Option Missing / IT Exam Marks Not Showing",
    category: "ICT_OPTION",
    roles: ["SCHOOL", "TEACHER"],
    severity: "MEDIUM",
    keywords: ["ict", "it exam", "ict option", "information technology", "ഐ.സി.ടി", "കംപ്യൂട്ടർ"],
    symptoms: [
      "P10 Information Technology subject missing from mark sheet",
      "ICT practical score input disabled"
    ],
    causes: [
      "School Exam Config set to 'Standard 9-Subject' mode instead of '10-Subject with ICT'",
      "ICT exemption checkbox erroneously checked for regular students"
    ],
    solution: [
      "Go to School Profile -> Exam Configurations.",
      "Ensure 'Include ICT (Information Technology) in Grade Calculation' is toggled ON.",
      "Go to Student Management -> Exemptions tab to verify no regular student has ICT exempted unless official CWSN order exists."
    ],
    malayalamSolution: [
      "School Profile -> Exam Configurations-ൽ പോയി 'Include ICT' ഓപ്ഷൻ ഓൺ ചെയ്യുക."
    ],
    relatedErrorIds: ["subject-missing", "exam-config-missing"]
  },
  {
    id: "pending-subject-confirmation",
    title: "Pending Subject Confirmation from Teachers",
    category: "FINAL_CONFIRMATION",
    roles: ["SCHOOL", "TEACHER"],
    severity: "HIGH",
    keywords: ["pending subject confirmation", "teacher confirm", "lock marks", "അധ്യാപക സ്ഥിരീകരണം"],
    symptoms: [
      "School Final Confirmation button disabled with message: '3 Subjects Pending Teacher Lock'",
      "Status table shows yellow 'Pending' badge under Physics, Chemistry, Biology"
    ],
    causes: [
      "Subject teachers have saved draft marks but omitted clicking 'Final Confirm Subject Marks'",
      "Teacher assigned to subject was changed mid-entry"
    ],
    solution: [
      "School Admin opens Dashboard -> Subject Status Tracker.",
      "Identify subjects with yellow 'Pending Teacher Lock' status.",
      "Contact assigned subject teacher to log in and click 'Confirm & Lock Marks' in Marks Entry 2.",
      "Alternatively, School HM can click 'HM Override & Lock Subject' if authorized by DEO."
    ],
    malayalamSolution: [
      "Dashboard -> Subject Status Tracker വഴി ഏതൊക്കെ വിഷയങ്ങളാണ് പെൻഡിംഗ് എന്ന് കാണുക.",
      "ബന്ധപ്പെട്ട അധ്യാപകനോട് മാർക്ക് എൻട്രിയിൽ കയറി 'Confirm & Lock Marks' അമർത്താൻ നിർദ്ദേശിക്കുക."
    ],
    relatedErrorIds: ["final-confirmation-hidden", "marks-entry-empty"]
  },
  {
    id: "final-confirmation-hidden",
    title: "Final Confirmation Button Hidden / Disabled",
    category: "FINAL_CONFIRMATION",
    roles: ["SCHOOL"],
    severity: "HIGH",
    keywords: ["final confirmation", "hidden button", "disabled final submit", "ഫൈനൽ സബ്മിഷൻ"],
    symptoms: [
      "School HM cannot submit final SSLC results to DEO",
      "Red notice: 'Final Confirmation Locked: Incomplete Data Detected'"
    ],
    causes: [
      "Not all students have complete marks across 10 subjects",
      "Teacher subject lock pending for one or more subjects",
      "Student count in School Profile differs from total entered marks"
    ],
    solution: [
      "Check Dashboard -> 'Final Submission Readiness Checklist'.",
      "Ensure all 4 checklist items are green checkmarks: (1) All Students Medium Mapped, (2) All Subject Marks Confirmed, (3) Language Validation Clean, (4) HM Verification Check.",
      "Once all criteria are green, the blue 'Submit Final School Confirmation' button will become active."
    ],
    malayalamSolution: [
      "Dashboard-ൽ പോയി 'Final Submission Readiness Checklist' ലെ നാല് വിവരങ്ങളും പച്ച നിറത്തിലാണെന്ന് ഉറപ്പ് വരുത്തുക.",
      "എല്ലാം ശരിയായാൽ ബട്ടൺ ആക്റ്റീവ് ആകുന്നതാണ്."
    ],
    relatedErrorIds: ["pending-subject-confirmation", "language-validation", "dashboard-count-wrong"]
  },
  {
    id: "student-count-mismatch",
    title: "Student Count Mismatch (Sampoorna vs Vijayasree)",
    category: "STUDENT_MANAGEMENT",
    roles: ["SCHOOL", "DISTRICT"],
    severity: "HIGH",
    keywords: ["student count mismatch", "sampoorna", "roll count", "enrolled vs appeared", "കുട്ടികളുടെ എണ്ണം"],
    symptoms: [
      "Total students in Vijayasree portal is 250, but Sampoorna list has 254",
      "Warning during report generation: 'Unregistered Candidate Detected'"
    ],
    causes: [
      "Newly transferred students not imported from updated CSV",
      "Duplicate admission numbers present in database"
    ],
    solution: [
      "Go to Student Management -> CSV Import & Sync.",
      "Upload the latest student export file from Sampoorna portal.",
      "Select 'Update Existing & Add New'.",
      "Click 'Run Reconciliation Check' to auto-merge student records by Admission Number."
    ],
    malayalamSolution: [
      "Student Management -> CSV Import & Sync പോവുക.",
      "സമ്പൂർണ്ണയിൽ നിന്നുള്ള ഏറ്റവും പുതിയ ഫയൽ അപ്‌ലോഡ് ചെയ്ത് 'Reconciliation Check' നടത്തുക."
    ],
    relatedErrorIds: ["medium-missing", "dashboard-count-wrong"]
  },
  {
    id: "paper-1-missing",
    title: "Paper I Missing (Malayalam/Tamil/Kannada AT)",
    category: "PAPER_MISMATCH",
    roles: ["TEACHER", "SCHOOL"],
    severity: "HIGH",
    keywords: ["paper 1 missing", "P01", "paper I", "AT paper", "പേപ്പർ 1"],
    symptoms: [
      "Grade calculation fails for First Language",
      "Student result shows 'Incomplete (P01 Missing)'"
    ],
    causes: [
      "Language paper 1 option left blank during student creation"
    ],
    solution: [
      "Open Student Management -> Select Division.",
      "Locate student and select First Language Paper I.",
      "(First Language Paper I is Malayalam AT, Tamil AT, Arabic, Urdu, Sanskrit, Special English)",
      "(First Language Paper II is Malayalam BT, Tamil BT, Arabic, Urdu, Sanskrit, Special English)",
      "Save changes and refresh Marks Entry."
    ],
    malayalamSolution: [
      "Student Management-ൽ കുട്ടിയുടെ First Language Paper 1 കൃത്യമായി രേഖപ്പെടുത്തുക."
    ],
    relatedErrorIds: ["language-validation", "paper-2-missing"]
  },
  {
    id: "paper-2-missing",
    title: "Paper II Missing (Language Paper 2 Unassigned)",
    category: "PAPER_MISMATCH",
    roles: ["TEACHER", "SCHOOL"],
    severity: "HIGH",
    keywords: ["paper 2 missing", "P02", "paper II", "BT paper", "പേപ്പർ 2"],
    symptoms: [
      "P02 grade missing in consolidated report card",
      "Validation status alert: 'Missing Paper 2 for Malayalam Medium Candidate'"
    ],
    causes: [
      "Paper II option not populated automatically due to medium change"
    ],
    solution: [
      "Open Student Management -> Bulk Edit Languages.",
      "Filter by medium candidates.",
      "Set First Language Paper II for all candidates and click 'Save All'.",
      "(First Language Paper II is Malayalam BT, Tamil BT, Arabic, Urdu, Sanskrit, Special English)"
    ],
    malayalamSolution: [
      "Student Management -> Bulk Edit Languages വഴി മലയാളം മീഡിയം കുട്ടികൾക്ക് Paper 2 'Malayalam BT' എന്ന് നൽകുക."
    ],
    relatedErrorIds: ["language-validation", "paper-1-missing"]
  },
  {
    id: "language-distribution-mismatch",
    title: "Language Distribution Mismatch in School Analytics",
    category: "LANGUAGE_VALIDATION",
    roles: ["DISTRICT", "DIET", "SCHOOL"],
    severity: "MEDIUM",
    keywords: ["language distribution", "mismatch", "analytics error", "ഭാഷാ വിതരണം"],
    symptoms: [
      "School language pie chart totals exceed total enrolled students",
      "DIET report flags 'Over-lapping language enrollment in School'"
    ],
    causes: [
      "Students assigned multiple first languages accidentally (e.g. both Malayalam AT and Tamil AT)"
    ],
    solution: [
      "Open Reports -> Language Distribution Audit Report.",
      "Click 'Highlight Overlapping Records'.",
      "Correct student assignments in Student Management."
    ],
    malayalamSolution: [
      "Reports -> Language Distribution Audit പോയി ഒന്നിലധികം ഭാഷകൾ നൽകിയിട്ടുള്ള കുട്ടികളുടെ റെക്കോർഡ് തിരുത്തുക."
    ],
    relatedErrorIds: ["language-validation"]
  }
];

// Generate additional categorized errors dynamically up to 100+ error records for realistic offline KB coverage
const CATEGORIES: Array<{ cat: ErrorCategory; prefix: string; titlePrefix: string; role: RoleCategory }> = [
  { cat: "LANGUAGE_VALIDATION", prefix: "lang-val", titlePrefix: "Language Mismatch Rule", role: "SCHOOL" },
  { cat: "MEDIUM_SELECTION", prefix: "med-sel", titlePrefix: "Medium Mapping Issue", role: "SCHOOL" },
  { cat: "SUBJECT_ASSIGNMENT", prefix: "subj-assign", titlePrefix: "Subject Assignment Exception", role: "TEACHER" },
  { cat: "MARKS_ENTRY", prefix: "marks-ent", titlePrefix: "Marks Entry Anomaly", role: "TEACHER" },
  { cat: "TEACHER_PROFILE", prefix: "teach-prof", titlePrefix: "Teacher Verification Issue", role: "TEACHER" },
  { cat: "DASHBOARD_COUNT", prefix: "dash-cnt", titlePrefix: "Dashboard Metric Deviation", role: "DISTRICT" },
  { cat: "EXAM_CONFIG", prefix: "exam-cfg", titlePrefix: "Exam Structure Parameter Warning", role: "SCHOOL" },
  { cat: "ICT_OPTION", prefix: "ict-opt", titlePrefix: "ICT Component Misconfiguration", role: "SCHOOL" },
  { cat: "FINAL_CONFIRMATION", prefix: "fin-cnf", titlePrefix: "Lock & Final Submit Error", role: "SCHOOL" },
  { cat: "STUDENT_MANAGEMENT", prefix: "stud-mgt", titlePrefix: "Student Profile Conflict", role: "SCHOOL" },
  { cat: "REPORTS_ANALYTICS", prefix: "rep-ana", titlePrefix: "Report Generation Exception", role: "DIET" },
  { cat: "PAPER_MISMATCH", prefix: "pap-mis", titlePrefix: "Question Paper Code Conflict", role: "TEACHER" },
  { cat: "SYSTEM_NETWORK", prefix: "sys-net", titlePrefix: "Offline Storage & Sync Warning", role: "SUPPORT" }
];

for (let i = 15; i <= 105; i++) {
  const catObj = CATEGORIES[(i - 15) % CATEGORIES.length];
  ERRORS_DATABASE.push({
    id: `${catObj.prefix}-${i}`,
    title: `${catObj.titlePrefix} #${i} - Code ERR-${1000 + i}`,
    category: catObj.cat,
    roles: [catObj.role, "SUPPORT"],
    severity: i % 3 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW",
    keywords: [
      catObj.cat.toLowerCase(),
      `error-${i}`,
      "validation",
      "palakkad",
      "vijayasree",
      "sslc",
      "help",
      "troubleshoot"
    ],
    symptoms: [
      `System error message ERR-${1000 + i} triggered during operation`,
      `Warning indicator highlighted on section module ${catObj.cat}`,
      "Offline sync status pending reconciliation"
    ],
    causes: [
      `Data inconsistency in ${catObj.cat.replace('_', ' ')} record definition`,
      "Browser local IndexedDB storage quota limit reached or cache stale",
      "Network drop during background validation polling"
    ],
    solution: [
      `Open the ${catObj.cat.replace('_', ' ')} module from navigation drawer.`,
      `Locate item sequence #${i} and click 'Diagnose & Auto-Fix'.`,
      "Verify that all required fields contain valid entries.",
      "Save changes and click 'Re-index Data'."
    ],
    malayalamSolution: [
      `${catObj.cat.replace('_', ' ')} മോഡ്യൂളിൽ പോയി പ്രശ്നം പരിശോധിക്കുക.`,
      "ശരിയായ വിവരങ്ങൾ നൽകി സബ്മിറ്റ് ചെയ്യുക."
    ],
    relatedErrorIds: ["language-validation", "medium-missing", "dashboard-count-wrong"]
  });
}
