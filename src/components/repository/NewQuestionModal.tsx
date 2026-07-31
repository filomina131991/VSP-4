import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { apiClient } from '../../lib/apiClient';
import RichQuestionEditor from '../editor/RichQuestionEditor';
import { AlertCircle, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mediumNameToId } from '../../lib/mediumUtils';
import { filterSubjectsByMedium } from '../../lib/subjectUtils';
import Modal from '../common/Modal';
import Dropdown from '../common/Dropdown';

const DRAFT_KEY = 'question_draft';
const DEFAULT_MARKS = 1;

interface NewQuestionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function NewQuestionModal({ onClose, onSuccess, initialData }: NewQuestionModalProps) {
  const { user } = useAuth();
  const { mediums, subjects } = useData();
  
  const draft = !initialData ? JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') : null;

  const [content, setContent] = useState(initialData?.content || draft?.content || '');
  const [medium, setMedium] = useState(initialData?.medium || draft?.medium || 'Tamil');
  const [className, setClassName] = useState(initialData?.className || draft?.className || '10');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId || draft?.subjectId || '');
  const [chapter, setChapter] = useState(initialData?.chapter || draft?.chapter || '');
  const [subUnit, setSubUnit] = useState(initialData?.subUnit || draft?.subUnit || '');
  
  const parsedOptions = Array.isArray(initialData?.options) && initialData?.questionType !== 'MCQ' ? initialData.options[0] : initialData?.options;
  
  const [questionType, setQuestionType] = useState(initialData?.questionType || draft?.questionType || 'MCQ');
  const [marks, setMarks] = useState(initialData?.marks || draft?.marks || DEFAULT_MARKS);
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || draft?.difficulty || 'Medium');
  
  const [mcqOptions, setMcqOptions] = useState<string[]>(
    initialData?.questionType === 'MCQ' && parsedOptions 
      ? initialData.options.map((o: any) => o.text)
      : draft?.mcqOptions || ['', '', '', '']
  );
  const [correctOption, setCorrectOption] = useState<number>(
    initialData?.questionType === 'MCQ' && parsedOptions
      ? initialData.options.findIndex((o: any) => o.isCorrect)
      : draft?.correctOption || 0
  );
  
  const defaultMciRows = [
    { col1: '', symbol1: '-', col2: '', symbol2: '-', col3: '' },
    { col1: '', symbol1: '-', col2: '', symbol2: '-', col3: '' }
  ];

  const [mciColumnCount, setMciColumnCount] = useState<number>(
    initialData?.questionType === 'MCI' && parsedOptions?.columns
      ? parsedOptions.columns
      : draft?.mciColumnCount || 2
  );

  const [mciRows, setMciRows] = useState<any[]>(() => {
    if (initialData?.questionType === 'MCI' && parsedOptions) {
      if (parsedOptions.rows) return parsedOptions.rows;
      if (parsedOptions.left && parsedOptions.right) {
        // Migration from old format
        return parsedOptions.left.map((l: string, i: number) => ({
          col1: l, symbol1: '-', col2: parsedOptions.right[i] || '', symbol2: '-', col3: ''
        }));
      }
    }
    return draft?.mciRows || defaultMciRows;
  });

  const [isInternalChoice, setIsInternalChoice] = useState<boolean>(
    initialData?.questionType === 'CR' && parsedOptions?.isInternalChoice
      ? true 
      : draft?.isInternalChoice || false
  );
  
  const [orContent, setOrContent] = useState<string>(
    initialData?.questionType === 'CR' && parsedOptions?.orContent
      ? parsedOptions.orContent
      : draft?.orContent || ''
  );
  
  const [availableChapters, setAvailableChapters] = useState<any[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  useEffect(() => {
    if (!initialData) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        content, medium, className, subjectId, chapter, subUnit,
        questionType, marks, difficulty, mcqOptions, correctOption,
        mciColumnCount, mciRows, isInternalChoice, orContent
      }));
    }
  }, [content, medium, className, subjectId, chapter, subUnit, questionType, marks, difficulty, mcqOptions, correctOption, mciColumnCount, mciRows, isInternalChoice, orContent, initialData]);

  const getFilteredMediums = () => {
    const allMediums = mediums.filter((m: any) => m.active !== false).map((m: any) => m.name);
    if (user?.role === 'SUBJECT_EXPERT' && user.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      return allMediums.filter(m => user.mediums.includes(m));
    }
    return allMediums;
  };
  const MEDIUMS = getFilteredMediums();
  const CLASSES = ['8', '9', '10'];

  const getFilteredSubjects = () => {
    let allBaseSubjects = subjects.filter((s: any) => s.active !== false);
    if (medium) {
      allBaseSubjects = filterSubjectsByMedium(allBaseSubjects, medium, mediums);
    }
    
    // Role based subject filter
    if ((user?.role === 'TEACHER' || user?.role === 'SUBJECT_EXPERT') && user.teachingSubjects && Array.isArray(user.teachingSubjects)) {
      allBaseSubjects = allBaseSubjects.filter((sub) => {
        const dbName = (sub.name || '').toUpperCase();
        return user.teachingSubjects.some((ts: string) => {
          const taught = ts.toUpperCase();
          if (taught === 'MATHS' && dbName.includes('MATHEMATICS')) return true;
          if (taught === 'ENGLISH' && dbName.includes('ENGLISH (SECOND')) return true;
          if (taught === 'HINDI' && (dbName.includes('HINDI (THIRD') || dbName.includes('ADDL. HINDI'))) return true;
          if (taught === 'SPECIAL ENGLISH' && dbName.includes('SPECIAL. ENGLISH')) return true;
          return dbName.includes(taught);
        });
      });
    }

    return allBaseSubjects.sort((a: any, b: any) => {
      // Sort by P-code (P01 to P10)
      const pCodeA = a.name.match(/P\d{2}/)?.[0] || 'Z99';
      const pCodeB = b.name.match(/P\d{2}/)?.[0] || 'Z99';
      return pCodeA.localeCompare(pCodeB) || a.name.localeCompare(b.name);
    });
  };

  const filteredSubjects = getFilteredSubjects();

  useEffect(() => {
    if (medium && className && subjectId) {
      apiClient.get('/chapters', { params: { medium, className, subjectId } })
        .then(res => setAvailableChapters(res.data))
        .catch(() => toast.error("Failed to load chapters"));
    }
  }, [medium, className, subjectId]);

  // Check for duplicates when content loses focus or changes significantly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.length > 20 && subjectId) {
        apiClient.post('/questions/detect-duplicate', {
          content, subjectId, className, medium, questionType, excludeId: initialData?.id
        }).then(res => {
          if (res.data.similarity > 70) {
            setDuplicateWarning(res.data);
          } else {
            setDuplicateWarning(null);
          }
        }).catch(err => {
          console.error('Duplicate check failed', err);
        });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, subjectId, className, medium, questionType]);

  const handleSubmit = async (status: string) => {
    const isContentEmpty = !content || content === '<p></p>' || content.trim() === '';
    let finalContent = content;
    
    if (questionType === 'MCI' && isContentEmpty) {
      finalContent = '<p>பொருத்துக / Match the following:</p>';
    }

    if (!finalContent || finalContent === '<p></p>' || finalContent.trim() === '' || !subjectId || !chapter) {
      return toast.error("Please fill in required fields (Subject, Chapter, Content)");
    }
    try {
      let optionsPayload: any = [];
      if (questionType === 'MCQ') {
        optionsPayload = mcqOptions.map((opt, idx) => ({ text: opt, isCorrect: idx === correctOption }));
      } else if (questionType === 'MCI') {
        optionsPayload = { columns: mciColumnCount, rows: mciRows };
      } else if (questionType === 'CR' && isInternalChoice) {
        optionsPayload = { isInternalChoice, orContent };
      }

      const payload = {
        content: finalContent,
        medium,
        className,
        subjectId,
        chapter,
        subUnit,
        questionType,
        marks: Number(marks),
        difficulty,
        status, // 'Draft' or 'Submitted'
        academicYear: '2026-27',
        options: optionsPayload,
        correctAnswer: questionType === 'MCQ' ? mcqOptions[correctOption] : undefined
      };
      
      if (initialData) {
        await apiClient.put(`/questions/${initialData.id}`, payload);
        toast.success('Question Updated Successfully');
      } else {
        await apiClient.post('/questions', payload);
        toast.success(status === 'Draft' ? 'Saved as Draft' : 'Question Submitted for Review');
        localStorage.removeItem(DRAFT_KEY);
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save question');
    }
  };

  const selectedChapterObj = availableChapters.find(c => c.chapterName === chapter);
  const availableSubUnits = selectedChapterObj?.subUnits || [];

  const modalContent = (
    <Modal isOpen={true} onClose={onClose} disableOutsideClick={true}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[95vh] flex flex-col shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">{initialData ? 'Edit Question' : 'Create New Question'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">


          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-4 gap-4 mb-4 border-b pb-4 dark:border-gray-700">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Medium</label>
                <Dropdown
                  className="w-full"
                  value={medium}
                  onChange={(v) => setMedium(v)}
                  options={MEDIUMS.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
                <Dropdown
                  className="w-full"
                  value={className}
                  onChange={(v) => setClassName(v)}
                  options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <Dropdown
                  className="w-full"
                  value={subjectId}
                  onChange={(v) => { setSubjectId(v); setChapter(''); setSubUnit(''); }}
                  placeholder="Select Subject"
                  options={filteredSubjects.map(s => ({ value: s._id || s.id, label: s.name }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit / Chapter</label>
                <Dropdown
                  className="w-full"
                  value={chapter}
                  onChange={(v) => { setChapter(v); setSubUnit(''); }}
                  placeholder="Select Chapter"
                  options={availableChapters.map(c => ({ value: c.chapterName, label: c.chapterName }))}
                />
              </div>

              {availableSubUnits.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sub Unit</label>
                  <Dropdown
                    className="w-full"
                    value={subUnit}
                    onChange={(v) => setSubUnit(v)}
                    placeholder="Select Sub Unit"
                    required
                    options={availableSubUnits.map((su: string) => ({ value: su, label: su }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Question Type</label>
                <Dropdown
                  className="w-full"
                  value={questionType}
                  onChange={(v) => setQuestionType(v)}
                  options={[
                    { value: 'MCQ', label: 'MCQ' },
                    { value: 'MCI', label: 'Match (MCI)' },
                    { value: 'CR', label: 'CR Items' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Marks</label>
                <input type="number" min="1" max="10" className="vz-select-bare w-full" value={marks} onChange={e => setMarks(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
                <Dropdown
                  className="w-full"
                  value={difficulty}
                  onChange={(v) => setDifficulty(v)}
                  options={[
                    { value: 'Easy', label: 'Easy' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Hard', label: 'Hard' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Content</label>
              {duplicateWarning ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4 mt-2">
                  <h3 className="text-sm font-bold text-red-800 dark:text-red-400 flex items-center gap-1"><AlertCircle size={16}/> High Similarity Detected!</h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1 mb-2">Similarity Score: {duplicateWarning.similarity}%</p>
                  <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-red-100 dark:border-red-900/50 max-h-32 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: duplicateWarning.duplicates[0]?.question.content }} />
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">Please ensure this is not a duplicate.</p>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 mb-4 mt-2">
                  <h3 className="text-sm font-bold text-green-800 dark:text-green-400 flex items-center gap-1"><AlertCircle size={16}/> Duplicate Check</h3>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">This question appears to be unique. No highly similar questions found in the repository.</p>
                </div>
              )}

              <div className="border dark:border-gray-600 rounded-md">
                <RichQuestionEditor content={content} onChange={setContent} />
              </div>

            </div>
            
            {questionType === 'MCQ' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options (Select the correct one)</label>
                <div className="grid grid-cols-2 gap-4">
                  {mcqOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <input 
                        type="radio" 
                        name="correctOption" 
                        checked={correctOption === idx} 
                        onChange={() => setCorrectOption(idx)}
                        className="mt-3 w-4 h-4 text-blue-600 shrink-0"
                      />
                      <div className="flex-1 border dark:border-gray-600 rounded-md">
                        <RichQuestionEditor 
                          content={opt} 
                          onChange={(val) => {
                            const newOpts = [...mcqOptions];
                            newOpts[idx] = val;
                            setMcqOptions(newOpts);
                          }} 
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`} 
                          editorMinHeight="min-h-[24px]"
                          minimal={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionType === 'MCI' && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Match Columns Configuration</label>
                  <Dropdown
                    value={String(mciColumnCount)}
                    onChange={(v) => setMciColumnCount(Number(v))}
                    options={[
                      { value: '2', label: '2 Columns' },
                      { value: '3', label: '3 Columns' },
                    ]}
                  />
                </div>
                
                <div className="space-y-3">
                  {mciRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 border dark:border-gray-600 rounded-md">
                        <RichQuestionEditor
                          content={row.col1}
                          onChange={(val) => {
                            const newRows = [...mciRows];
                            newRows[idx].col1 = val;
                            setMciRows(newRows);
                          }}
                          placeholder="Column 1"
                          editorMinHeight="min-h-[24px]"
                          minimal={true}
                        />
                      </div>
                      
                      <input 
                        type="text" 
                        maxLength={3}
                        className="w-12 text-center border rounded px-1 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={row.symbol1}
                        onChange={(e) => {
                          const newRows = [...mciRows];
                          const newSymbol = e.target.value.replace(/௰/g, ')');
                          newRows[idx].symbol1 = newSymbol;
                          // Auto-sync if first row
                          if (idx === 0) {
                            newRows.forEach(r => r.symbol1 = newSymbol);
                          }
                          setMciRows(newRows);
                        }}
                        title="Splitting Symbol"
                      />

                      <div className="flex-1 border dark:border-gray-600 rounded-md">
                        <RichQuestionEditor
                          content={row.col2}
                          onChange={(val) => {
                            const newRows = [...mciRows];
                            newRows[idx].col2 = val;
                            setMciRows(newRows);
                          }}
                          placeholder="Column 2"
                          editorMinHeight="min-h-[24px]"
                          minimal={true}
                        />
                      </div>

                      {mciColumnCount === 3 && (
                        <>
                          <input 
                            type="text" 
                            maxLength={3}
                            className="w-12 text-center border rounded px-1 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.symbol2}
                            onChange={(e) => {
                              const newRows = [...mciRows];
                              const newSymbol = e.target.value.replace(/௰/g, ')');
                              newRows[idx].symbol2 = newSymbol;
                              // Auto-sync if first row
                              if (idx === 0) {
                                newRows.forEach(r => r.symbol2 = newSymbol);
                              }
                              setMciRows(newRows);
                            }}
                            title="Splitting Symbol 2"
                          />
                          <div className="flex-1 border dark:border-gray-600 rounded-md">
                            <RichQuestionEditor
                              content={row.col3}
                              onChange={(val) => {
                                const newRows = [...mciRows];
                                newRows[idx].col3 = val;
                                setMciRows(newRows);
                              }}
                              placeholder="Column 3"
                              editorMinHeight="min-h-[24px]"
                              minimal={true}
                            />
                          </div>
                        </>
                      )}
                      
                      <button 
                        onClick={() => {
                          const newRows = [...mciRows];
                          newRows.splice(idx, 1);
                          setMciRows(newRows);
                        }}
                        className="text-red-500 hover:text-red-700 p-2 font-bold text-lg"
                        disabled={mciRows.length <= 1}
                        title="Remove Row"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setMciRows([...mciRows, { col1: '', symbol1: mciRows[0]?.symbol1 || '-', col2: '', symbol2: mciRows[0]?.symbol2 || '-', col3: '' }])} 
                    className="text-xs text-blue-600 font-medium mt-2"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
            )}
            
            </div>
                        <div className="flex items-center justify-end gap-4 pt-6 pb-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button 
                  onClick={() => handleSubmit('Draft')} 
                  className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 font-medium transition-colors shadow-sm"
                >
                  <Save size={18} className="text-gray-500 dark:text-gray-400" /> Save as Draft
                </button>
                <button 
                  onClick={() => handleSubmit('Submitted')} 
                  className="px-8 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-bold transition-all shadow-md hover:shadow-lg"
                >
                  <Send size={18} /> Submit for Review
                </button>
              </div>
          </div>
      </div>
    </Modal>
  );
  
  return modalContent;
}
