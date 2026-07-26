# Architecture Review

Date: 2026-07-26
Scope: `src/`, `api/`, `models/`, `server.ts`, `db.ts`, routing, contexts, dropdown paths, schema, and typecheck status.

## Executive Summary

The project is not database-driven end to end. Master data is split across Mongo collections, seed routines, schema defaults, UI fallbacks, analytics helpers, and role-based pages. The strongest structural problems are:

1. `db.ts` and `server.ts` still define business masters in code.
2. `server.ts` centralizes almost all API, query, permission, and workflow logic in one 10k+ line file.
3. Medium, subject, paper, and language identity is stored as free text in many places instead of normalized foreign keys.
4. Marks workflow state is duplicated across `Exam`, `SchoolExamConfig`, and `Mark`.
5. RBAC is inconsistent between schema, frontend types, route guards, and backend handlers.
6. There is duplicate/legacy UI flow (`MarksEntry2Page2.tsx`, `SchoolExamConfigModal.tsx`) beside the routed flow.
7. TypeScript compilation is currently failing in many backend and frontend files.

## Critical Issues

1. Hardcoded seed masters in [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:689).
   Mediums, subjects, districts, exams, admin user, grade scales, and legacy school cleanup are seeded directly in code.

2. Hardcoded normalization maps in [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:4000) and [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:6581).
   Medium identity is resolved by hardcoded aliases instead of DB-driven canonical lookup.

3. Dual exam-config models in [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:248).
   `SchoolExamConfig` stores both legacy `subjects[]` and newer `papers[]`, which creates divergent configuration paths.

4. Non-normalized student language and medium storage in [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:296).
   `medium`, `firstLangPaper1`, `firstLangPaper2`, `secondLang`, `thirdLang`, and `subjects[]` are free-text fields.

5. Confirmation state duplicated across collections in [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:206), [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:248), and [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:356).
   `confirmedSchools`, `confirmedSubjects`, `isSchoolConfirmed`, `workflowStatus`, `locked`, and `finalLocked` all represent overlapping workflow state.

6. Bulk confirm endpoint bypasses required final-confirm workflow in [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:5533).
   It confirms schools at the exam level without validating teacher confirmation completeness via `SchoolExamConfig`.

7. Role model mismatch.
   Schema/types define `WEBMASTER|DEO|DIET|SCHOOL|SUBJECT_EXPERT|RESOURCE_PERSON|TEACHER` in [db.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/db.ts:9) and [src/types/index.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/types/index.ts:1), while backend handlers use `HEADMASTER` and `ADMIN` in [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:6103) and [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:9528).

8. Typecheck is broken.
   `npm run lint` failed on 2026-07-26 with large-scale errors in `db.ts`, `server.ts`, `DataContext.tsx`, `MarksEntry2Page2.tsx`, `SchoolManagementPage.tsx`, `PdfReportPage.tsx`, and others.

## High Priority Issues

1. Duplicate marks-entry implementations.
   Routed page is [src/pages/school/MarksEntry2Page.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/school/MarksEntry2Page.tsx:1), but [src/pages/school/MarksEntry2Page2.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/school/MarksEntry2Page2.tsx:1) and [src/components/school/SchoolExamConfigModal.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/components/school/SchoolExamConfigModal.tsx:1) remain as parallel logic.

2. Teacher designation and assignment rules are hardcoded in [src/pages/school/TeacherManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/school/TeacherManagementPage.tsx:15).

3. Subject grouping logic is duplicated across backend and frontend in:
   [src/pages/management/SubjectManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/SubjectManagementPage.tsx:84)
   [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:8359)
   [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:8550)
   [src/components/school/PremiumExamConfigModal.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/components/school/PremiumExamConfigModal.tsx:111)

4. School and student pages still use static medium fallbacks in:
   [src/pages/school/SchoolProfilePage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/school/SchoolProfilePage.tsx:13)
   [src/pages/management/SchoolManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/SchoolManagementPage.tsx:55)
   [src/pages/school/MarksEntry2Page.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/school/MarksEntry2Page.tsx:1689)

5. Resource taxonomy is hardcoded in [src/pages/management/ResourceManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/ResourceManagementPage.tsx:39).

6. Student religion/category and import mapping are hardcoded in [src/pages/management/StudentManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/StudentManagementPage.tsx:55), [src/pages/management/StudentManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/StudentManagementPage.tsx:67), and [src/pages/management/StudentManagementPage.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/pages/management/StudentManagementPage.tsx:750).

## Static Data Audit

| File | Line | Static Data | Why it is wrong | DB-driven target | Risk |
|---|---:|---|---|---|---|
| `db.ts` | 689-760 | Seeded mediums, subjects, districts, exams | Hardcoded masters block runtime configurability | Master tables + migration/seed scripts outside app boot | Critical |
| `db.ts` | 796-814 | Grade scales | Grade rubric is hardcoded business config | `grade_configs` versioned by class/exam/board | Critical |
| `db.ts` | 319-320 | Default `English`, `Hindi` on student schema | Injects subjects/languages without config lookup | Store subject IDs only, resolve defaults from school/exam config | Critical |
| `server.ts` | 4000-4006, 6581-6585 | `defaultNorm` medium map | Canonical identity is duplicated in code | Normalize by medium master only | Critical |
| `server.ts` | 8374-8378 | `defaultMediums` fallback | Recreates medium master in API response path | Fail closed or fetch only DB mediums | High |
| `server.ts` | 6965-6969 | `subjectsList` analytics list | Static subject universe in reporting | Build from configured subjects for exam/school | High |
| `server.ts` | 6868-6889 | Static analytics insights/trends | Fake analytics mixed with live API | Generate from data or remove | High |
| `server.ts` | 8204 | Draft mock student analytics response | Dead/fake API payload | Implement or remove endpoint | High |
| `src/pages/school/TeacherManagementPage.tsx` | 15-30 | `DESIGNATIONS`, subject-designation matcher | Teacher taxonomy and mapping are static | `designations`, `teacher_assignment_rules` tables | High |
| `src/pages/school/SchoolProfilePage.tsx` | 13 | `['Tamil','English','Malayalam','Kannada']` fallback | Dropdown values no longer strictly DB-sourced | Use mediums API only | High |
| `src/pages/management/SchoolManagementPage.tsx` | 55 | Same medium fallback | Same issue in school admin | Use mediums API only | High |
| `src/pages/management/SubjectManagementPage.tsx` | 440-449 | Static P01-P10 option labels | Paper taxonomy is hardcoded | Paper master/config API | High |
| `src/pages/management/ExamManagementPage.tsx` | 66-76, 120 | Static `PAPER_CODE_LABELS`, default mark map | Exam config depends on fixed paper set | `paper_types` + exam rule config | High |
| `src/components/school/SchoolExamConfigModal.tsx` | 29-42 | Static paper labels and default marks | Legacy modal embeds exam config | Remove legacy flow or drive from config API | High |
| `src/components/school/PremiumExamConfigModal.tsx` | 39-67 | Medium color map, filter options | UI assumes fixed mediums and categories | UI styling map should be theme metadata from config or generic | Medium |
| `src/lib/subjectUtils.ts` | 4-100 | Subject-name normalization aliases | Subject identity derived from text | Use subject IDs + aliases table | High |
| `src/lib/mediumUtils.ts` | 174-185 | Hardcoded `MEDIUM_COLORS` | UI behavior tied to fixed medium list | Generic styling or medium metadata | Medium |
| `src/pages/management/StudentManagementPage.tsx` | 67-82 | Religions/categories arrays | Social metadata is static | Lookup tables/API | High |
| `src/pages/management/StudentManagementPage.tsx` | 701-712 | CSV sample row | Demo data embedded in UI | Download template from backend config | Medium |
| `src/pages/management/ResourceManagementPage.tsx` | 39 | `CATEGORIES` | Resource taxonomy is static | Resource category master table | Medium |
| `src/components/repository/NewQuestionModal.tsx` | 110 | `CLASSES = ['8','9','10']` | Class list is hardcoded | Class master/config API | Medium |

## Dropdown Audit

Major dropdowns already database-backed:

- Exam: `ExamSelect` from `/management/exams` or `/school/configured-exams`.
- Medium master: `/management/mediums`, `/school/mediums`.
- Subject master: `/management/subjects`, `/management/subjects/grouped`.
- District / educational district / school: management APIs.

Dropdowns still contaminated by static fallback or static options:

- Medium dropdowns in school profile, school management, marks entry.
- Subject code/P-code dropdown in subject management.
- Exam code marks and paper labels in exam management.
- Teacher designation dropdown.
- Student category and religion dropdowns.
- Resource category dropdown.
- New question class dropdown.
- Filter option dropdown in premium exam config.

Cache/fallback concerns:

- `DataContext` caches mediums/subjects in `sessionStorage` for 5 minutes in [src/context/DataContext.tsx](/D:/Tamil%20Vizuthukal%20App/VSP%204/src/context/DataContext.tsx:15). Renames/deletes can remain stale until refresh.
- Multiple pages silently fall back to hardcoded arrays when API data is empty instead of failing closed.
- Sorting is inconsistent: some pages use `displayOrder`, others regex on `P01`, others manual arrays.

## Medium and Subject Architecture Review

- Subject identity is not normalized. The same concept can be referenced by `_id`, `id`, `name`, `shortName`, `code`, `paperType`, or text fragments.
- Student records store subject names, not assignment records.
- Teacher assignment uses free-text `teacherAssignments`, `teachingSubjects`, and `assignedSubjects`.
- School exam config stores selected subject IDs, but filtering logic still infers meaning from subject names and suffixes.
- Reporting and validation code infer medium/subject by regex and suffix (`TM`, `EM`, `P01`), which will break on renamed masters.

## API Audit

- Single-file backend in [server.ts](/D:/Tamil%20Vizuthukal%20App/VSP%204/server.ts:1) contains auth, masters, marks, analytics, repository, resource, and reporting logic.
- Many routes query by broad text/string identities instead of foreign keys.
- Several endpoints do not paginate (`/management/schools`, `/management/students`, `/questions`, `/resources`).
- Analytics/reporting endpoints repeatedly rebuild large in-memory arrays and cross-collection joins.
- `bulk-confirm` is authenticated but not role-restricted to webmaster in code.
- Multiple routes use workflow or role strings not present in the canonical frontend/backend role model.
- Error handling is inconsistent: some routes return raw `err.message`, some log only, some silently swallow.

## Permission Review

Required teacher-only subject confirmation is not cleanly enforced.

- Teachers are blocked from editing only after all marks for that subject are already `TEACHER_CONFIRMED`, but authorization is not tied to assignment ownership per subject.
- School final confirm checks only whether `exam.confirmedSubjects[schoolId]` covers configured subjects; it does not verify assigned-teacher completeness from authoritative assignment rows.
- `bulk-confirm` can mark a school confirmed without going through school final confirm.
- Delete/reset routes allow broader roles than your target workflow.
- There is no explicit controlled unlock workflow object. Unlocking mutates marks directly.

## Dead Code and Duplicate Code

- `MarksEntry2Page2.tsx` appears to be an older parallel implementation.
- `SchoolExamConfigModal.tsx` is used only by `MarksEntry2Page2.tsx`, while routed flow uses `PremiumExamConfigModal.tsx`.
- Duplicate medium/subject normalization exists in `server.ts`, `mediumUtils.ts`, `subjectUtils.ts`, `TeacherManagementPage.tsx`, `MarksEntry2Page.tsx`, `StudentManagementPage.tsx`, and exam config modals.

## Performance Review

- Backend risk: repeated `find().lean()` followed by large JS loops in analytics and reporting routes.
- N+1 style counts in marks entry status and reporting.
- No virtualization on large tables like students/schools/reports.
- Route-level lazy loading exists, but many page files are still very large monoliths.

## Recommended Target Architecture

1. Create master collections:
   - `mediums`
   - `paper_types`
   - `subjects`
   - `subject_aliases`
   - `grade_configs`
   - `resource_categories`
   - `religions`
   - `social_categories`
   - `designations`
   - `class_levels`

2. Replace free-text mappings with relational/config records:
   - `school_mediums`
   - `school_subjects`
   - `teacher_subject_assignments`
   - `student_subject_enrollments`
   - `exam_subjects`
   - `school_exam_subjects`

3. Collapse workflow state into one authoritative model:
   - `mark_submission_subjects` with `teacher_confirmed_at`, `teacher_confirmed_by`, `school_final_confirmed_at`, `school_final_confirmed_by`, `locked_state`.

4. Move route logic into modules:
   - `modules/auth`
   - `modules/masters`
   - `modules/students`
   - `modules/marks`
   - `modules/exams`
   - `modules/reports`
   - `modules/repository`

5. Enforce strict RBAC through middleware plus ownership rules:
   - Teacher can mutate only assigned subject rows.
   - School can final confirm only when all assigned subject rows are teacher-confirmed.
   - Unlock must create an audit record and reopen a specific workflow row.

## Health Score

37 / 100

Reason:

- Data-driven master architecture: 25/100
- Permission consistency: 40/100
- Backend modularity: 20/100
- Type safety/build health: 15/100
- UI/data consistency: 45/100
- Auditability and workflow design: 50/100
