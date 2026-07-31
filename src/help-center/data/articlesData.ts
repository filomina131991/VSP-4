import { KbArticle } from '../types';

export const ARTICLES_DATA: KbArticle[] = [
  {
    id: "kb-language-rules",
    title: "Complete SSLC First Language Paper I & II Mapping Rules",
    category: "LANGUAGE_VALIDATION",
    summary: "Detailed reference guide for First Language Paper combinations (Malayalam AT, Malayalam BT, Tamil, Kannada) in Kerala SSLC examination.",
    content: `
# SSLC First Language Allocation Guide

In Kerala SSLC examinations, candidate First Language papers follow strict regulatory combinations:

### Valid Combinations:
1. **Malayalam Medium Candidate:**
   - First Language Paper 1: **P01 Malayalam AT**
   - First Language Paper 2: **P02 Malayalam BT**
2. **English Medium Candidate (Malayalam Option):**
   - First Language Paper 1: **P01 Malayalam AT**
   - First Language Paper 2: **P02 Malayalam BT**
3. **Linguistic Minority (Tamil / Kannada):**
   - First Language Paper 1: **P01 Tamil AT / Kannada AT**
   - First Language Paper 2: **P02 Tamil BT / Kannada BT**

### Common Errors:
- Selecting Malayalam AT for Paper 1 but selecting Sanskrit for Paper 2.
- Omitting Paper 2 for English Medium candidates.

### Resolution Steps:
1. Go to **Student Management**.
2. Click **Bulk Edit Languages**.
3. Apply standard preset: *Default Malayalam AT + BT*.
    `,
    tags: ["language", "paper1", "paper2", "sslc", "malayalam"],
    author: "Vijayasree State Expert Team",
    updatedAt: "2026-07-28",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
    rating: { up: 142, down: 2 }
  },
  {
    id: "kb-marks-entry-guide",
    title: "Teacher Best Practices for Rapid Marks Entry 2",
    category: "MARKS_ENTRY",
    summary: "How subject teachers can enter marks smoothly, save drafts offline, and avoid locked grid conflicts.",
    content: `
# Marks Entry 2 Productivity Guide

### Key Tips for Subject Teachers:
- **Save Progress:** Click **Save Progress** after every 5-10 student rows. Data is saved to the server.
- **Keyboard Navigation:** Press **Tab** to move across subject columns; press **Enter** to jump down to the next student row.
- **Absentee Candidates:** Type **Ab** (case insensitive) for absent candidates. Do NOT leave cells blank.
- **Final Lock:** Once all marks are populated, click **Confirm & Lock Subject Marks** to generate your green lock certificate.
    `,
    tags: ["teacher", "marks", "keyboard", "offline", "grades"],
    author: "DIET Palakkad Academic Wing",
    updatedAt: "2026-07-25",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80",
    rating: { up: 98, down: 1 }
  },
  {
    id: "kb-final-submission-checklist",
    title: "HM Final Confirmation Readiness Checklist",
    category: "FINAL_CONFIRMATION",
    summary: "A step-by-step audit protocol for School HMs before performing final SSLC data lock for DEO Palakkad.",
    content: `
# Final Confirmation Audit Protocol

Before executing Final Submission:
1. **Student Count Audit:** Total enrolled students in portal must match physical roll count.
2. **Subject Lock Status:** All 10 subject teachers must have executed **Final Lock**.
3. **Language Validation Engine:** Run validation scan and ensure 0 errors reported.
4. **CWSN Sanction Check:** Verify all exempted candidates have valid government orders uploaded.
    `,
    tags: ["hm", "school", "final submission", "lock", "deo"],
    author: "DEO Palakkad Support Desk",
    updatedAt: "2026-07-29",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    rating: { up: 176, down: 4 }
  }
];
