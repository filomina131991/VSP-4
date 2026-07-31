import { ErrorRecord } from '../types';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  malayalamText?: string;
  matchedError?: ErrorRecord;
  suggestedAction?: {
    label: string;
    link: string;
  };
  timestamp: string;
}

export function processAiUserQuery(
  query: string,
  errors: ErrorRecord[]
): AiChatMessage {
  const lowerQuery = query.toLowerCase().trim();

  // 1. Direct or Fuzzy match against Error Library
  const matchedError = errors.find(err => {
    if (err.title.toLowerCase().includes(lowerQuery)) return true;
    if (err.id.toLowerCase().includes(lowerQuery)) return true;
    return err.keywords.some(kw => lowerQuery.includes(kw.toLowerCase()) || kw.toLowerCase().includes(lowerQuery));
  });

  if (matchedError) {
    const stepsFormatted = matchedError.solution.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
    const mlStepsFormatted = matchedError.malayalamSolution ? matchedError.malayalamSolution.map((step, idx) => `${idx + 1}. ${step}`).join('\n') : '';

    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `🔍 **${matchedError.title}** Found in Vijayasree Local Database!

**Symptoms:**
${matchedError.symptoms.map(s => `• ${s}`).join('\n')}

**Possible Causes:**
${matchedError.causes.map(c => `• ${c}`).join('\n')}

**Recommended Step-by-Step Fix:**
${stepsFormatted}`,
      malayalamText: mlStepsFormatted ? `**മലയാളത്തിൽ ലളിതമായ പരിഹാരം:**\n${mlStepsFormatted}` : undefined,
      matchedError,
      suggestedAction: {
        label: `Open Full Fix Guide for ${matchedError.title}`,
        link: `/help/errors/${matchedError.id}`
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // 2. Intelligent Category Fallbacks
  if (lowerQuery.includes('language') || lowerQuery.includes('paper') || lowerQuery.includes('മലയാളം')) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `It looks like you are asking about **Language Allocation or Paper Mismatch**.

Please verify:
1. Student First Language Paper 1 (e.g. Malayalam AT) and Paper 2 (Malayalam BT) match.
2. In Student Management, run the 'Bulk Language Align' tool.
3. Check Dashboard validation indicators.`,
      malayalamText: `കുട്ടിയുടെ പേപ്പർ 1, പേപ്പർ 2 സ്ട്രീമുകൾ ഒന്നാണെന്ന് Student Management-ൽ ഉറപ്പ് വരുത്തുക.`,
      suggestedAction: {
        label: 'View Language Validation Fix',
        link: '/help/errors/language-validation'
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  if (lowerQuery.includes('medium') || lowerQuery.includes('മാധ്യമം')) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `It looks like you are asking about **Medium Selection or Missing Medium dropdown**.

Please verify:
1. Open School Profile -> Medium Configuration.
2. Check Malayalam / English as Active Mediums.
3. Run Bulk Update Medium for affected divisions.`,
      suggestedAction: {
        label: 'View Medium Missing Resolution',
        link: '/help/errors/medium-missing'
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // Generic fallback
  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    text: `I searched our offline database for "${query}".

Here are quick actions you can take:
1. Try searching with keywords like **"language"**, **"medium"**, **"subject"**, **"teacher"**, or **"final confirmation"**.
2. Run the Interactive Troubleshooting Wizard.
3. Contact DEO Support Desk directly via the Support Ticket tab.`,
    suggestedAction: {
      label: 'Launch Troubleshooting Wizard',
      link: '/help/wizard'
    },
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
