

export const formatSubjectName = (name: string, shortCode?: string) => {
  const upper = (name || '').toUpperCase();
  let result = name;
  
  if (upper.includes('TAMIL AT')) result = 'TAM-AT';
  else if (upper.includes('TAMIL BT')) result = 'TAM-BT';
  else if (upper.includes('MALAYALAM AT')) result = 'MAL-AT';
  else if (upper.includes('MALAYALAM BT')) result = 'MAL-BT';
  else if (upper.includes('ARABIC')) {
    if (upper.includes('(A)')) result = 'ARABIC (A)';
    else if (upper.includes('(O)')) result = 'ARABIC (O)';
    else result = 'ARABIC';
  }
  else if (upper.includes('URDU')) result = 'URDU';
  else if (upper.includes('SANSKRIT')) {
    if (upper.includes('SPL') || upper.includes('SPECIAL')) result = 'SANSKRIT (S)';
    else if (upper.includes('(O)')) result = 'SANSKRIT (O)';
    else result = 'SANSKRIT';
  }
  else if (upper.includes('ENGLISH')) {
    if (upper.includes('SPL') || upper.includes('SPECIAL')) result = 'ENG (S)';
    else result = 'ENG';
  }
  else if (upper.includes('HINDI')) {
    if (upper.includes('ADDL') || upper.includes('ADDITIONAL')) result = 'HINDI (A)';
    else result = 'HINDI';
  }
  else if (upper.includes('SOCIAL SCIENCE')) result = 'SOCIAL';
  else if (upper.includes('PHYSICS')) result = 'PHYSICS';
  else if (upper.includes('CHEMISTRY')) result = 'CHEMISTRY';
  else if (upper.includes('BIOLOGY')) result = 'BIOLOGY';
  else if (upper.includes('MATHEMATICS') || upper.includes('MATHS')) result = 'MATHS';
  else if (upper.includes('INFORMATION TECHNOLOGY') || upper.includes('IT') || upper.includes('ICT')) result = 'ICT';
  
  if (shortCode && !result.includes(shortCode)) {
    return `${result} - ${shortCode}`;
  }
  
  return result;
};

export const getSubjectPCode = (sub: any): string => {
  if (!sub) return '';
  const str = String(sub.pCode || sub.code || sub.shortCode || sub.paperType || sub.shortName || sub.name || sub.subjectName || '').toUpperCase();
  const match = str.match(/\bP(0?[1-9]|10)\b/) || str.match(/P(0?[1-9]|10)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) {
      return num <= 9 ? `P0${num}` : `P${num}`;
    }
  }
  
  const nameStr = String(sub.name || sub.subjectName || sub.shortName || '').toUpperCase().trim();
  const cat = String(sub.category || '').toUpperCase();
  
  if (nameStr.includes('PAPER I') || nameStr.includes(' AT') || nameStr.includes('LAN I') || nameStr.includes('FIRST LANG') || nameStr === 'TAMIL AT' || nameStr === 'MALAYALAM AT' || nameStr.includes('ARABIC (A)') || nameStr.includes('SANSKRIT (A)') || cat === 'FIRST_LANGUAGE') return 'P01';
  if (nameStr.includes('PAPER II') || nameStr.includes(' BT') || nameStr.includes('LAN II') || nameStr.includes('SPECIAL ENGLISH') || nameStr.includes('SPECIAL HINDI') || nameStr.includes('ARABIC (O)') || nameStr.includes('SANSKRIT (O)') || nameStr.includes('OPTIONAL')) return 'P02';
  if (nameStr === 'ENGLISH' || nameStr.includes('SECOND LANG') || nameStr === 'ENG' || cat === 'SECOND_LANGUAGE') return 'P03';
  if (nameStr === 'HINDI' || nameStr.includes('THIRD LANG') || nameStr === 'HIN' || nameStr.includes('GENERAL KNOWLEDGE') || nameStr === 'GK' || cat === 'THIRD_LANGUAGE') return 'P04';
  if (nameStr.includes('SOCIAL') || nameStr === 'SS' || nameStr === 'SOC') return 'P05';
  if (nameStr.includes('PHYSIC') || nameStr === 'PHY') return 'P06';
  if (nameStr.includes('CHEMIS') || nameStr === 'CHE') return 'P07';
  if (nameStr.includes('BIOLOG') || nameStr === 'BIO' || nameStr.includes('NATURAL')) return 'P08';
  if (nameStr.includes('MATH') || nameStr === 'MAT' || nameStr.includes('GANITHAM')) return 'P09';
  if (nameStr.includes('INFO') || nameStr === 'ICT' || nameStr === 'IT' || nameStr.includes('COMPUTER')) return 'P10';
  
  return '';
};

export const getSubjectShortLabel = (sub: any): string => {
  if (!sub) return 'Subject';
  const shortName = (sub.shortName || '').trim();
  if (shortName) return shortName;
  const formatted = formatSubjectName(sub.name || sub.subjectName || '', getSubjectPCode(sub));
  if (formatted) return formatted;
  const pCode = getSubjectPCode(sub);
  if (pCode) return pCode;
  return sub.name || sub.subjectName || 'Subject';
};

export const getCleanSubjectName = (name: string, shortCode?: string): string => {
  let cleanName = name || '';
  const isPaper2 = shortCode === 'P02';
  
  // Remove Paper suffixes like - P01, - P02, - P03 etc at the end
  cleanName = cleanName.replace(/\s*-\s*P\d+\s*$/i, '');
  
  // Remove prefixes
  cleanName = cleanName.replace(/^FIRST LANGUAGE \(PAPER I\)\s*/i, '');
  cleanName = cleanName.replace(/^FIRST LANGUAGE \(PAPER II\)\s*/i, '');
  cleanName = cleanName.replace(/^ENGLISH \(SECOND LANGUAGE\)\s*/i, '');
  cleanName = cleanName.replace(/^HINDI \(THIRD LANGUAGE\)\s*/i, '');
  
  // Remove parenthetical guides
  cleanName = cleanName.replace(/\(SECOND LANGUAGE\)/i, '');
  cleanName = cleanName.replace(/\(THIRD LANGUAGE\)/i, '');
  cleanName = cleanName.replace(/\(PAPER I\)/i, '');
  cleanName = cleanName.replace(/\(PAPER II\)/i, '');
  
  // Clean extra spaces
  cleanName = cleanName.replace(/\s+/g, ' ').trim();
  
  // Map specific ones to standard clean strings
  const upper = cleanName.toUpperCase();
  if (upper.includes('TAMIL AT')) return 'Tamil AT';
  if (upper.includes('TAMIL BT')) return 'Tamil BT';
  if (upper.includes('MALAYALAM AT')) return 'Malayalam AT';
  if (upper.includes('MALAYALAM BT')) return 'Malayalam BT';
  if (upper.includes('ADDL. ENGLISH') || upper.includes('ADDITIONAL ENGLISH')) return 'Additional English';
  if (upper.includes('ADDL. HINDI') || upper.includes('ADDITIONAL HINDI')) return 'Additional Hindi';
  if (upper.includes('SPECIAL. ENGLISH') || upper.includes('SPECIAL ENGLISH')) return 'Special English';
  if (upper.includes('SPECIAL. HINDI') || upper.includes('SPECIAL HINDI')) return 'Special Hindi';
  if (upper.includes('ARABIC')) {
    if (upper.includes('OPTIONAL') || isPaper2) return 'Arabic Optional';
    return 'Arabic';
  }
  if (upper.includes('URDU')) return 'Urdu';
  if (upper.includes('SANSKRIT')) {
    if (upper.includes('OPTIONAL') || isPaper2) return 'Sanskrit Optional';
    return 'Sanskrit';
  }
  if (upper.includes('ENGLISH')) return 'English';
  if (upper.includes('HINDI')) return 'Hindi';
  if (upper.includes('SOCIAL SCIENCE')) return 'Social Science';
  if (upper.includes('PHYSICS')) return 'Physics';
  if (upper.includes('CHEMISTRY')) return 'Chemistry';
  if (upper.includes('BIOLOGY')) return 'Biology';
  if (upper.includes('MATHEMATICS') || upper.includes('MATHS')) return 'Mathematics';
  if (upper.includes('INFORMATION TECHNOLOGY') || upper.includes('IT') || upper.includes('ICT')) return 'ICT';
  
  // fallback title case
  return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

import { resolveMedium } from './mediumUtils';

/**
 * Sort subjects strictly by paper code (P01, P02... P10) first.
 * If paper codes are equal or absent, sort by displayOrder or name.
 * Never sort randomly!
 */
export function sortSubjects<T = any>(list: T[]): T[];
export function sortSubjects<T = any>(a: T, b: T): number;
export function sortSubjects(a: any, b?: any): any {
  if (Array.isArray(a)) {
    return [...a].sort((x, y) => sortSubjects(x, y));
  }
  if (!b) return 0;
  
  const codeA = getSubjectPCode(a);
  const codeB = getSubjectPCode(b);
  
  const getCodeNum = (code: string) => {
    if (!code) return 999;
    const m = code.match(/\d+/);
    return m ? parseInt(m[0], 10) : 999;
  };

  const numA = getCodeNum(codeA);
  const numB = getCodeNum(codeB);
  if (numA !== numB) {
    return numA - numB;
  }
  
  const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : 0;
  const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : 0;
  if (orderA !== orderB && orderA > 0 && orderB > 0) {
    return orderA - orderB;
  }

  const nameA = String(a.shortName || a.name || a.subjectName || '').toUpperCase();
  const nameB = String(b.shortName || b.name || b.subjectName || '').toUpperCase();
  return nameA.localeCompare(nameB);
}

export function filterSubjectsByMedium<T extends { mediumId?: string; medium?: string; mediumName?: string; name: string }>(
  subjects: T[],
  mediumInput: string,
  mediums: any[]
): T[] {
  if (!mediumInput) return subjects;
  const selMedObj = resolveMedium(mediumInput, mediums);
  if (!selMedObj) return subjects;

  return subjects.filter(s => {
    // 1. Direct mediumId match (the new standard)
    if (s.mediumId && String(s.mediumId) === String(selMedObj.id)) return true;
    // 2. Legacy fallback during migration: match against medium ID or code or shortName exactly
    const sMed = (s.medium || s.mediumName || '').trim();
    if (sMed && (sMed === selMedObj.id || sMed.toUpperCase() === selMedObj.code.toUpperCase() || sMed.toLowerCase() === selMedObj.shortName.toLowerCase() || sMed.toLowerCase() === selMedObj.name.toLowerCase())) {
      return true;
    }
    // If subject has NO medium defined at all (e.g. common paper or unassigned), allow it
    if (!s.mediumId && !sMed) return true;
    return false;
  });
}

