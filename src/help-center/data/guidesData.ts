export interface RoleGuideSection {
  id: string;
  title: string;
  malayalamTitle: string;
  content: string;
  malayalamContent: string;
  icon: string;
  errorIds?: string[];
}

export interface RoleGuide {
  roleId: 'teacher' | 'school' | 'dashboard';
  title: string;
  malayalamTitle: string;
  description: string;
  sections: RoleGuideSection[];
}

export const ROLE_GUIDES: Record<string, RoleGuide> = {
  teacher: {
    roleId: 'teacher',
    title: 'Teacher Interactive User Guide',
    malayalamTitle: 'അധ്യാപകർക്കുള്ള വഴികാട്ടി',
    description: 'Complete step-by-step instructions for teachers on logging in, configuring profile, selecting assigned subjects, entering grades, and performing final subject locks.',
    sections: [
      {
        id: 't-1',
        title: '1. Teacher Login & Credentials',
        malayalamTitle: '1. അധ്യാപക ലോഗിൻ',
        content: 'Log in using your 6-8 digit PEN Number as username. If logging in for the first time, use your temporary password assigned by your School HM.',
        malayalamContent: 'അധ്യാപകന്റെ PEN നമ്പർ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക. ആദ്യമായി ലോഗിൻ ചെയ്യുമ്പോൾ എച്ച്.എം നൽകിയ താത്കാലിക പാസ്‌വേഡ് ഉപയോഗിക്കുക.',
        icon: 'LogIn',
        errorIds: ['sys-net-15']
      },
      {
        id: 't-2',
        title: '2. Teacher Profile Completion',
        malayalamTitle: '2. പ്രൊഫൈൽ അപഗ്രഥനം',
        content: 'Navigate to Teacher Profile to specify designation (HST/HSA), mobile number, email, and preferred instruction mediums (Malayalam/English).',
        malayalamContent: 'Teacher Profile പോയി തസ്തികയും ഫോൺ നമ്പറും നൽകുക.',
        icon: 'UserCheck',
        errorIds: ['teacher-profile-incomplete']
      },
      {
        id: 't-3',
        title: '3. Subject Assignment Check',
        malayalamTitle: '3. വിഷയ ചുമതല പരിശോധന',
        content: 'Verify that your assigned teaching subjects (e.g., P05 Social Science, P06 Physics) are active. If empty, contact your School HM.',
        malayalamContent: 'നിങ്ങൾക്ക് അനുവദിച്ച വിഷയങ്ങൾ കാണുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക. കാണുന്നില്ലെങ്കിൽ എച്ച്.എമ്മിനെ ബന്ധപ്പെടുക.',
        icon: 'BookOpen',
        errorIds: ['subject-missing']
      },
      {
        id: 't-4',
        title: '4. Marks & Grades Entry',
        malayalamTitle: '4. മാർക്ക് എൻട്രി',
        content: 'Open Marks Entry 2. Select Division and Subject. Enter marks or grades. Type "Ab" for absentees.',
        malayalamContent: 'വിഷയവും ഡിവിഷനും തിരഞ്ഞെടുത്ത് ഗ്രേഡുകൾ നൽകുക. എബ്സെന്റായ കുട്ടികൾക്ക് Ab നൽകുക.',
        icon: 'FileEdit',
        errorIds: ['marks-entry-empty']
      },
      {
        id: 't-5',
        title: '5. Final Subject Confirmation & Lock',
        malayalamTitle: '5. ഫൈനൽ മാർക്ക് ലോക്ക് ചെയ്യൽ',
        content: 'Inspect summary stats. Click "Confirm & Lock Subject Marks". Once locked, badge turns green.',
        malayalamContent: 'വിവരങ്ങൾ കൃത്യമെങ്കിൽ "Confirm & Lock Subject Marks" അമർത്തുക.',
        icon: 'Lock',
        errorIds: ['pending-subject-confirmation']
      }
    ]
  },
  school: {
    roleId: 'school',
    title: 'School Administrator (HM) Guide',
    malayalamTitle: 'സ്കൂൾ അഡ്മിനിസ്ട്രേറ്റർ (HM) വഴികാട്ടി',
    description: 'Comprehensive workflow guide for Headmasters and School IT Coordinators from student registration to final DEO confirmation.',
    sections: [
      {
        id: 's-1',
        title: '1. School Profile & Medium Setup',
        malayalamTitle: '1. സ്കൂൾ പ്രൊഫൈലും മാധ്യമങ്ങളും',
        content: 'Verify UDISE code, HM contact details, and check active instruction mediums.',
        malayalamContent: 'UDISE കോഡും ഫോൺ നമ്പറും മാധ്യമങ്ങളും പരിശോധിക്കുക.',
        icon: 'Building',
        errorIds: ['medium-missing']
      },
      {
        id: 's-2',
        title: '2. Student Import & Language Allocation',
        malayalamTitle: '2. വിദ്യാർത്ഥി രജിസ്ട്രേഷൻ',
        content: 'Import candidate CSV file, map First Language Paper 1 (AT) & Paper 2 (BT), configure CWSN exemptions.',
        malayalamContent: 'സമ്പൂർണ്ണ ഫയൽ അപ്‌ലോഡ് ചെയ്ത് പേപ്പർ 1, പേപ്പർ 2 വിവരങ്ങൾ നൽകുക.',
        icon: 'Users',
        errorIds: ['language-validation', 'paper-1-missing', 'paper-2-missing']
      },
      {
        id: 's-3',
        title: '3. Exam Parameters & ICT Option',
        malayalamTitle: '3. പരീക്ഷാ കോൺഫിഗറേഷൻ',
        content: 'Enable SSLC Model Exam, configure CE/TE maximum limits, toggle ICT option.',
        malayalamContent: 'പരീക്ഷാ രീതിയും ICT മാർക്ക് ഓപ്ഷനും ക്രമീകരിക്കുക.',
        icon: 'Settings',
        errorIds: ['exam-config-missing', 'ict-option-missing']
      },
      {
        id: 's-4',
        title: '4. Subject Status Monitoring',
        malayalamTitle: '4. വിഷയ നിരീക്ഷണം',
        content: 'Monitor Dashboard Subject Status tracker to ensure all 10 subject teachers have locked marks.',
        malayalamContent: 'എല്ലാ അധ്യാപകരും മാർക്ക് ലോക്ക് ചെയ്തുവെന്ന് ഡാഷ്‌ബോർഡിൽ ഉറപ്പാക്കുക.',
        icon: 'CheckSquare',
        errorIds: ['pending-subject-confirmation']
      },
      {
        id: 's-5',
        title: '5. Final Submission & PDF Reports',
        malayalamTitle: '5. ഫൈനൽ സബ്മിഷനും റിപ്പോർട്ടുകളും',
        content: 'Run validation engine, resolve warnings, submit Final Confirmation to DEO Palakkad, download PDF reports.',
        malayalamContent: 'വാലിഡേഷൻ പൂർത്തിയാക്കി ഫൈനൽ സബ്മിഷൻ നടത്തുക. റിപ്പോർട്ടുകൾ പ്രിന്റ് എടുക്കുക.',
        icon: 'Award',
        errorIds: ['final-confirmation-hidden']
      }
    ]
  },
  dashboard: {
    roleId: 'dashboard',
    title: 'Dashboard & Analytics Guide',
    malayalamTitle: 'ഡാഷ്‌ബോർഡും അനലിറ്റിക്‌സും വഴികാട്ടി',
    description: 'Understanding key performance indicators, language distribution pie charts, medium pass percentages, and sub-district comparison metrics.',
    sections: [
      {
        id: 'd-1',
        title: '1. Registered vs Appeared Candidate Counts',
        malayalamTitle: '1. വിദ്യാർത്ഥികളുടെ എണ്ണം',
        content: 'Dashboard displays real-time candidate registration totals, total appeared, and total absent candidates across divisions.',
        malayalamContent: 'ഹാജരായവരുടെയും എബ്സെന്റായവരുടെയും കണക്കുകൾ തത്സമയം കാണാം.',
        icon: 'Users',
        errorIds: ['dashboard-count-wrong', 'student-count-mismatch']
      },
      {
        id: 'd-2',
        title: '2. Language Distribution Analytics',
        malayalamTitle: '2. ഭാഷാ വിതരണ വിശകലനം',
        content: 'Visual chart showing candidates enrolled in Malayalam AT, Malayalam BT, Tamil, and Kannada streams.',
        malayalamContent: 'വിവിധ ഭാഷാ സ്ട്രീമുകളിലെ കുട്ടികളുടെ എണ്ണം ഡാറ്റയായി കാണാം.',
        icon: 'PieChart',
        errorIds: ['language-distribution-mismatch']
      },
      {
        id: 'd-3',
        title: '3. Subject A+ Tally & Grade Distribution',
        malayalamTitle: '3. എ പ്ലസ് കണക്കുകൾ',
        content: 'Subject-wise breakdown of A+, A, B+, B, C+, C, D+, D grades with instant pass percentage metrics.',
        malayalamContent: 'ഓരോ വിഷയത്തിലെയും എ പ്ലസ്, ഗ്രേഡ് കണക്കുകൾ അറിയാം.',
        icon: 'TrendingUp',
        errorIds: ['rep-ana-20']
      }
    ]
  }
};
