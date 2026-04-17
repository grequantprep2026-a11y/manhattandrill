/**
 * adapter.ts
 * Normalises every question shape (QC, MC, numeric_entry, select_all)
 * into a single UnifiedQuestion that the practice page can render.
 *
 * ADDED: isSimilar, parentId, similarLabel, source, chapter
 * for similar-question drilldown feature. All existing fields preserved.
 */

export type QuestionType =
  | 'quantitative_comparison'
  | 'multiple_choice'
  | 'numeric_entry'
  | 'select_all';

export interface UnifiedQuestion {
  id: string;
  number: number;
  topicId: string;
  type: QuestionType;

  // Text shown above options / above quantities
  text?: string;

  // Extra context block (shown in a tinted box above the question)
  context?: string;

  // Quantitative-comparison fields
  quantityA?: string;
  quantityB?: string;

  // Multiple-choice: ordered array of choice labels e.g. ["6π + 12", "6π + 6", ...]
  options?: string[];           // for MC / select_all
  optionKeys?: string[];        // original keys: ["A","B","C","D","E"]

  // Answers ---------------------------------------------------
  // QC:           "A" | "B" | "C" | "D"
  // MC:           "A" | "B" | …
  // numeric:      string  (exact value)
  // select_all:   string[] (subset of options)
  answer: string | string[];

  explanation: string;

  // Optional image path
  image?: string;

  // ── Similar-question fields ────────────────────────────────────────────────
  // isSimilar: true → practice-only, NOT counted in topic score
  isSimilar?: boolean;
  // parentId: id of the main question this belongs to
  parentId?: string;
  // similarLabel: raw label from JSON e.g. "1s1", "1s2"
  similarLabel?: string;
  // source / chapter: for attribution block shown below question
  source?: string;
  chapter?: number | string;
}

// ─── Raw shapes ──────────────────────────────────────────────────────────────

interface RawQC {
  id: string; number: number | string; type: 'quantitative_comparison';
  context?: string; quantity_a: string; quantity_b: string;
  answer: string; explanation: string; image?: string;
}
interface RawMC {
  id: string; number: number | string; type: 'multiple_choice';
  text: string; context?: string;
  options: Record<string, string>; answer: string; explanation: string; image?: string;
}
interface RawNumeric {
  id: string; number: number | string; type: 'numeric_entry';
  text: string; context?: string;
  answer: string | number; explanation: string; image?: string;
}
interface RawSelectAll {
  id: string; number: number | string; type: 'select_all';
  text: string; context?: string;
  options: string[]; answer: string[]; explanation: string; image?: string;
}

export type RawQuestion = RawQC | RawMC | RawNumeric | RawSelectAll;

// ─── Converter ───────────────────────────────────────────────────────────────

export function adaptQuestion(
  raw: RawQuestion,
  topicId: string,
  extra?: {
    isSimilar?: boolean;
    parentId?: string;
    similarLabel?: string;
    source?: string;
    chapter?: number | string;
  },
): UnifiedQuestion {
  const base = {
    id:           raw.id,
    number:       Number(raw.number),
    topicId,
    explanation:  raw.explanation,
    isSimilar:    extra?.isSimilar,
    parentId:     extra?.parentId,
    similarLabel: extra?.similarLabel,
    source:       extra?.source,
    chapter:      extra?.chapter,
  };

  switch (raw.type) {
    case 'quantitative_comparison':
      return {
        ...base, type: 'quantitative_comparison',
        context:   raw.context,
        quantityA: raw.quantity_a,
        quantityB: raw.quantity_b,
        answer:    raw.answer,
        image:     raw.image,
      };

    case 'multiple_choice': {
      const keys   = Object.keys(raw.options);
      const values = keys.map(k => raw.options[k]);
      return {
        ...base, type: 'multiple_choice',
        text: raw.text, context: raw.context,
        optionKeys: keys, options: values,
        answer: raw.answer,
        image:  raw.image,
      };
    }

    case 'numeric_entry':
      return {
        ...base, type: 'numeric_entry',
        text:    raw.text,
        context: raw.context,
        answer:  String(raw.answer),
        image:   raw.image,
      };

    case 'select_all':
      return {
        ...base, type: 'select_all',
        text:    raw.text,
        context: raw.context,
        options: raw.options,
        answer:  raw.answer,
        image:   raw.image,
      };
  }
}

// ─── Topic loader ─────────────────────────────────────────────────────────────

export interface RawTopic {
  topic?:    string;
  source?:   string;
  chapter?:  number | string;
  questions: RawQuestion[];
  chapters?: { chapter: number; topic: string; questions: RawQuestion[] }[];
}

export function flattenTopic(
  raw: RawTopic,
  topicId: string,
  source?: string,
  chapter?: number | string,
): UnifiedQuestion[] {
  const extra = { source, chapter };
  // Algebra uses chapters[] wrapper
  if (raw.chapters) {
    return raw.chapters.flatMap(ch =>
      (ch.questions as RawQuestion[]).map(q => adaptQuestion(q, topicId, extra))
    );
  }
  return (raw.questions as RawQuestion[]).map(q => adaptQuestion(q, topicId, extra));
}

// ─── Similar-question helpers ─────────────────────────────────────────────────

/**
 * Given a raw question object that may have a similar_questions array,
 * return its adapted similar questions as UnifiedQuestion[].
 * Returns [] if the question has no similar_questions.
 */
export function adaptSimilarQuestions(
  parentRaw: RawQuestion & { similar_questions?: any[] },
  topicId: string,
  source?: string,
  chapter?: number | string,
): UnifiedQuestion[] {
  if (!parentRaw.similar_questions || parentRaw.similar_questions.length === 0) return [];
  return parentRaw.similar_questions.map((sq: any) =>
    adaptQuestion(sq as RawQuestion, topicId, {
      isSimilar:    true,
      parentId:     parentRaw.id,
      similarLabel: String(sq.number ?? ''),
      source,
      chapter,
    }),
  );
}