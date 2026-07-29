const mark = 6;
const maxMark = 20;

let gradeConfig = {
  std9_10: [
    { grade: 'A+', range: '18-20', scores: { '20': '18' } },
    { grade: 'A', range: '16-17', scores: { '20': '16' } },
    { grade: 'B+', range: '14-15', scores: { '20': '14' } },
    { grade: 'B', range: '12-13', scores: { '20': '12' } },
    { grade: 'C+', range: '10-11', scores: { '20': '10' } },
    { grade: 'C', range: '8-9', scores: { '20': '8' } },
    { grade: 'D+', range: '6-7', scores: { '20': '6' } },
    { grade: 'D', range: '4-5', scores: { '20': '4' } },
    { grade: 'E', range: '0-3', scores: { '20': '0' } }
  ]
};

const valToConvert = Number(mark);
const pct = Math.round((valToConvert * 100) / maxMark);

console.log('pct:', pct);

const classGradeConfig = gradeConfig.std9_10;
if (classGradeConfig && classGradeConfig.length > 0) {
  const sortedConfig = [...classGradeConfig].sort((a, b) => {
    const getMin = (g) => g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
    return getMin(b) - getMin(a);
  });
  
  for (const g of sortedConfig) {
    const min = g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
    console.log('check min for', g.grade, 'min is', min);
    if (pct >= min) {
      console.log('Returned from config:', g.grade);
      process.exit(0);
    }
  }
}

console.log('Fallback to hardcoded');
if (pct >= 90) console.log('A+');
else if (pct >= 80) console.log('A');
else if (pct >= 70) console.log('B+');
else if (pct >= 60) console.log('B');
else if (pct >= 50) console.log('C+');
else if (pct >= 40) console.log('C');
else if (pct >= 30) console.log('D+');
else if (pct >= 20) console.log('D');
else console.log('E');
