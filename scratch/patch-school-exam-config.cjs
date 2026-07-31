const fs = require('fs');

const path = 'd:/Tamil Vizuthukal App/VSP 4/src/components/school/SchoolExamConfigModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. In loadConfigAndDynamicData, prevent auto-selecting subjects with 0 marks when savedConfig is empty.
// We will replace the initial selection logic.
const initialSelectionRegex = /mediums\.forEach\(\(medium: string\) => \{\s+getSubjectsForMedium\(medium, data\.languagesByMedium \|\| \{\}\)\.forEach\(s => initialSelected\.add\(s\.id\)\);\s+\}\);/;
const newInitialSelection = `const currentExam = exams.find(e => e.id === examId);
        mediums.forEach((medium: string) => {
          getSubjectsForMedium(medium, data.languagesByMedium || {}).forEach(s => {
            const pType = (s.paperType || s.code || s.shortName || '').toUpperCase();
            const eMarks = currentExam?.maxMarks?.[s.id] ?? currentExam?.maxMarks?.[pType];
            if (eMarks !== 0) {
              initialSelected.add(s.id);
            }
          });
        });`;
content = content.replace(initialSelectionRegex, newInitialSelection);

const commonSubRegex = /\[\.\.\.\(data\.commonSubjects\?\.p03 \|\| \[\]\), \.\.\.\(data\.commonSubjects\?\.p04 \|\| \[\]\), \.\.\.\(data\.commonSubjects\?\.core \|\| \[\]\)\].forEach\(\(s: any\) => \{\s+initialSelected\.add\(s\._id \|\| s\.id\);\s+\}\);/;
const newCommonSub = `[...(data.commonSubjects?.p03 || []), ...(data.commonSubjects?.p04 || []), ...(data.commonSubjects?.core || [])].forEach((s: any) => {
          const sId = s._id || s.id;
          const pType = (s.paperType || s.code || s.shortName || '').toUpperCase();
          const eMarks = currentExam?.maxMarks?.[sId] ?? currentExam?.maxMarks?.[pType];
          if (eMarks !== 0) {
            initialSelected.add(sId);
          }
        });`;
content = content.replace(commonSubRegex, newCommonSub);

// 2. In activeTabSubjects.map, add logic for disabling selection and showing toast if 0 marks.
const disabledLogicRegex = /const isDisabled = isMalayalamMedium && isP03P04;/;
const newDisabledLogic = `const examMaxMarks = globalExam?.maxMarks?.[sub.id] ?? globalExam?.maxMarks?.[paperType];
                        const isZeroMarksInExam = examMaxMarks === 0;
                        const isDisabled = (isMalayalamMedium && isP03P04) || isZeroMarksInExam;`;
content = content.replace(disabledLogicRegex, newDisabledLogic);

const onClickRegex = /onClick=\{\(\) => \{ if \(\!isDisabled\) toggleSubject\(sub\.id\); \}\}/;
const newOnClick = `onClick={() => { 
                            if (isZeroMarksInExam) {
                              toast.error('Concerned subject is not allowed for this exam configuration');
                              return;
                            }
                            if (!isDisabled) toggleSubject(sub.id); 
                          }}`;
content = content.replace(onClickRegex, newOnClick);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched SchoolExamConfigModal.tsx");
