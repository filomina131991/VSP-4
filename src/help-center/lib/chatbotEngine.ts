import { QnAItem, ErrorRecord, ChatMessage } from '../types';
import { QNA_DATABASE } from '../data/qnaData';

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function computeSimilarity(query: string, target: string): number {
  const qTokens = tokenize(query);
  const tTokens = tokenize(target);
  if (qTokens.length === 0 || tTokens.length === 0) return 0;
  const matches = qTokens.filter(t => tTokens.some(tt => tt.includes(t) || t.includes(tt)));
  return matches.length / Math.max(qTokens.length, tTokens.length);
}

function findBestQnAMatch(query: string): { item: QnAItem; score: number } | null {
  const normalizedQuery = normalize(query);
  let bestScore = 0;
  let bestItem: QnAItem | null = null;

  for (const qna of QNA_DATABASE) {
    const keywords = qna.keywords.map(normalize);
    const keywordScore = keywords.some(kw => normalizedQuery.includes(kw) || kw.includes(normalizedQuery)) ? 0.8 : 0;

    const questionScore = computeSimilarity(query, qna.question);
    const answerScore = computeSimilarity(query, qna.answer);

    const score = Math.max(keywordScore, questionScore, answerScore);

    if (score > bestScore) {
      bestScore = score;
      bestItem = qna;
    }
  }

  return bestItem && bestScore > 0.3 ? { item: bestItem, score: bestScore } : null;
}

function findBestErrorMatch(query: string, errors: ErrorRecord[]): { item: ErrorRecord; score: number } | null {
  const normalizedQuery = normalize(query);
  let bestScore = 0;
  let bestItem: ErrorRecord | null = null;

  for (const err of errors) {
    const titleScore = computeSimilarity(query, err.title);
    const idScore = normalize(err.id).includes(normalizedQuery) || normalizedQuery.includes(normalize(err.id)) ? 0.9 : 0;
    const keywordScore = err.keywords.some(kw => normalize(kw).includes(normalizedQuery) || normalizedQuery.includes(normalize(kw))) ? 0.85 : 0;
    const symptomScore = err.symptoms.some(s => computeSimilarity(query, s) > 0.4) ? 0.6 : 0;

    const score = Math.max(titleScore, idScore, keywordScore, symptomScore);

    if (score > bestScore) {
      bestScore = score;
      bestItem = err;
    }
  }

  return bestItem && bestScore > 0.4 ? { item: bestItem, score: bestScore } : null;
}

export function processQuery(
  query: string,
  errors: ErrorRecord[]
): ChatMessage {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: 'Please type your question or error name. For example: "How to add student?" or "Medium Validation Error"',
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        { label: 'How to add student?', action: 'add_student' },
        { label: 'Medium Issue', action: 'medium_issue' },
        { label: 'Language Error', action: 'language_validation' },
        { label: 'Login Issue', action: 'login_issue' }
      ]
    };
  }

  const qnaMatch = findBestQnAMatch(query);
  const errorMatch = findBestErrorMatch(query, errors);

  const threshold = 0.3;
  let selectedQnA = qnaMatch && qnaMatch.score > threshold ? qnaMatch.item : null;
  let selectedError = errorMatch && (!selectedQnA || errorMatch.score > qnaMatch!.score) ? errorMatch.item : null;

  if (selectedQnA) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: selectedQnA.answer,
      steps: selectedQnA.steps,
      matchedQnA: selectedQnA,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: []
    };
  }

  if (selectedError) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: `Found: ${selectedError.title}`,
      steps: selectedError.solution,
      matchedError: selectedError,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: []
    };
  }

  const categoryGuesses: { keyword: string; label: string; suggest: string }[] = [
    { keyword: 'student', label: 'Student Management', suggest: 'How to add student?' },
    { keyword: 'teacher', label: 'Teacher Management', suggest: 'How to add teacher?' },
    { keyword: 'medium', label: 'Medium Issue', suggest: 'Medium Validation Error' },
    { keyword: 'language', label: 'Language Validation', suggest: 'Language Validation Error' },
    { keyword: 'paper', label: 'Paper Mismatch', suggest: 'Paper I Missing' },
    { keyword: 'subject', label: 'Subject Assignment', suggest: 'Teacher Subject Missing' },
    { keyword: 'marks', label: 'Marks Entry', suggest: 'Marks Entry Not Working' },
    { keyword: 'exam', label: 'Exam Config', suggest: 'Exam Configuration Missing' },
    { keyword: 'login', label: 'Login Issue', suggest: 'Login Issues' },
    { keyword: 'password', label: 'Password Reset', suggest: 'How to Reset Password?' },
    { keyword: 'report', label: 'Reports', suggest: 'How to Generate Report?' },
    { keyword: 'sync', label: 'Sync Issue', suggest: 'Sync Error' },
    { keyword: 'confirm', label: 'Final Confirmation', suggest: 'Final Confirmation Disabled' },
    { keyword: 'profile', label: 'Teacher Profile', suggest: 'Teacher Profile Incomplete' },
    { keyword: 'ict', label: 'ICT Option', suggest: 'ICT Option Missing' },
    { keyword: 'dashboard', label: 'Dashboard', suggest: 'Dashboard Count Wrong' },
    { keyword: 'sampoorna', label: 'Sampoorna Sync', suggest: 'Student Count Mismatch' }
  ];

  const matchedCats = categoryGuesses.filter(c => normalizedQuery.includes(c.keyword));

  if (matchedCats.length > 0) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: `I found topics related to "${matchedCats[0].label}". Please try one of these questions:`,
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: matchedCats.slice(0, 3).map(c => ({
        label: c.suggest,
        action: c.keyword
      }))
    };
  }

  return {
    id: `msg-${Date.now()}`,
    sender: 'bot',
    text: `I searched our help database for "${query}" but could not find an exact match. Please try:`,
    steps: [],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: [
      { label: 'How to add student?', action: 'add_student' },
      { label: 'Medium Issue', action: 'medium_issue' },
      { label: 'Language Error', action: 'language_validation' },
      { label: 'Login Issue', action: 'login_issue' },
      { label: 'Create a Support Ticket', link: '/help/tickets' }
    ]
  };
}
