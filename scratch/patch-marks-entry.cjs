const fs = require('fs');

function patchFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  const oldOnChangeSingle = `onChange={(e) => {
                            setSelectedSubjectIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                          }}`;
                          
  const newOnChangeSingle = `onChange={(e) => {
                            if (e.target.checked) {
                              const subCode = s.code || (typeof getPCode === 'function' ? getPCode(s) : undefined);
                              const subjectMaxMarks = selectedExamObj?.maxMarks?.[s.id] || (subCode && selectedExamObj?.maxMarks?.[subCode]);
                              if (subjectMaxMarks === 0) {
                                toast.error('Concerned subject is not allowed for this exam configuration.');
                                return;
                              }
                            }
                            setSelectedSubjectIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                          }}`;

  // Select all logic
  const oldOnChangeAll = `onChange={(e) => setSelectedSubjectIds(e.target.checked ? availableSubjects.map(s => s.id) : [])}`;
  const newOnChangeAll = `onChange={(e) => {
                          if (e.target.checked) {
                            const validSubjects = availableSubjects.filter(s => {
                              const subCode = s.code || (typeof getPCode === 'function' ? getPCode(s) : undefined);
                              const subjectMaxMarks = selectedExamObj?.maxMarks?.[s.id] || (subCode && selectedExamObj?.maxMarks?.[subCode]);
                              return subjectMaxMarks !== 0;
                            });
                            if (validSubjects.length < availableSubjects.length) {
                                toast.error('Some subjects are not allowed for this exam configuration and were skipped.');
                            }
                            setSelectedSubjectIds(validSubjects.map(s => s.id));
                          } else {
                            setSelectedSubjectIds([]);
                          }
                        }}`;

  let patched = false;
  if (content.includes(oldOnChangeSingle)) {
    content = content.replace(oldOnChangeSingle, newOnChangeSingle);
    patched = true;
  }
  
  if (content.includes(oldOnChangeAll)) {
    content = content.replace(oldOnChangeAll, newOnChangeAll);
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(path, content, 'utf8');
    console.log("Patched " + path);
  } else {
    console.log("Could not find targets in " + path);
  }
}

patchFile('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page2.tsx');
patchFile('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page.tsx');

