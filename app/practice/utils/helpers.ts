import type { UnifiedQuestion } from "../../lib/adapter/adapter"

export const ALPHA = ['A', 'B', 'C', 'D', 'E'];

export function truncate(s: string, n = 60) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

export function isAnswerCorrect(
  q: UnifiedQuestion,
  userAns: string | string[],
): boolean {
  if (Array.isArray(q.answer)) {
    if (!Array.isArray(userAns)) return false;
    const correct = [...q.answer].sort();
    const given   = [...userAns].sort();
    return correct.length === given.length && correct.every((v, i) => v === given[i]);
  }
  
  const normalize = (s: string) => 
    String(s).replace(/[–—−]/g, '-').trim().toLowerCase();
  
  const answerStr = Array.isArray(userAns) ? '' : userAns;
  return normalize(q.answer) === normalize(answerStr);
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, '[formula]')
    .replace(/\$([^$]+)\$/g, (_, inner) =>
      inner
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}_^\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
}

export function qTypeLabel(t: UnifiedQuestion['type']) {
  if (t === 'quantitative_comparison') return 'QC';
  if (t === 'multiple_choice')         return 'MC';
  if (t === 'numeric_entry')           return 'NE';
  return 'SA';
}