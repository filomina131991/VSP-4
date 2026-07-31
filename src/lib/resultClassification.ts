export type ResultStatus = 'PASS' | 'FAIL' | 'ABSENT' | 'INCOMPLETE';

/**
 * Global Student Result Classification
 * 
 * Rule 1 – PASS: A student is classified as PASS only when every subject is passed.
 * Rule 2 – ABSENT: A student is classified as ABSENT only when the student is absent in every subject.
 * Rule 3 – FAIL: A student is classified as FAIL whenever the student is not eligible for PASS and is not completely ABSENT.
 */
export function getStudentResult(subjects: string[]): ResultStatus {
  // If no subjects are provided, the result is INCOMPLETE.
  if (!subjects || subjects.length === 0) {
    return 'INCOMPLETE';
  }

  const isAbsentGrade = (g: string) => {
    if (!g) return false;
    const upper = g.trim().toUpperCase();
    return ['AB', 'ABSENT', 'ABS', 'AA'].includes(upper);
  };

  const isPassGrade = (g: string) => {
    if (!g) return false;
    const upper = g.trim().toUpperCase();
    return ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+'].includes(upper);
  };

  // Rule 2: ABSENT only when ALL subjects are absent
  const allAbsent = subjects.every(g => isAbsentGrade(g));
  if (allAbsent) {
    return 'ABSENT';
  }

  // Rule 1: PASS only when ALL subjects are passed
  const allPass = subjects.every(g => isPassGrade(g));
  if (allPass) {
    return 'PASS';
  }

  // Rule 3: FAIL otherwise (not eligible for PASS and not completely ABSENT)
  return 'FAIL';
}
