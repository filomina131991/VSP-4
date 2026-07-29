import { FaqItem } from '../types';

export const FAQS_DATA: FaqItem[] = [
  {
    id: "faq-1",
    question: "What is Language Validation Error and how do I fix it?",
    malayalamQuestion: "Language Validation Error എന്നാൽ എന്ത്? ഇത് എങ്ങനെ പരിഹരിക്കാം?",
    answer: "Language Validation Error occurs when a candidate's First Language Paper 1 (e.g. Malayalam AT) does not correspond logically with First Language Paper 2 (Malayalam BT). To resolve this, open Student Management -> Filter Division -> Edit Student -> Align Paper 1 and Paper 2 -> Click Apply.",
    malayalamAnswer: "കുട്ടിയുടെ ആദ്യ ഭാഷാ പേപ്പറുകൾ തമ്മിൽ യോജിക്കാതെ വരുമ്പോഴാണ് ഈ എറർ വരുന്നത്. Student Management-ൽ പോയി കുട്ടിയുടെ പേപ്പർ 1 ഉം പേപ്പർ 2 ഉം ശരിയായ കോമ്പിനേഷനിൽ ആക്കുക.",
    category: "LANGUAGE_VALIDATION",
    keywords: ["language", "validation", "paper 1", "paper 2", "mismatch"],
    relatedErrorId: "language-validation"
  },
  {
    id: "faq-2",
    question: "Why is the Medium selection dropdown empty in Marks Entry?",
    malayalamQuestion: "മാർക്ക് എൻട്രിയിൽ മീഡിയം ഡ്രോപ്പ്ഡൗൺ കാലിയായി കാണുന്നത് എന്തുകൊണ്ട്?",
    answer: "This happens when instructional mediums (Malayalam Medium, English Medium) are not marked active in the School Profile. Go to School Profile -> Medium Configuration, check active mediums, and save.",
    malayalamAnswer: "സ്കൂൾ പ്രൊഫൈലിൽ പോയി ബോധന മാധ്യമങ്ങൾ (Malayalam/English) സെലക്ട് ചെയ്ത് സേവ് ചെയ്യുക.",
    category: "MEDIUM_SELECTION",
    keywords: ["medium", "dropdown", "empty", "malayalam", "english"],
    relatedErrorId: "medium-missing"
  },
  {
    id: "faq-3",
    question: "Teacher cannot see assigned subject in Marks Entry 2. What to do?",
    malayalamQuestion: "അധ്യാപകന് വിഷയം കാണുന്നില്ലെങ്കിൽ എന്ത് ചെയ്യണം?",
    answer: "School HM must assign the subject and division to the teacher's PEN account from Teacher Management. After HM assigns the subject, teacher should log out and log back in.",
    malayalamAnswer: "എച്ച്.എം Teacher Management-ൽ കയറി അധ്യാപകന് വിഷയ ചുമതല നൽകുക. ശേഷം അധ്യാപകൻ ലോഗൗട്ട് ചെയ്ത് വീണ്ടും ലോഗിൻ ചെയ്യുക.",
    category: "SUBJECT_ASSIGNMENT",
    keywords: ["teacher", "subject", "assignment", "pen", "missing"],
    relatedErrorId: "subject-missing"
  },
  {
    id: "faq-4",
    question: "Why is Final Confirmation button disabled for School HM?",
    malayalamQuestion: "എച്ച്.എമ്മിന് ഫൈനൽ സബ്മിഷൻ ബട്ടൺ ഡിസേബിൾ ആയിരിക്കുന്നത് എന്തുകൊണ്ട്?",
    answer: "Final Confirmation is locked if any subject marks remain unlocked by teachers, or if student count mismatches exist, or if language validation fails. Check the Dashboard Readiness Checklist to clear all red flags.",
    malayalamAnswer: "ഏതെങ്കിലും അധ്യാപകൻ മാർക്ക് ലോക്ക് ചെയ്യാതിരിക്കുകയോ വാലിഡേഷൻ എററുകൾ നിലനിൽക്കുകയോ ചെയ്താൽ ബട്ടൺ ലോക്ക് ആയിരിക്കും. ഡാഷ്‌ബോർഡിലെ ചെക്ക്‌ലിസ്റ്റ് പരിശോധിക്കുക.",
    category: "FINAL_CONFIRMATION",
    keywords: ["final confirmation", "disabled", "hm lock", "submit"],
    relatedErrorId: "final-confirmation-hidden"
  },
  {
    id: "faq-5",
    question: "How does Vijayasree PWA work completely offline?",
    malayalamQuestion: "വിജയശ്രീ ആപ്പ് എങ്ങനെയാണ് ഓഫ്‌ലൈനായി പ്രവർത്തിക്കുന്നത്?",
    answer: "Vijayasree Help Center utilizes Service Worker caching and local IndexedDB database storage. All 100+ error solutions, guides, step-by-step instructions, and offline fuzzy search operate locally inside your browser without needing an internet connection.",
    malayalamAnswer: "സർവീസ് വർക്കറും ഇൻഡെക്സ്ഡ് ഡിബി (IndexedDB) സാങ്കേതികവിദ്യയും ഉപയോഗിച്ച് വിവരങ്ങൾ ബ്രൗസറിൽ സേവ് ചെയ്യപ്പെടുന്നതിനാൽ ഇൻ്റർനെറ്റ് ഇല്ലാതെയും ആപ്പ് പ്രവർത്തിക്കും.",
    category: "SYSTEM_NETWORK",
    keywords: ["offline", "pwa", "service worker", "indexeddb", "sync"],
    relatedErrorId: "sys-net-15"
  },
  {
    id: "faq-6",
    question: "How to enter ICT option and practical scores?",
    malayalamQuestion: "ICT മാർക്കുകൾ എങ്ങനെ ചേർക്കാം?",
    answer: "Ensure 'Include ICT Option' is toggled ON under School Profile -> Exam Parameters. The P10 Information Technology subject column will then automatically activate in Marks Entry 2 grid.",
    malayalamAnswer: "School Profile-ൽ പോയി 'Include ICT' ഫീച്ചർ ഓൺ ചെയ്യുക.",
    category: "ICT_OPTION",
    keywords: ["ict", "it", "practical", "computer"],
    relatedErrorId: "ict-option-missing"
  },
  {
    id: "faq-7",
    question: "Can I print or export consolidated school reports to PDF?",
    malayalamQuestion: "റിപ്പോർട്ടുകൾ പി.ഡി.എഫ് ആയി ഡൗൺലോഡ് ചെയ്യാൻ സാധിക്കുമോ?",
    answer: "Yes! Navigate to Reports -> Click 'Generate Consolidated PDF Report'. You can filter by Class Division, Subject-wise A+ summary, and print using TAU-Paalai font styling.",
    malayalamAnswer: "സാധിക്കും. Reports വിഭാഗത്തിൽ പോയി 'Generate Consolidated PDF Report' ക്ലിക്ക് ചെയ്താൽ പി.ഡി.എഫ് പ്രിന്റ് എടുക്കാം.",
    category: "REPORTS_ANALYTICS",
    keywords: ["pdf", "print", "reports", "export"],
    relatedErrorId: "rep-ana-20"
  }
];
