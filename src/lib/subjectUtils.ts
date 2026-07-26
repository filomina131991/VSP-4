

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

export const getSubjectShortLabel = (sub: { name?: string; shortName?: string }): string => {
  if (!sub) return 'Subject';
  const shortName = (sub.shortName || '').trim();
  if (shortName) return shortName;
  const formatted = formatSubjectName(sub.name || '');
  return formatted || sub.name || 'Subject';
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

export function filterSubjectsByMedium<T extends { mediumId?: string; medium?: string; mediumName?: string; name: string }>(
  subjects: T[],
  mediumInput: string,
  mediums: any[]
): T[] {
  if (!mediumInput) return subjects;

  const normSel = mediumInput.trim().toLowerCase();
  const selMedObj = (mediums || []).find((m: any) => 
    m.id === mediumInput || 
    m.shortName?.toLowerCase() === normSel || 
    m.code?.toLowerCase() === normSel || 
    m.name?.toLowerCase() === normSel
  );

  const targetMedId = selMedObj?.id;
  const targetShortName = selMedObj ? selMedObj.shortName.toLowerCase() : normSel;

  let reqSuffix = '';
  if (targetShortName === 'tamil') reqSuffix = 'TM';
  else if (targetShortName === 'english') reqSuffix = 'EM';
  else if (targetShortName === 'malayalam') reqSuffix = 'MM';
  else if (targetShortName === 'kannada') reqSuffix = 'KM';
  else if (targetShortName === 'urdu') reqSuffix = 'UR';
  else if (targetShortName === 'arabic') reqSuffix = 'AR';

  const allSuffixes = ['TM', 'EM', 'MM', 'KM', 'UR', 'AR', 'HI'];

  return subjects.filter(s => {
    if (s.mediumId && targetMedId && String(s.mediumId) === String(targetMedId)) return true;

    const sMedium = (s.medium || s.mediumName || '').trim().toLowerCase();
    if (sMedium) {
      if (sMedium === targetShortName || sMedium === reqSuffix.toLowerCase()) return true;
      if (targetShortName === 'tamil' && (sMedium === 'tm' || sMedium.includes('tamil'))) return true;
      if (targetShortName === 'english' && (sMedium === 'em' || sMedium.includes('english'))) return true;
      if (targetShortName === 'malayalam' && (sMedium === 'mm' || sMedium.includes('malayalam'))) return true;
      if (targetShortName === 'kannada' && (sMedium === 'km' || sMedium.includes('kannada'))) return true;
      if (targetShortName === 'urdu' && (sMedium === 'ur' || sMedium.includes('urdu'))) return true;
      if (targetShortName === 'arabic' && (sMedium === 'ar' || sMedium.includes('arabic'))) return true;
      return false;
    }

    const nameUpper = (s.name || '').trim().toUpperCase();
    const endingSuffix = allSuffixes.find(suf => nameUpper.endsWith(' ' + suf) || nameUpper.endsWith('-' + suf));
    if (endingSuffix) {
      return reqSuffix ? (nameUpper.endsWith(' ' + reqSuffix) || nameUpper.endsWith('-' + reqSuffix)) : true;
    }

    return true;
  });
}
