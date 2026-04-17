/**
 * lib/mockQuestions.ts
 *
 * Dynamically pulls random questions from the 23 topic JSONs
 * (same data used in practice page) instead of hardcoded dummies.
 *
 * Section 1 & 2: 20 questions each, drawn randomly across all topics.
 * Images are preserved exactly as in practice page.
 */

import { getTopicQuestions } from './registry/registry';
import { TOPIC_REGISTRY }    from './registry/registry';
import type { UnifiedQuestion } from './adapter/adapter';

export const MOCK_SECTION_SIZE = 20;
export const MOCK_SECTION_TIME = 35 * 60; // 35 minutes in seconds

// ── Seeded shuffle (Fisher-Yates) ─────────────────────────────────────────────
// We use Date.now() as seed so every call gives a different order.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Pull questions from all 23 topics ─────────────────────────────────────────

function getAllMainQuestions(): UnifiedQuestion[] {
  const all: UnifiedQuestion[] = [];
  for (const topic of TOPIC_REGISTRY) {
    const qs = getTopicQuestions(topic.id);
    // Only main questions (not similar), with valid answer
    const valid = qs.filter(q => q.answer !== undefined && q.answer !== null && q.answer !== '');
    all.push(...valid);
  }
  return all;
}

// ── Generate two non-overlapping sections of 20 each ─────────────────────────

function generateSections(): [UnifiedQuestion[], UnifiedQuestion[]] {
  const all      = shuffle(getAllMainQuestions());
  const section1 = all.slice(0, MOCK_SECTION_SIZE);
  const section2 = all.slice(MOCK_SECTION_SIZE, MOCK_SECTION_SIZE * 2);

  // Fallback: if not enough questions, wrap around (should never happen with 23 topics)
  if (section1.length < MOCK_SECTION_SIZE || section2.length < MOCK_SECTION_SIZE) {
    const doubled = shuffle([...all, ...all]);
    return [doubled.slice(0, MOCK_SECTION_SIZE), doubled.slice(MOCK_SECTION_SIZE, MOCK_SECTION_SIZE * 2)];
  }

  return [section1, section2];
}

// ── Exported sections ─────────────────────────────────────────────────────────
// Generated once per page load — fresh random set each time.

const [_s1, _s2] = generateSections();

export const MOCK_SECTION_1: UnifiedQuestion[] = _s1;
export const MOCK_SECTION_2: UnifiedQuestion[] = _s2;
export const ALL_MOCK_QUESTIONS: UnifiedQuestion[] = [..._s1, ..._s2];