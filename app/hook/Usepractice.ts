'use client';

// hooks/usePractice.ts
// All original hooks preserved exactly.
// ADDED:
//   - saveSimilarAttempt import
//   - getAllSimilarAttemptsForTopic import
//   - restoreAllSimilarToResults() exported helper
//   - useSubmit now accepts optional similarSessionCache + setSimilarResults;
//     when currentQ.isSimilar is true it routes to saveSimilarAttempt and
//     does NOT update topic score / trigger completion check.
//   - useReAttempt unchanged (similar attempts are intentionally NOT wiped
//     on re-attempt — they are pure practice).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  saveAttempt, toggleMarkForReview, updateQuestionStats,
  getQuestionStats, updateTopicProgress, getTopicProgress,
  getTopicAttempts, getAllAttempts, resetTopicProgress, resetTopicAttempts,
  checkUserLiked, toggleUserLike, getUserVote, setUserVote, removeUserVote,resetSimilarAttempts,
  saveSimilarAttempt, getAllSimilarAttemptsForTopic,
} from '../lib/firestore';
import { TOPIC_REGISTRY, getTopicQuestions, getMixedQuestions, getAllSimilarQuestions } from "../lib/registry/registry";
import type { UnifiedQuestion } from '../lib/adapter/adapter';
import type { DifficultyLevel, QuestionStats, TopicProgress } from '../lib/types';
import { isAnswerCorrect, ALPHA } from '../practice/utils/helpers';

// ─── SessionEntry ─────────────────────────────────────────────────────────────
export interface SessionEntry {
  result:           'correct' | 'incorrect';
  liked:            boolean;
  diffVote:         DifficultyLevel | null;
  marked:           boolean;
  selectedOption?:  number;
  qcSelected?:      string;
  textAnswer?:      string;
  selectedOptions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuth
// ─────────────────────────────────────────────────────────────────────────────
export function useAuth() {
  const router = useRouter();
  const [user,         setUser]         = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace('/login');
      else { setUser(u); setAuthChecking(false); }
    });
    return () => unsub();
  }, [router]);

  return { user, authChecking };
}

// ─────────────────────────────────────────────────────────────────────────────
// useCommunityStats
// ─────────────────────────────────────────────────────────────────────────────
export function useCommunityStats(questionId: string | undefined) {
  const [communityStats, setCommunityStats] = useState<QuestionStats | null>(null);

  const refresh = useCallback(async (qid: string) => {
    const stats = await getQuestionStats(qid);
    if (stats) setCommunityStats(stats);
  }, []);

  useEffect(() => {
    if (!questionId) return;
    setCommunityStats(null);
    refresh(questionId);
  }, [questionId, refresh]);

  return { communityStats, setCommunityStats, refreshStats: refresh };
}

// ─────────────────────────────────────────────────────────────────────────────
// restoreAllTopicsToResults
// ─────────────────────────────────────────────────────────────────────────────
export async function restoreAllTopicsToResults(
  uid: string,
  setResults: React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>,
): Promise<void> {
  const allAttempts = await getAllAttempts(uid);
  if (allAttempts.length === 0) return;

  const restoredResults: Record<string, 'correct' | 'incorrect'> = {};
  for (const attempt of allAttempts) {
    restoredResults[attempt.questionId] = attempt.isCorrect ? 'correct' : 'incorrect';
  }
  setResults(prev => ({ ...prev, ...restoredResults }));
}

// ─────────────────────────────────────────────────────────────────────────────
// restoreAllSimilarToResults  (NEW)
//
// Call this once per topic load to repopulate similarResults from Firestore
// so previously-attempted similar questions show their status in the sidebar.
// ─────────────────────────────────────────────────────────────────────────────
export async function restoreAllSimilarToResults(
  uid: string,
  topicId: string,
  setSimilarResults: React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>,
  similarSessionCache: React.MutableRefObject<Record<string, SessionEntry>>,
): Promise<void> {
  if (topicId === 'mixed') return;
  const attempts = await getAllSimilarAttemptsForTopic(uid, topicId);
  if (attempts.length === 0) return;

  const map: Record<string, 'correct' | 'incorrect'> = {};
  for (const a of attempts) {
    if (!a.questionId) continue;
    map[a.questionId] = a.isCorrect ? 'correct' : 'incorrect';
    similarSessionCache.current[a.questionId] = {
      result:          a.isCorrect ? 'correct' : 'incorrect',
      liked:           !!a.liked,
      diffVote:        a.difficultyVote ?? null,
      marked:          !!a.markedForReview,
      selectedOption:  a.selectedOption ?? undefined,
      textAnswer:      a.textAnswer ?? undefined,
      selectedOptions: a.selectedOptions ?? undefined,
      qcSelected: a.selectedOption != null
        ? (['A', 'B', 'C', 'D'][a.selectedOption] ?? undefined)
        : undefined,
    };
  }
  setSimilarResults(prev => ({ ...prev, ...map }));
}

// ─────────────────────────────────────────────────────────────────────────────
// useTopicAttemptRestore  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
export function useTopicAttemptRestore({
  uid, topicId, sessionCache,
  setResults, setCompletedTopics, setCompleteModalData,
}: {
  uid:                 string | null;
  topicId:             string;
  sessionCache:        React.MutableRefObject<Record<string, SessionEntry>>;
  setResults:          React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>;
  setCompletedTopics:  React.Dispatch<React.SetStateAction<Set<string>>>;
  setCompleteModalData:(v: { correctCount: number; totalQuestions: number } | null) => void;
}) {
  const restore = useCallback(async (totalQuestions: number) => {
    if (!uid || topicId === 'mixed') return;

    const attempts = await getTopicAttempts(uid, topicId);
    if (attempts.length === 0) return;

    const restoredResults: Record<string, 'correct' | 'incorrect'> = {};

    attempts.forEach((attempt) => {
      const result = attempt.isCorrect ? 'correct' : 'incorrect';
      restoredResults[attempt.questionId] = result;

      sessionCache.current[attempt.questionId] = {
        result,
        liked:           !!attempt.liked,
        diffVote:        attempt.difficultyVote ?? null,
        marked:          !!attempt.markedForReview,
        selectedOption:  attempt.selectedOption ?? undefined,
        textAnswer:      attempt.textAnswer ?? undefined,
        selectedOptions: attempt.selectedOptions ?? undefined,
        qcSelected: attempt.selectedOption !== null && attempt.selectedOption !== undefined
          ? ['A', 'B', 'C', 'D'][attempt.selectedOption] ?? undefined
          : undefined,
      };
    });

    setResults(prev => ({ ...prev, ...restoredResults }));

    if (attempts.length >= totalQuestions) {
      const correctCount = attempts.filter(a => a.isCorrect).length;
      setCompletedTopics(prev => new Set([...prev, topicId]));
      setCompleteModalData({ correctCount, totalQuestions });
    }
  }, [uid, topicId, sessionCache, setResults, setCompletedTopics, setCompleteModalData]);

  return { restoreTopicAttempts: restore };
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubmit
//
// CHANGE: accepts optional similarSessionCache + setSimilarResults.
// When currentQ.isSimilar === true:
//   - routes to saveSimilarAttempt (separate Firestore subcollection)
//   - updates similarResults state (not main results)
//   - does NOT call updateTopicProgress or checkCompletion
//   - still updates communityStats (difficulty / like tracking works for all)
// When currentQ.isSimilar is falsy: exactly the original behaviour.
// ─────────────────────────────────────────────────────────────────────────────
export function useSubmit({
  currentQ, submitted, user, activeTopicId, questions, results,
  qcSelected, mcSelected, numericValue, selectAllSet, sessionCache,
  setIsCorrect, setSubmitted, setTimerRunning, setTimedOut, setResults,
  setTopicProgress, setTopicProgressMap, setCompletedTopics,
  setCompleteModalData, setShowCompleteModal,
  // NEW optional — only needed when similar questions are active
  similarSessionCache,
  setSimilarResults,
}: {
  currentQ:       UnifiedQuestion | undefined;
  submitted:      boolean;
  user:           User | null;
  activeTopicId:  string;
  questions:      UnifiedQuestion[];
  results:        Record<string, 'correct' | 'incorrect'>;
  qcSelected:     string | null;
  mcSelected:     number | null;
  numericValue:   string;
  selectAllSet:   Set<string>;
  sessionCache:   React.MutableRefObject<Record<string, SessionEntry>>;
  setIsCorrect:         (v: boolean) => void;
  setSubmitted:         (v: boolean) => void;
  setTimerRunning:      (v: boolean) => void;
  setTimedOut:          (v: boolean) => void;
  setResults:           React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>;
  setTopicProgress:     (v: TopicProgress | null) => void;
  setTopicProgressMap?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setCompletedTopics:   React.Dispatch<React.SetStateAction<Set<string>>>;
  setCompleteModalData: (v: { correctCount: number; totalQuestions: number } | null) => void;
  setShowCompleteModal: (v: boolean) => void;
  // NEW
  similarSessionCache?: React.MutableRefObject<Record<string, SessionEntry>>;
  setSimilarResults?:   React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>;
}) {
  const checkCompletion = useCallback(async (
    newResults: Record<string, 'correct' | 'incorrect'>,
    total: number,
    topicId: string,
  ) => {
    if (Object.keys(newResults).length >= total && topicId !== 'mixed') {
      const correctCount = Object.values(newResults).filter(r => r === 'correct').length;
      setCompletedTopics(prev => new Set([...prev, topicId]));
      setCompleteModalData({ correctCount, totalQuestions: total });
      setShowCompleteModal(true);

      if (user) {
        const progress = await getTopicProgress(user.uid, topicId);
        setTopicProgress(progress);
      }
    }
  }, [setCompletedTopics, setCompleteModalData, setShowCompleteModal, user, setTopicProgress]);

  const buildEntry = useCallback((result: 'correct' | 'incorrect'): SessionEntry => {
    const existing = sessionCache.current[currentQ!.id];
    const entry: SessionEntry = {
      result,
      liked:    existing?.liked    ?? false,
      diffVote: existing?.diffVote ?? null,
      marked:   existing?.marked   ?? false,
    };
    if (currentQ!.type === 'quantitative_comparison' && qcSelected) {
      entry.qcSelected     = qcSelected;
      entry.selectedOption = ['A', 'B', 'C', 'D'].indexOf(qcSelected);
    } else if (currentQ!.type === 'multiple_choice' && mcSelected !== null) {
      entry.selectedOption = mcSelected;
    } else if (currentQ!.type === 'numeric_entry') {
      entry.textAnswer = numericValue.trim();
    } else if (currentQ!.type === 'select_all') {
      entry.selectedOptions = Array.from(selectAllSet);
    }
    return entry;
  }, [currentQ, qcSelected, mcSelected, numericValue, selectAllSet, sessionCache]);

  const persistToFirestore = useCallback(async (entry: SessionEntry, isCorrect: boolean) => {
    if (!user || !currentQ) return;

    const payload: Record<string, unknown> = {
      questionId: currentQ.id,
      topicId:    currentQ.topicId,
      isCorrect,
    };
    if (entry.selectedOption !== undefined) payload.selectedOption  = entry.selectedOption;
    if (entry.textAnswer     !== undefined) payload.textAnswer      = entry.textAnswer;
    if (entry.selectedOptions)              payload.selectedOptions = entry.selectedOptions;

    await saveAttempt(user.uid, currentQ.id, payload as any);
    await updateQuestionStats(currentQ.id, { correct: isCorrect });

    if (activeTopicId !== 'mixed') {
      await updateTopicProgress(user.uid, currentQ.topicId, questions.length, isCorrect);
      const progress = await getTopicProgress(user.uid, currentQ.topicId);
      setTopicProgress(progress);
      setTopicProgressMap?.(prev => ({ ...prev, [currentQ.topicId]: progress }));
    }
  }, [user, currentQ, activeTopicId, questions.length, setTopicProgress, setTopicProgressMap]);

  // NEW: persist a similar-question attempt (separate subcollection, no scoring)
  const persistSimilarToFirestore = useCallback(async (entry: SessionEntry, isCorrect: boolean) => {
    if (!user || !currentQ) return;
    await saveSimilarAttempt(user.uid, currentQ.id, {
      questionId:      currentQ.id,
      topicId:         currentQ.topicId,
      parentId:        currentQ.parentId,
      isCorrect,
      selectedOption:  entry.selectedOption,
      textAnswer:      entry.textAnswer,
      selectedOptions: entry.selectedOptions,
    });
    // Community stats still tracked for similar questions (difficulty votes, likes)
    await updateQuestionStats(currentQ.id, { correct: isCorrect });
  }, [user, currentQ]);

  const handleSubmit = useCallback(async () => {
    if (!currentQ || submitted) return;

    // Determine which cache to guard against double-submit
    const isSim  = !!currentQ.isSimilar;
    const cache  = isSim && similarSessionCache ? similarSessionCache : sessionCache;
    if (cache.current[currentQ.id]) return;

    let userAnswer: string | string[] = '';
    if (currentQ.type === 'quantitative_comparison') { if (!qcSelected) return;          userAnswer = qcSelected; }
    else if (currentQ.type === 'multiple_choice')    { if (mcSelected === null) return;  userAnswer = (currentQ.optionKeys ?? ALPHA)[mcSelected]; }
    else if (currentQ.type === 'numeric_entry')      { if (!numericValue.trim()) return; userAnswer = numericValue.trim(); }
    else if (currentQ.type === 'select_all')         { if (!selectAllSet.size) return;   userAnswer = Array.from(selectAllSet); }

    const isCorrect = isAnswerCorrect(currentQ, userAnswer);
    const result: 'correct' | 'incorrect' = isCorrect ? 'correct' : 'incorrect';

    setIsCorrect(isCorrect);
    setSubmitted(true);
    setTimerRunning(false);

    const entry = buildEntry(result);

    if (isSim && similarSessionCache && setSimilarResults) {
      // ── Similar question path ──────────────────────────────────────────────
      similarSessionCache.current[currentQ.id] = entry;
      setSimilarResults(prev => ({ ...prev, [currentQ.id]: result }));
      await persistSimilarToFirestore(entry, isCorrect);
      // No topic score update, no completion check
    } else {
      // ── Main question path (original behaviour) ───────────────────────────
      const newResults = { ...results, [currentQ.id]: result };
      setResults(newResults);
      sessionCache.current[currentQ.id] = entry;
      await persistToFirestore(entry, isCorrect);

      const topicResults: Record<string, 'correct' | 'incorrect'> = {};
      for (const q of questions) {
        const r = newResults[q.id];
        if (r) topicResults[q.id] = r;
      }
      checkCompletion(topicResults, questions.length, activeTopicId);
    }
  }, [
    currentQ, submitted, sessionCache, similarSessionCache,
    qcSelected, mcSelected, numericValue, selectAllSet,
    results, setIsCorrect, setSubmitted, setTimerRunning, setResults, setSimilarResults,
    buildEntry, persistToFirestore, persistSimilarToFirestore,
    checkCompletion, questions, activeTopicId,
  ]);

  const handleTimerExpire = useCallback(async () => {
    if (!currentQ || submitted) return;

    const isSim  = !!currentQ.isSimilar;
    const cache  = isSim && similarSessionCache ? similarSessionCache : sessionCache;
    if (cache.current[currentQ.id]) return;

    setTimedOut(true);
    setSubmitted(true);
    setTimerRunning(false);
    setIsCorrect(false);

    const entry = buildEntry('incorrect');

    if (isSim && similarSessionCache && setSimilarResults) {
      // ── Similar question path ──────────────────────────────────────────────
      similarSessionCache.current[currentQ.id] = entry;
      setSimilarResults(prev => ({ ...prev, [currentQ.id]: 'incorrect' }));
      if (user && currentQ) {
        try {
          await saveSimilarAttempt(user.uid, currentQ.id, {
            questionId: currentQ.id,
            topicId:    currentQ.topicId,
            parentId:   currentQ.parentId,
            isCorrect:  false,
          });
          await updateQuestionStats(currentQ.id, { correct: false });
        } catch (error) {
          console.error('Failed to persist similar timed-out attempt:', error);
        }
      }
    } else {
      // ── Main question path (original behaviour) ───────────────────────────
      const newResults = { ...results, [currentQ.id]: 'incorrect' as const };
      setResults(newResults);
      sessionCache.current[currentQ.id] = entry;

      if (user && currentQ) {
        try {
          await saveAttempt(user.uid, currentQ.id, { questionId: currentQ.id, topicId: currentQ.topicId, isCorrect: false });
          await updateQuestionStats(currentQ.id, { correct: false });
          if (activeTopicId !== 'mixed') {
            await updateTopicProgress(user.uid, currentQ.topicId, questions.length, false);
            const p = await getTopicProgress(user.uid, currentQ.topicId);
            setTopicProgress(p);
            setTopicProgressMap?.(prev => ({ ...prev, [currentQ.topicId]: p }));
          }
        } catch (error) {
          console.error('Failed to persist timed-out attempt:', error);
        }
      }

      const topicResults: Record<string, 'correct' | 'incorrect'> = {};
      for (const q of questions) {
        const r = newResults[q.id];
        if (r) topicResults[q.id] = r;
      }
      checkCompletion(topicResults, questions.length, activeTopicId);
    }
  }, [
    currentQ, submitted, sessionCache, similarSessionCache,
    results, user, activeTopicId, questions,
    setTimedOut, setSubmitted, setTimerRunning, setIsCorrect, setResults, setSimilarResults,
    buildEntry, checkCompletion, setTopicProgress, setTopicProgressMap,
  ]);

  return { handleSubmit, handleTimerExpire };
}

// ─────────────────────────────────────────────────────────────────────────────
// useQuestionMeta  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
export function useQuestionMeta({
  currentQ, submitted, user, sessionCache, setCommunityStats,
}: {
  currentQ:          UnifiedQuestion | undefined;
  submitted:         boolean;
  user:              User | null;
  sessionCache:      React.MutableRefObject<Record<string, SessionEntry>>;
  setCommunityStats: (v: QuestionStats | null) => void;
}) {
  const [marked,   setMarked]   = useState(false);
  const [diffVote, setDiffVote] = useState<DifficultyLevel | null>(null);
  const [liked,    setLiked]    = useState(false);

  useEffect(() => {
    if (!currentQ) return;
    const cached = sessionCache.current[currentQ.id];
    setMarked(cached?.marked ?? false);

    if (user) {
      (async () => {
        const userLiked = await checkUserLiked(user.uid, currentQ.id);
        const userVote  = await getUserVote(user.uid, currentQ.id);
        setLiked(userLiked);
        setDiffVote(userVote ?? null);
        if (sessionCache.current[currentQ.id]) {
          sessionCache.current[currentQ.id].liked    = userLiked;
          sessionCache.current[currentQ.id].diffVote = userVote ?? null;
        }
      })();
    } else {
      setLiked(cached?.liked ?? false);
      setDiffVote(cached?.diffVote ?? null);
    }
  }, [currentQ, user, sessionCache]);

  const refreshStats = useCallback(async (qid: string) => {
    const stats = await getQuestionStats(qid);
    if (stats) setCommunityStats(stats);
  }, [setCommunityStats]);

  const handleMark = useCallback(async () => {
    if (!currentQ) return;
    const next = !marked;
    setMarked(next);
    if (sessionCache.current[currentQ.id]) sessionCache.current[currentQ.id].marked = next;
    if (user) {
      await toggleMarkForReview(user.uid, currentQ.id, next);
      await refreshStats(currentQ.id);
    }
  }, [currentQ, marked, user, sessionCache, refreshStats]);

  const handleDiffVote = useCallback(async (v: DifficultyLevel) => {
    if (!currentQ || !submitted || !user) return;
    try {
      const currentVote = await getUserVote(user.uid, currentQ.id);
      if (currentVote === v) {
        setDiffVote(null);
        if (sessionCache.current[currentQ.id]) sessionCache.current[currentQ.id].diffVote = null;
        await saveAttempt(user.uid, currentQ.id, { difficultyVote: null } as any);
        await removeUserVote(user.uid, currentQ.id);
      } else {
        setDiffVote(v);
        if (sessionCache.current[currentQ.id]) sessionCache.current[currentQ.id].diffVote = v;
        await saveAttempt(user.uid, currentQ.id, { difficultyVote: v } as any);
        await setUserVote(user.uid, currentQ.id, v);
      }
      await refreshStats(currentQ.id);
    } catch (error: any) {
      console.error('Vote failed:', error?.message || error);
    }
  }, [currentQ, submitted, user, sessionCache, refreshStats]);

  const handleLike = useCallback(async () => {
    if (!currentQ || !user) return;
    try {
      const newLikedState = await toggleUserLike(user.uid, currentQ.id);
      setLiked(newLikedState);
      if (sessionCache.current[currentQ.id]) sessionCache.current[currentQ.id].liked = newLikedState;
      await saveAttempt(user.uid, currentQ.id, { liked: newLikedState } as any);
      await refreshStats(currentQ.id);
    } catch (error: any) {
      console.error('Like toggle failed:', error?.message || error);
    }
  }, [currentQ, user, sessionCache, refreshStats]);

  return { marked, setMarked, diffVote, setDiffVote, liked, setLiked, handleMark, handleDiffVote, handleLike };
}

// ─────────────────────────────────────────────────────────────────────────────
// useReAttempt  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
export function useReAttempt({
  user, activeTopicId, sessionCache, similarSessionCache,
  setResults, setSimilarResults, setQIdx, setCompletedTopics,
  setShowCompleteModal, setCompleteModalData, setTopicProgress,
  setActiveTopicId, setExpandedTopicId,
}: {
  user:                 User | null;
  activeTopicId:        string;
  sessionCache:         React.MutableRefObject<Record<string, SessionEntry>>;
  similarSessionCache:  React.MutableRefObject<Record<string, SessionEntry>>;
  setResults:           React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>;
  setSimilarResults:    React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect'>>>;
  setQIdx:              (v: number) => void;
  setCompletedTopics:   React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowCompleteModal: (v: boolean) => void;
  setCompleteModalData: (v: null) => void;
  setTopicProgress:     (v: null) => void;
  setActiveTopicId:     (v: string) => void;
  setExpandedTopicId:   (v: string) => void;
}) {
  return useCallback(async (topicId: string) => {
    const qs = topicId === 'mixed' ? getMixedQuestions() : getTopicQuestions(topicId);
    const qIds = qs.map(q => q.id);
    const qIdSet = new Set(qIds);

    qIds.forEach(id => { delete sessionCache.current[id]; });

    const simQs = topicId === 'mixed' ? [] : getAllSimilarQuestions(topicId);
    const simIds = simQs.map(q => q.id);
    const simIdSet = new Set(simIds);
    simIds.forEach(id => { delete similarSessionCache.current[id]; });

    setResults(prev => {
      const next = { ...prev };
      for (const id of qIdSet) delete next[id];
      return next;
    });

    setSimilarResults(prev => {
      const next = { ...prev };
      for (const id of simIdSet) delete next[id];
      return next;
    });

    setQIdx(0);
    setCompletedTopics(prev => {
      const next = new Set(prev);
      next.delete(topicId);
      return next;
    });
    setShowCompleteModal(false);
    setCompleteModalData(null);
    setTopicProgress(null);

    if (user && topicId !== 'mixed') {
      await resetTopicProgress(user.uid, topicId);
      await resetTopicAttempts(user.uid, qIds);
      if (simIds.length > 0) {
        await resetSimilarAttempts(user.uid, simIds);
      }
    }

    if (topicId !== activeTopicId) {
      setActiveTopicId(topicId);
      setExpandedTopicId(topicId);
    }
  }, [
    user, activeTopicId, sessionCache, similarSessionCache,
    setResults, setSimilarResults, setQIdx, setCompletedTopics,
    setShowCompleteModal, setCompleteModalData, setTopicProgress,
    setActiveTopicId, setExpandedTopicId,
  ]);
}
