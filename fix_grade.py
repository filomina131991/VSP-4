import os

filepath = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/reports/ReportsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target_grade = """      const examClass = result.classStandard || '10';
      const classGradeConfig = examClass === '8' ? gradeConfig?.std8 : gradeConfig?.std9_10;
      if (classGradeConfig && classGradeConfig.length > 0) {
        const sortedConfig = [...classGradeConfig].sort((a: any, b: any) => {
          const getMin = (g: any) => g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
          return getMin(b) - getMin(a);
        });
        for (const g of sortedConfig) {
          const min = g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
          if (pct >= min) return g.grade;
        }
      }"""

replacement_grade = """      const examClass = result.classStandard || '10';
      const classGradeConfig = examClass === '8' ? gradeConfig?.std8 : gradeConfig?.std9_10;
      if (classGradeConfig && classGradeConfig.length > 0) {
        const sortedConfig = [...classGradeConfig].sort((a: any, b: any) => {
          // Check scores[maxMark.toString()] for min score, if percentage based, convert to score based check.
          const maxMarkStr = String(maxMark);
          const getMin = (g: any) => {
             if (g.scores && g.scores[maxMarkStr] !== undefined) return Number(g.scores[maxMarkStr]);
             return g.min !== undefined ? (g.min * maxMark / 100) : -1;
          };
          return getMin(b) - getMin(a);
        });
        for (const g of sortedConfig) {
          const maxMarkStr = String(maxMark);
          const min = g.scores && g.scores[maxMarkStr] !== undefined ? Number(g.scores[maxMarkStr]) : (g.min !== undefined ? (g.min * maxMark / 100) : -1);
          if (min !== -1 && valToConvert >= min) return g.grade;
        }
      }"""

content = content.replace(target_grade, replacement_grade)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
