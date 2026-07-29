import os

filepath = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/reports/ReportsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace SUBJECTS useMemo
target_subjects = """  const SUBJECTS = React.useMemo(() => {
    const sortSubjects = (arr: { code: string; label: string }[]) => {
      const seen = new Set<string>();
      const unique = arr.filter(s => {
        const key = s.code.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return sortSubjectsUtil(unique);
    };

    if (configuredSubjectIds.length > 0 && subjects.length > 0) {
      const fromConfig = configuredSubjectIds
        .map(id => subjects.find((s: any) => s._id === id || s.id === id))
        .filter(Boolean)
        .map((s: any) => ({
          ...s,
          code: s.shortName || s.code || s.name,
          label: s.shortName || s.name || s.code
        }));
      if (fromConfig.length > 0) {
        return sortSubjects(fromConfig);
      }
    }

    let list = reportData?.exam?.subjects || [];
    let mapped = list.map((s: any) => ({
      ...s,
      code: s.code || s.name,
      label: s.shortName || s.name || s.code
    }));
    if (mapped.length > 0) {
      return sortSubjects(mapped);
    }

    // Fallback: build from all active subjects in DB
    if (subjects.length > 0) {
      const allFromDb = subjects.map((s: any) => ({
        ...s,
        code: s.shortName || s.code || s.name,
        label: s.shortName || s.name || s.code
      }));
      if (allFromDb.length > 0) {
        return sortSubjects(allFromDb);
      }
    }

    return [];
  }, [reportData?.exam?.subjects, configuredSubjectIds, subjects]);"""

replacement_subjects = """  const SUBJECTS = React.useMemo(() => {
    // 1. Try to build from configured subjects if available
    if (configuredSubjectIds.length > 0 && subjects.length > 0) {
      const fromConfig = configuredSubjectIds
        .map(id => subjects.find((s: any) => s._id === id || s.id === id))
        .filter(Boolean)
        .map((s: any) => ({
          ...s,
          code: s.shortName || s.code || s.name,
          label: s.shortName || s.name || s.code
        }));
      if (fromConfig.length > 0) {
        return sortSubjectsUtil(fromConfig);
      }
    }

    // 2. Build subjects based on what students actually took, fallback to maxMarks
    const activeKeys = new Set<string>();
    if (reportData?.results) {
      reportData.results.forEach((r: any) => {
        if (r.marks) Object.keys(r.marks).forEach(k => activeKeys.add(k));
        if (r.grades) Object.keys(r.grades).forEach(k => activeKeys.add(k));
      });
    }

    const maxMarkKeys = reportData?.exam?.maxMarks ? Object.keys(reportData.exam.maxMarks) : [];
    maxMarkKeys.forEach(k => activeKeys.add(k));

    if (activeKeys.size > 0 && subjects.length > 0) {
      const shortCodeMap: Record<string, string> = { 'P01': 'Lan I', 'P02': 'Lan II', 'P03': 'Eng', 'P04': 'Hin', 'P05': 'SS', 'P06': 'Phy', 'P07': 'Che', 'P08': 'Bio', 'P09': 'Mat' };
      const mapped = Array.from(activeKeys).map(code => {
        const sub = subjects.find((s: any) => s.shortName === code || s.code === code || s.name === code);
        return {
          subjectId: sub?._id?.toString() || '',
          code,
          label: shortCodeMap[code] || sub?.shortName || sub?.name || code
        };
      });
      return sortSubjectsUtil(mapped);
    }

    return [];
  }, [reportData?.exam?.subjects, configuredSubjectIds, subjects, reportData]);"""

content = content.replace(target_subjects, replacement_subjects)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
