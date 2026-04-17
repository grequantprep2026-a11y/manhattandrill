// lib/registry/registry.ts
// All original topic imports and registry preserved.
// ADDED: getSimilarQuestions(), getAllSimilarQuestions()
// Source string added to TOPIC_REGISTRY entries for attribution.

import { Algebra }                    from '../questions/Algebra';
import { Arithmetic }                 from '../questions/Arithmetic';
import { inequalities }               from '../questions/inequalities';
import { Functions }                  from '../questions/functions';
import { fractions_decimals }         from '../questions/fractions_decimals';
import { Percents }                   from '../questions/percents';
import { Averages }                   from '../questions/averages';
import { Ratios }                     from '../questions/ratios';
import { Triangles }                  from '../questions/triangles';
import { Circles }                    from '../questions/circles';
import { CoordinateGeometry }         from '../questions/coordinate_geometry';
import { DataInterpretation }         from '../questions/data_interpretation';
import { DivisibilityPrimes }         from '../questions/divisibility_primes';
import { exponents_roots }            from '../questions/exponents_roots';
import { MixedGeometry }              from '../questions/mixed_geometry';
import { NumberProperties }           from '../questions/number_properties';
import { Polygons }                   from '../questions/polygons';
import { Probability }                from '../questions/probability';
import { RatesWork }                  from '../questions/rates_work';
import { StandardDeviation }          from '../questions/standard_deviation';
import { TwoVariableWordProblems }    from '../questions/two_variable_word_problems';
import { VariablesInChoices }         from '../questions/variables_in_choices';
import { WordProblems }               from '../questions/word_problems';

import { flattenTopic, adaptSimilarQuestions, type UnifiedQuestion, type RawTopic, type RawQuestion } from '../adapter/adapter';

const SOURCE = 'Manhattan Prep – 5 lb. Book of GRE Practice Problems';

export interface TopicMeta {
  id:      string;
  label:   string;
  chapter: number;
  source:  string;
}

export const TOPIC_REGISTRY: TopicMeta[] = [
  { id: 'arithmetic',                 label: 'Arithmetic',                                         chapter: 7,  source: SOURCE },
  { id: 'algebra',                    label: 'Algebra',                                            chapter: 8,  source: SOURCE },
  { id: 'inequalities',               label: 'Inequalities and Absolute Values',                   chapter: 9,  source: SOURCE },
  { id: 'functions',                  label: 'Functions, Sequences, and Custom Operators',         chapter: 10, source: SOURCE },
  { id: 'fractions_decimals',         label: 'Fractions and Decimals',                             chapter: 11, source: SOURCE },
  { id: 'percents',                   label: 'Percents',                                           chapter: 12, source: SOURCE },
  { id: 'divisibility_primes',        label: 'Divisibility and Primes',                            chapter: 13, source: SOURCE },
  { id: 'exponents_roots',            label: 'Exponents and Roots',                                chapter: 14, source: SOURCE },
  { id: 'number_properties',          label: 'Number Properties',                                  chapter: 15, source: SOURCE },
  { id: 'word_problems',              label: 'Word Problems',                                      chapter: 16, source: SOURCE },
  { id: 'two_variable_word_problems', label: 'Two-Variable Word Problems',                         chapter: 17, source: SOURCE },
  { id: 'rates_work',                 label: 'Rates and Work',                                     chapter: 18, source: SOURCE },
  { id: 'variables_in_choices',       label: 'Variables-in-the-Choices Problems',                  chapter: 19, source: SOURCE },
  { id: 'ratios',                     label: 'Ratios',                                             chapter: 20, source: SOURCE },
  { id: 'averages',                   label: 'Averages, Weighted Average, Median & Mode',          chapter: 21, source: SOURCE },
  { id: 'standard_deviation',         label: 'Standard Deviation and Normal Distribution',         chapter: 22, source: SOURCE },
  { id: 'probability',                label: 'Probability, Combinatorics, and Overlapping Sets',   chapter: 23, source: SOURCE },
  { id: 'data_interpretation',        label: 'Data Interpretation',                                chapter: 24, source: SOURCE },
  { id: 'polygons',                   label: 'Polygons',                                           chapter: 25, source: SOURCE },
  { id: 'circles',                    label: 'Circles and Cylinders',                              chapter: 26, source: SOURCE },
  { id: 'triangles',                  label: 'Triangles',                                          chapter: 27, source: SOURCE },
  { id: 'coordinate_geometry',        label: 'Coordinate Geometry',                                chapter: 28, source: SOURCE },
  { id: 'mixed_geometry',             label: 'Mixed Geometry',                                     chapter: 29, source: SOURCE },
];
const RAW_MAP: Record<string, RawTopic> = {
  arithmetic:                 Arithmetic                as unknown as RawTopic,
  algebra:                    Algebra                   as unknown as RawTopic,
  inequalities:               inequalities              as unknown as RawTopic,
  functions:                  Functions                 as unknown as RawTopic,
  fractions_decimals:         fractions_decimals        as unknown as RawTopic,
  polygons:                   Polygons                  as unknown as RawTopic,
  percents:                   Percents                  as unknown as RawTopic,
  divisibility_primes:        DivisibilityPrimes        as unknown as RawTopic,
  exponents_roots:            exponents_roots           as unknown as RawTopic,
  number_properties:          NumberProperties          as unknown as RawTopic,
  word_problems:              WordProblems              as unknown as RawTopic,
  two_variable_word_problems: TwoVariableWordProblems   as unknown as RawTopic,
  rates_work:                 RatesWork                 as unknown as RawTopic,
  variables_in_choices:       VariablesInChoices        as unknown as RawTopic,
  ratios:                     Ratios                    as unknown as RawTopic,
  averages:                   Averages                  as unknown as RawTopic,
  standard_deviation:         StandardDeviation         as unknown as RawTopic,
  probability:                Probability               as unknown as RawTopic,
  data_interpretation:        DataInterpretation        as unknown as RawTopic,
  circles:                    Circles                   as unknown as RawTopic,
  triangles:                  Triangles                 as unknown as RawTopic,
  coordinate_geometry:        CoordinateGeometry        as unknown as RawTopic,
  mixed_geometry:             MixedGeometry             as unknown as RawTopic,
};

// ── Cache ─────────────────────────────────────────────────────────────────────

const _mainCache:   Record<string, UnifiedQuestion[]>            = {};
const _simCache:    Record<string, UnifiedQuestion[]>            = {}; // key: "topicId::parentId"
const _allSimCache: Record<string, UnifiedQuestion[]>            = {};

// ── Main questions (counted in score) ─────────────────────────────────────────

export function getTopicQuestions(topicId: string): UnifiedQuestion[] {
  if (_mainCache[topicId]) return _mainCache[topicId];
  const raw  = RAW_MAP[topicId];
  const meta = TOPIC_REGISTRY.find(t => t.id === topicId);
  if (!raw) return [];
  _mainCache[topicId] = flattenTopic(raw, topicId, meta?.source, meta?.chapter);
  return _mainCache[topicId];
}

// ── Similar questions for one parent question ──────────────────────────────────

export function getSimilarQuestions(topicId: string, parentId: string): UnifiedQuestion[] {
  const key = `${topicId}::${parentId}`;
  if (_simCache[key]) return _simCache[key];

  const raw  = RAW_MAP[topicId];
  const meta = TOPIC_REGISTRY.find(t => t.id === topicId);
  if (!raw) return [];

  // Find the raw parent question — works for both flat and chapters[] layout
  let parentRaw: (RawQuestion & { similar_questions?: any[] }) | undefined;
  if (raw.chapters) {
    for (const ch of raw.chapters) {
      parentRaw = (ch.questions as any[]).find((q: any) => q.id === parentId);
      if (parentRaw) break;
    }
  } else {
    parentRaw = (raw.questions as any[]).find((q: any) => q.id === parentId);
  }

  if (!parentRaw) return [];
  _simCache[key] = adaptSimilarQuestions(parentRaw, topicId, meta?.source, meta?.chapter);
  return _simCache[key];
}

// ── All similar questions for a topic (flat list) ──────────────────────────────

export function getAllSimilarQuestions(topicId: string): UnifiedQuestion[] {
  if (_allSimCache[topicId]) return _allSimCache[topicId];

  const raw  = RAW_MAP[topicId];
  const meta = TOPIC_REGISTRY.find(t => t.id === topicId);
  if (!raw) return [];

  const result: UnifiedQuestion[] = [];
  const allRaw: (RawQuestion & { similar_questions?: any[] })[] = raw.chapters
    ? raw.chapters.flatMap(ch => ch.questions as any[])
    : (raw.questions as any[]);

  for (const q of allRaw) {
    result.push(...adaptSimilarQuestions(q, topicId, meta?.source, meta?.chapter));
  }
  _allSimCache[topicId] = result;
  return result;
}

// ── Mixed (main questions only) ────────────────────────────────────────────────

export function getMixedQuestions(): UnifiedQuestion[] {
  return TOPIC_REGISTRY.flatMap(t => getTopicQuestions(t.id));
}