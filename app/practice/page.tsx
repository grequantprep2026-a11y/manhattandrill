'use client';

/**
 * PracticePage.tsx
 *
 * PAYWALL ADDITIONS (all other code unchanged):
 * - Loads isPro from Firestore on mount via getUserIsPro()
 * - Passes isPro + mockLocked to Sidebar
 * - Shows UpgradeModal when a paywalled feature is attempted
 * - Guard: if free user somehow navigates to topic > 0, redirects to topic 0
 *
 * RESPONSIVE ADDITIONS:
 * - On mobile (<768px): InsightPanel becomes a bottom sheet (handled inside InsightPanel)
 * - Sidebar becomes a floating hamburger drawer (handled inside Sidebar)
 * - Top bar wraps/collapses badges on narrow screens
 * - Bottom action bar is taller and touch-friendly on mobile
 * - Question content padding adjusts per breakpoint
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter }     from 'next/navigation';
import { signOut }       from 'firebase/auth';
import { auth }          from '../lib/firebase';
import {
  getTopicProgress, updateUserProfile,
  finaliseTopicAttempt, getAllTopicProgress,
  getUserIsPro, getCompletedMockSessionCount,
} from '../lib/firestore';
import {
  TOPIC_REGISTRY, getTopicQuestions, getMixedQuestions, getSimilarQuestions,
} from "../lib/registry/registry";
import type { UnifiedQuestion } from '../lib/adapter/adapter';
import type { TopicAttemptRecord } from '../lib/types';

import { LIGHT, DARK, GLOBAL_STYLES }   from './styles/theme';
import { QuestionTimer }                 from './components/ui';
import { SettingsModal }                 from '../components/SettingsModal';
import {
  ContextBlock, QCRenderer, MCRenderer,
  NumericRenderer, SelectAllRenderer,
}                                        from './components/renderers';
import { MarkdownRenderer }              from './components/MarkdownRenderer';
import { InsightPanel }                  from './components/InsightPanel';
import { Sidebar }                       from './components/Sidebar';
import { TopicCompleteModal }            from './components/TopicCompleteModal';
import { TopicUnlockedModal }            from './components/TopicUnlockedModal';
import { ReportModal }                   from '../components/ReportModal';
import { UpgradeModal }                  from './components/UpgradeModal';
import { MockTestPage }                  from './components/MockTestPage';
import {
  useAuth, useCommunityStats, useTopicAttemptRestore,
  useSubmit, useQuestionMeta, useReAttempt,
  restoreAllTopicsToResults,
  restoreAllSimilarToResults,
  type SessionEntry,
} from '../hook/Usepractice';
import { Home } from 'lucide-react';

// ── Responsive hook ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 600 ? 'mobile' : w < 900 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

// ── Unlock logic (score-based, only relevant for Pro users) ───────────────────

const ALL_TOPIC_IDS = [...TOPIC_REGISTRY.map(t => t.id), 'mixed'];

function computeUnlocked(
  progressMap: Record<string, { bestScore?: number; correctAnswers?: number; totalQuestions?: number } | null>,
): Set<string> {
  const unlocked = new Set<string>();
  for (let i = 0; i < ALL_TOPIC_IDS.length; i++) {
    const id = ALL_TOPIC_IDS[i];
    if (i === 0) { unlocked.add(id); continue; }
    const prevId = ALL_TOPIC_IDS[i - 1];
    const p      = progressMap[prevId];
    const best   = p?.bestScore
      ?? (p?.totalQuestions ? Math.round(((p.correctAnswers ?? 0) / p.totalQuestions) * 100) : 0);
    if (best >= 80) unlocked.add(id);
  }
  return unlocked;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter();
  const bp     = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  const { user, authChecking } = useAuth();

  const [dark,         setDark]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timerMins,    setTimerMins]    = useState(2);

  // ── Mock test overlay ─────────────────────────────────────────────────────
  const [showMockTest, setShowMockTest] = useState(false);

  // ── Paywall state ─────────────────────────────────────────────────────────
  const [isPro,          setIsPro]          = useState(false);
  const [mockLocked,     setMockLocked]     = useState(false);
  const [upgradeOpen,    setUpgradeOpen]    = useState(false);
  const [upgradeReason,  setUpgradeReason]  = useState<'topic' | 'mock'>('topic');

  const [activeTopicId,   setActiveTopicId]   = useState('arithmetic');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>('arithmetic');
  const [questions,       setQuestions]       = useState<UnifiedQuestion[]>([]);
  const [qIdx,            setQIdx]            = useState(0);

  const [currentSimilarQ, setCurrentSimilarQ] = useState<UnifiedQuestion | null>(null);
  const [similarResults,  setSimilarResults]   = useState<Record<string, 'correct' | 'incorrect'>>({});
  const similarSessionCache = useRef<Record<string, SessionEntry>>({});

  const [mcSelected,   setMcSelected]   = useState<number | null>(null);
  const [qcSelected,   setQcSelected]   = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState('');
  const [selectAllSet, setSelectAllSet] = useState<Set<string>>(new Set());
  const [submitted,    setSubmitted]    = useState(false);
  const [timedOut,     setTimedOut]     = useState(false);
  const [isCorrect,    setIsCorrect]    = useState<boolean | null>(null);

  const [timerRunning,  setTimerRunning]  = useState(true);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const [results,         setResults]         = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeModalData, setCompleteModalData] = useState<{
    correctCount: number; totalQuestions: number;
    attemptNumber: number; attemptHistory: TopicAttemptRecord[];
  } | null>(null);

  const [showUnlockModal,    setShowUnlockModal]    = useState(false);
  const [unlockedTopicLabel, setUnlockedTopicLabel] = useState('');
  const [unlockedTopicId,    setUnlockedTopicId]    = useState('');
  const [unlockedScorePct,   setUnlockedScorePct]   = useState(0);

  const [topicProgressMap, setTopicProgressMap] = useState<Record<string, any>>({});
  const [topicProgress,    setTopicProgress]    = useState<any>(null);
  const [unlockedTopics,   setUnlockedTopics]   = useState<Set<string>>(() => new Set(['arithmetic']));

  const [reportOpen, setReportOpen] = useState(false);

  const sessionCache    = useRef<Record<string, SessionEntry>>({});
  const pendingFinalise = useRef(false);

  const currentQ: UnifiedQuestion | undefined = currentSimilarQ ?? questions[qIdx];

  const { communityStats, setCommunityStats } = useCommunityStats(currentQ?.id);
  const [restoreDone, setRestoreDone] = useState(false);

  const { restoreTopicAttempts } = useTopicAttemptRestore({
    uid: user?.uid ?? null, topicId: activeTopicId, sessionCache,
    setResults, setCompletedTopics,
    setCompleteModalData: () => {},
  });

  const {
    marked, setMarked, diffVote, setDiffVote, liked, setLiked,
    handleMark, handleDiffVote, handleLike,
  } = useQuestionMeta({ currentQ, submitted, user: user ?? null, sessionCache, setCommunityStats });

  // ── Load isPro + mockLocked on mount ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getUserIsPro(user.uid).then(pro => {
      setIsPro(pro);
      if (!pro) {
        getCompletedMockSessionCount(user.uid).then(count => {
          setMockLocked(count >= 1);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [user]);

  // ── Paywall guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPro && activeTopicId !== 'arithmetic' && activeTopicId !== 'mixed') {
      const idx = TOPIC_REGISTRY.findIndex(t => t.id === activeTopicId);
      if (idx > 0) {
        setActiveTopicId('arithmetic');
        setExpandedTopicId('arithmetic');
        setQIdx(0);
      }
    }
  }, [isPro, activeTopicId]);

  useEffect(() => {
    setUnlockedTopics(computeUnlocked(topicProgressMap));
  }, [topicProgressMap]);

  useEffect(() => {
    if (!user) return;
    restoreAllTopicsToResults(user.uid, setResults).catch(console.error);
  }, [user]);

  // ── handleTopicComplete ───────────────────────────────────────────────────

  const handleTopicComplete = useCallback(async (
    correctCount: number,
    totalQ: number,
    topicId: string,
  ) => {
    if (!user || pendingFinalise.current) return;
    pendingFinalise.current = true;
    try {
      const existing   = await getTopicProgress(user.uid, topicId);
      const attemptNum = existing?.attemptNumber ?? 1;
      const history    = existing?.attemptHistory ?? [];

      const { scorePct, bestScore } = await finaliseTopicAttempt(
        user.uid, topicId, correctCount, totalQ, attemptNum,
      );

      const newRecord: TopicAttemptRecord = {
        attemptNumber: attemptNum, correctAnswers: correctCount,
        totalQuestions: totalQ, scorePct, completedAt: new Date().toISOString(),
      };
      const fullHistory = [...history, newRecord];

      setTopicProgressMap(prev => ({
        ...prev,
        [topicId]: {
          ...(prev[topicId] ?? {}),
          bestScore, attemptNumber: attemptNum,
          attemptHistory: fullHistory,
          correctAnswers: correctCount, totalQuestions: totalQ,
        },
      }));

      setCompleteModalData({
        correctCount, totalQuestions: totalQ,
        attemptNumber: attemptNum, attemptHistory: fullHistory,
      });
      setShowCompleteModal(true);

      if (scorePct >= 80) {
        const idx      = ALL_TOPIC_IDS.indexOf(topicId);
        const nextId   = ALL_TOPIC_IDS[idx + 1];
        const nextMeta = TOPIC_REGISTRY.find(t => t.id === nextId);
        const wasLocked = !unlockedTopics.has(nextId ?? '');
        if (nextId && nextMeta && wasLocked && isPro) {
          setTimeout(() => {
            setUnlockedTopicLabel(nextMeta.label);
            setUnlockedTopicId(nextId);
            setUnlockedScorePct(scorePct);
            setShowCompleteModal(false);
            setShowUnlockModal(true);
          }, 320);
        }
      }
    } finally {
      pendingFinalise.current = false;
    }
  }, [user, unlockedTopics, isPro]);

  // ── useSubmit ─────────────────────────────────────────────────────────────

  const { handleSubmit: _baseSubmit, handleTimerExpire: _baseExpire } = useSubmit({
    currentQ, submitted, user: user ?? null,
    activeTopicId, questions, results,
    qcSelected, mcSelected, numericValue, selectAllSet, sessionCache,
    setIsCorrect, setSubmitted, setTimerRunning, setTimedOut,
    setResults, setTopicProgress, setTopicProgressMap,
    setCompletedTopics,
    setCompleteModalData: (v) => {
      if (v) setCompleteModalData({ ...v, attemptNumber: 1, attemptHistory: [] });
    },
    setShowCompleteModal,
    similarSessionCache,
    setSimilarResults,
  });

  const checkAndFinalise = useCallback(async () => {
    if (currentQ?.isSimilar) return;
    const cache       = sessionCache.current;
    const allAnswered = questions.length > 0 && questions.every(q => cache[q.id] !== undefined);
    if (allAnswered && activeTopicId !== 'mixed') {
      const correct = questions.filter(q => cache[q.id]?.result === 'correct').length;
      await handleTopicComplete(correct, questions.length, activeTopicId);
    }
  }, [questions, activeTopicId, currentQ, handleTopicComplete]);

  const handleSubmit = useCallback(async () => {
    await _baseSubmit();
    await checkAndFinalise();
  }, [_baseSubmit, checkAndFinalise]);

  const handleTimerExpire = useCallback(async () => {
    await _baseExpire();
    await checkAndFinalise();
  }, [_baseExpire, checkAndFinalise]);

  // ── useReAttempt ──────────────────────────────────────────────────────────

  const _baseReAttempt = useReAttempt({
    user: user ?? null, activeTopicId, sessionCache, similarSessionCache,
    setResults, setSimilarResults, setQIdx, setCompletedTopics,
    setShowCompleteModal, setCompleteModalData: () => {},
    setTopicProgress, setActiveTopicId, setExpandedTopicId,
  });

  const handleReAttempt = useCallback(async (topicId: string) => {
    await _baseReAttempt(topicId);
    setCurrentSimilarQ(null);
    setSubmitted(false); setTimedOut(false); setIsCorrect(null);
    setMcSelected(null); setQcSelected(null); setNumericValue('');
    setSelectAllSet(new Set()); setMarked(false); setDiffVote(null); setLiked(false);
    setCommunityStats(null); setTimerRunning(true);
    setTimerResetKey(k => k + 1);
    pendingFinalise.current = false;
  }, [_baseReAttempt, setCommunityStats]);

  // ── Load questions on topic change ────────────────────────────────────────

  useEffect(() => {
    const qs = activeTopicId === 'mixed' ? getMixedQuestions() : getTopicQuestions(activeTopicId);
    setQuestions(qs);
    setQIdx(0);
    setCurrentSimilarQ(null);
    sessionCache.current = {};
    similarSessionCache.current = {};
    pendingFinalise.current = false;
    setRestoreDone(false);

    const load = async () => {
      await restoreTopicAttempts(qs.length);
      if (user && activeTopicId !== 'mixed') {
        await restoreAllSimilarToResults(user.uid, activeTopicId, setSimilarResults, similarSessionCache);
      }
      setRestoreDone(true);
    };
    load().catch(console.error);

    if (user && activeTopicId !== 'mixed') {
      getTopicProgress(user.uid, activeTopicId).then(p => {
        setTopicProgress(p as any);
        setTopicProgressMap(prev => ({ ...prev, [activeTopicId]: p }));
        if (p && p.completedQuestions >= qs.length)
          setCompletedTopics(prev => new Set([...prev, activeTopicId]));
      });
    }
  }, [activeTopicId, user]);

  useEffect(() => {
    if (!user) return;
    getAllTopicProgress(user.uid).then(all => {
      const map: Record<string, any> = {};
      for (const p of all) map[p.topicId] = p;
      setTopicProgressMap(map);
      const completed = new Set<string>();
      for (const t of TOPIC_REGISTRY) {
        const p = map[t.id];
        if (p && p.completedQuestions >= getTopicQuestions(t.id).length) completed.add(t.id);
      }
      setCompletedTopics(prev => new Set([...prev, ...completed]));
    });
  }, [user]);

  // ── Restore per-question UI when navigating ───────────────────────────────

  useEffect(() => {
    if (!currentQ) return;
    const isSim  = !!currentQ.isSimilar;
    const cache  = isSim ? similarSessionCache.current : sessionCache.current;
    const cached = cache[currentQ.id];

    if (cached) {
      setSubmitted(true); setTimerRunning(false); setIsCorrect(cached.result === 'correct');
      setTimedOut(false); setMcSelected(cached.selectedOption ?? null);
      setQcSelected(cached.qcSelected ?? null); setNumericValue(cached.textAnswer ?? '');
      setSelectAllSet(new Set(cached.selectedOptions ?? []));
      setMarked(cached.marked ?? false); setDiffVote(cached.diffVote ?? null); setLiked(cached.liked ?? false);
    } else {
      setSubmitted(false); setTimedOut(false); setIsCorrect(null);
      setMcSelected(null); setQcSelected(null); setNumericValue('');
      setSelectAllSet(new Set()); setMarked(false); setDiffVote(null); setLiked(false);
      setCommunityStats(null); setTimerRunning(true);
    }
    setTimerResetKey(k => k + 1);
  }, [currentQ?.id, restoreDone]);

  // ── Sidebar: similar question click ───────────────────────────────────────

  const handleSimilarClick = useCallback((topicId: string, parentIdx: number, simIdx: number) => {
    if (topicId !== activeTopicId) {
      setActiveTopicId(topicId);
      setExpandedTopicId(topicId);
    }
    const parentQ = getTopicQuestions(topicId)[parentIdx];
    if (!parentQ) return;
    const simQs = getSimilarQuestions(topicId, parentQ.id);
    const simQ  = simQs[simIdx];
    if (!simQ) return;
    setCurrentSimilarQ(simQ);
  }, [activeTopicId]);

  // ── Paywall: topic toggle guard ───────────────────────────────────────────
  function handleTopicToggle(id: string) {
    const idx = TOPIC_REGISTRY.findIndex(t => t.id === id);
    if (!isPro && idx > 0) {
      setUpgradeReason('topic');
      setUpgradeOpen(true);
      return;
    }
    setExpandedTopicId(prev => prev === id ? null : id);
    if (id !== activeTopicId) {
      setActiveTopicId(id); setQIdx(0); setCurrentSimilarQ(null);
    }
  }

  function handleSidebarQClick(topicId: string, idx: number) {
    const tIdx = TOPIC_REGISTRY.findIndex(t => t.id === topicId);
    if (!isPro && tIdx > 0) {
      setUpgradeReason('topic');
      setUpgradeOpen(true);
      return;
    }
    if (topicId !== activeTopicId) {
      setActiveTopicId(topicId); setExpandedTopicId(topicId);
    }
    setCurrentSimilarQ(null);
    setQIdx(idx);
  }

  function handleOpenMockTest() {
    if (!isPro && mockLocked) {
      setUpgradeReason('mock');
      setUpgradeOpen(true);
      return;
    }
    setShowMockTest(true);
  }

  function handleUpgradeRequired(reason: 'topic' | 'mock' = 'topic') {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  }

  function handleMockExit() {
    setShowMockTest(false);
    if (!isPro && user) {
      getCompletedMockSessionCount(user.uid).then(count => {
        setMockLocked(count >= 1);
      }).catch(() => {});
    }
  }

  function handleTimerChange(m: number) { setTimerMins(m); setTimerResetKey(k => k + 1); }

  function navigate(dir: -1 | 1) {
    if (currentSimilarQ) { setCurrentSimilarQ(null); return; }
    const n = qIdx + dir;
    if (n >= 0 && n < questions.length) setQIdx(n);
  }

  async function handleLogout()               { await signOut(auth); }
  async function handleNameSave(name: string) { if (user) await updateUserProfile(user.uid, { displayName: name }); }

  // ── Derived ───────────────────────────────────────────────────────────────

  const canSubmit = !currentQ || submitted ? false
    : currentQ.type === 'quantitative_comparison' ? !!qcSelected
    : currentQ.type === 'multiple_choice'         ? mcSelected !== null
    : currentQ.type === 'numeric_entry'           ? !!numericValue.trim()
    : selectAllSet.size > 0;

  const topicLabel = TOPIC_REGISTRY.find(t => t.id === activeTopicId)?.label ?? 'Practice';
  const typeBadge  = !currentQ ? '' : currentQ.type === 'quantitative_comparison' ? 'QC'
    : currentQ.type === 'multiple_choice' ? 'MC' : currentQ.type === 'numeric_entry' ? 'Numeric' : 'Select All';

  const currentTopicQIds = new Set(questions.map(q => q.id));
  const topicAnswered    = Object.entries(results).filter(([id]) => currentTopicQIds.has(id));
  const answeredCount    = topicAnswered.length;
  const correctCount     = topicAnswered.filter(([, v]) => v === 'correct').length;
  const sessionPct       = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null;
  const scoreColor       = sessionPct === null ? 'var(--text-4)'
    : sessionPct >= 80 ? 'var(--ok)' : sessionPct >= 50 ? '#f59e0b' : 'var(--err)';

  const curProgress   = topicProgressMap[activeTopicId];
  const bestScore     = curProgress?.bestScore ?? null;
  const attemptNumber = curProgress?.attemptNumber ?? 1;

  const navLabel = currentSimilarQ
    ? (() => {
        const pIdx  = questions.findIndex(q => q.id === currentSimilarQ.parentId);
        const simQs = pIdx >= 0 ? getSimilarQuestions(activeTopicId, questions[pIdx].id) : [];
        const sIdx  = simQs.findIndex(s => s.id === currentSimilarQ.id);
        return pIdx >= 0 && sIdx >= 0 ? `Q${pIdx + 1}.${sIdx + 1}` : 'Practice Q';
      })()
    : `Q ${qIdx + 1} / ${questions.length}`;

  const parentQLabel = currentSimilarQ
    ? (() => {
        const pIdx = questions.findIndex(q => q.id === currentSimilarQ.parentId);
        return pIdx >= 0 ? `Q${pIdx + 1}` : null;
      })()
    : null;

  const qSource  = currentQ?.source  ?? TOPIC_REGISTRY.find(t => t.id === activeTopicId)?.source  ?? null;
  const qChapter = currentQ?.chapter ?? TOPIC_REGISTRY.find(t => t.id === activeTopicId)?.chapter ?? null;

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (authChecking || !user || !currentQ) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{dark ? DARK : LIGHT}</style>
        <p style={{ color: 'var(--text-3)' }}>{authChecking ? 'loading...' : 'Loading questions…'}</p>
      </div>
    );
  }

  // ── Mock Test overlay ─────────────────────────────────────────────────────

  if (showMockTest) {
    return (
      <MockTestPage
        user={user}
        dark={dark}
        onExit={handleMockExit}
      />
    );
  }

  // ── Responsive layout values ──────────────────────────────────────────────
  const topBarPadding   = isMobile ? '8px 14px'  : '10px 24px';
  const questionPadding = isMobile ? '16px 16px 0' : isTablet ? '20px 22px 0' : '24px 28px 0';
  const bottomBarPad    = isMobile ? '10px 16px' : '12px 28px';

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <style>{dark ? DARK : LIGHT}</style>
      <style>{GLOBAL_STYLES}</style>
      {/* Extra responsive base styles */}
      <style>{`
        * { box-sizing: border-box; }
        @media (max-width: 599px) {
          body { font-size: 15px; }
        }
      `}</style>

      {/* ── Upgrade Modal ── */}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        userEmail={user.email ?? ''}
        userId={user.uid}
      />

      {showCompleteModal && completeModalData && (
        <TopicCompleteModal
          topicLabel={topicLabel}
          totalQuestions={completeModalData.totalQuestions}
          correctCount={completeModalData.correctCount}
          attemptNumber={completeModalData.attemptNumber}
          attemptHistory={completeModalData.attemptHistory}
          onReAttempt={() => { setShowCompleteModal(false); handleReAttempt(activeTopicId); }}
          onClose={() => setShowCompleteModal(false)}
        />
      )}

      {showUnlockModal && (
        <TopicUnlockedModal
          unlockedTopicLabel={unlockedTopicLabel}
          scorePct={unlockedScorePct}
          onGoNext={() => {
            setShowUnlockModal(false);
            setActiveTopicId(unlockedTopicId);
            setExpandedTopicId(unlockedTopicId);
            setQIdx(0);
            setCurrentSimilarQ(null);
          }}
          onClose={() => setShowUnlockModal(false)}
        />
      )}

      {reportOpen && currentQ && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          uid={user.uid}
          questionId={currentQ.id}
          topicId={currentQ.topicId}
          questionNum={currentSimilarQ
            ? (() => {
                const pIdx = questions.findIndex(q => q.id === currentSimilarQ.parentId);
                return pIdx >= 0 ? pIdx + 1 : qIdx + 1;
              })()
            : qIdx + 1
          }
          questionType={typeBadge}
        />
      )}

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* ── Top bar ── */}
          <div style={{
            background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
            padding: topBarPadding,
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
            gap: 8,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: isMobile ? 6 : 10,
              flexWrap: 'wrap', minWidth: 0, flex: 1,
            }}>
              <span style={{
                fontSize: isMobile ? 13 : 15,
                fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.01em',
                whiteSpace: 'nowrap',
              }}>
                {topicLabel}
              </span>
              <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                {navLabel}
              </span>

              {!isMobile && currentSimilarQ && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 10px' }}>
                  Practice · not scored
                </span>
              )}
              {!isMobile && sessionPct !== null && !currentSimilarQ && (
                <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, background: sessionPct >= 80 ? 'var(--ok-bg)' : sessionPct >= 50 ? '#fffbeb' : 'var(--err-bg)', border: `1px solid ${scoreColor}44`, borderRadius: 20, padding: '2px 10px' }}>
                  {sessionPct}% now
                </span>
              )}
              {!isMobile && bestScore !== null && bestScore > 0 && !currentSimilarQ && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ok)', background: 'var(--ok-bg)', border: '1px solid var(--ok-bd)', borderRadius: 20, padding: '2px 10px' }}>
                  Best: {bestScore}%
                </span>
              )}
              {!isMobile && attemptNumber > 1 && !currentSimilarQ && (
                <span style={{ fontSize: 11, color: 'var(--text-4)', background: 'var(--ctx-bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                  #{attemptNumber} attempt
                </span>
              )}
              {isPro && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 9px' }}>
                  ★ Pro
                </span>
              )}
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
              {!isMobile && (
                <span style={{ fontSize: 11, color: 'var(--text-4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName ?? user.email}
                </span>
              )}
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: 'var(--btn-bg)', border: '1px solid var(--border)', borderRadius: 7,
                  padding: isMobile ? '5px 9px' : '5px 12px',
                  fontSize: isMobile ? 11 : 12, cursor: 'pointer', color: 'var(--text-2)',
                  touchAction: 'manipulation',
                }}
              >
                {isMobile ? '⚙' : '⚙ Settings'}
              </button>
              <button
                onClick={() => router.push('/home')}
                style={{
                  background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', width: 28, height: 28, transition: 'all .15s ease',
                  color: 'var(--text-3)', touchAction: 'manipulation',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--ctx-bg)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Home size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── Question + Insight ── */}
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0,
          }}>
            {/* Question area */}
            <div style={{
              flex: isMobile ? 1 : 2,
              display: 'flex', flexDirection: 'column',
              minWidth: 0, minHeight: 0, overflow: 'hidden',
              background: 'var(--bg-card)',
            }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ padding: questionPadding }}>

                  {/* Header row */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: isMobile ? 12 : 16,
                    flexWrap: 'wrap', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexWrap: 'wrap' }}>
                      <div style={{
                        fontSize: isMobile ? 11 : 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                        background: currentSimilarQ ? '#f0fdf4' : 'var(--ctx-bg)',
                        border: currentSimilarQ ? '1px solid #bbf7d0' : '1px solid var(--border)',
                        color: currentSimilarQ ? '#16a34a' : 'var(--text-2)',
                      }}>
                        {currentSimilarQ ? `Practice ${navLabel}` : `Question ${qIdx + 1}`}
                      </div>
                      <span style={{
                        fontSize: isMobile ? 11 : 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                        background: 'var(--ctx-bg)', border: '1px solid var(--border)', color: 'var(--text-2)',
                      }}>
                        {typeBadge}
                      </span>
                      <button
                        onClick={() => setReportOpen(true)}
                        title="Report an issue with this question"
                        style={{
                          fontSize: isMobile ? 10 : 11, padding: '3px 10px', borderRadius: 20,
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text-4)', cursor: 'pointer', transition: 'all .12s',
                          touchAction: 'manipulation',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        ⚑ Report
                      </button>
                    </div>
                    <QuestionTimer
                      duration={timerMins * 60}
                      running={timerRunning && !submitted}
                      onExpire={handleTimerExpire}
                      resetKey={timerResetKey}
                    />
                  </div>

                  {currentQ.context && <ContextBlock text={currentQ.context} />}
                  {currentQ.image && (
                    <div style={{ marginBottom: 20 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentQ.image} alt="Question diagram" style={{ maxWidth: '100%', maxHeight: isMobile ? 200 : 260, borderRadius: 8 }} />
                    </div>
                  )}
                  {currentQ.text && (
                    <div style={{ marginBottom: 12, fontSize: isMobile ? 14 : 15, lineHeight: 1.75 }}>
                      <MarkdownRenderer text={currentQ.text} />
                    </div>
                  )}
                  {currentQ.type === 'quantitative_comparison' && !currentQ.text && (
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontStyle: 'italic' }}>
                      Compare the two quantities and choose A, B, C, or D.
                    </p>
                  )}
                  {timedOut && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 16, background: 'var(--warn-bg)',
                      border: '1px solid var(--warn-bd)', borderRadius: 8,
                      padding: '10px 16px', color: 'var(--warn-txt)',
                      fontSize: isMobile ? 12 : 13, fontWeight: 500, animation: 'fadeUp .2s',
                      flexWrap: 'wrap',
                    }}>
                      ⏱ Time&apos;s up!
                      {(currentQ.type === 'quantitative_comparison' || currentQ.type === 'multiple_choice') && ` Correct: (${currentQ.answer})`}
                      {currentQ.type === 'numeric_entry' && ` Correct: ${currentQ.answer}`}
                    </div>
                  )}
                  {currentQ.type === 'quantitative_comparison' && (
                    <QCRenderer q={currentQ} selected={qcSelected} submitted={submitted} onSelect={setQcSelected} />
                  )}
                  {currentQ.type === 'multiple_choice' && (
                    <div style={{ paddingLeft: isMobile ? 0 : 4 }}>
                      <MCRenderer q={currentQ} selectedIdx={mcSelected} submitted={submitted} onSelect={setMcSelected} />
                    </div>
                  )}
                  {currentQ.type === 'numeric_entry' && (
                    <div style={{ paddingLeft: isMobile ? 0 : 4 }}>
                      <NumericRenderer value={numericValue} submitted={submitted} isCorrect={isCorrect} correctAnswer={currentQ.answer as string} onChange={setNumericValue} onSubmit={handleSubmit} />
                    </div>
                  )}
                  {currentQ.type === 'select_all' && (
                    <div style={{ paddingLeft: isMobile ? 0 : 4, paddingBottom: 8 }}>
                      <SelectAllRenderer q={currentQ} selectedSet={selectAllSet} submitted={submitted}
                        onToggle={opt => { if (submitted) return; setSelectAllSet(prev => { const n = new Set(prev); n.has(opt) ? n.delete(opt) : n.add(opt); return n; }); }}
                      />
                    </div>
                  )}

                  {/* Source Attribution */}
                  {(qSource || qChapter) && (
                    <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <span style={{ fontSize: 12, opacity: 0.4, flexShrink: 0, marginTop: 1 }}>📖</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--text-4)', lineHeight: 1.5, fontStyle: 'italic' }}>
                          {qSource}
                          {qChapter != null && <span style={{ fontStyle: 'normal', fontWeight: 600 }}> · Ch. {qChapter}</span>}
                        </div>
                        {currentSimilarQ && (
                          <div style={{ marginTop: 3, fontSize: 10, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '1px 6px' }}>
                              Practice question{parentQLabel ? ` · similar to ${parentQLabel}` : ''}
                            </span>
                            <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>· not counted in score</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom padding — extra on mobile to clear floating buttons */}
                  <div style={{ height: isMobile ? 80 : 24 }} />
                </div>
              </div>

              {/* ── Bottom bar ── */}
              <div style={{
                borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
                padding: bottomBarPad,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0, gap: 8,
              }}>
                <button
                  onClick={() => navigate(-1)}
                  disabled={!currentSimilarQ && qIdx === 0}
                  style={{
                    background: 'var(--btn-bg)', border: '1px solid var(--btn-bd)', borderRadius: 8,
                    padding: isMobile ? '10px 16px' : '8px 18px',
                    fontSize: isMobile ? 13 : 13,
                    cursor: (!currentSimilarQ && qIdx === 0) ? 'not-allowed' : 'pointer',
                    color: currentSimilarQ ? '#16a34a' : 'var(--btn-txt)',
                    opacity: (!currentSimilarQ && qIdx === 0) ? 0.4 : 1,
                    touchAction: 'manipulation', whiteSpace: 'nowrap',
                  }}
                >
                  {currentSimilarQ ? '← Back' : '← Prev'}
                </button>

                {/* Dot navigation — hide on very small screens */}
                {!currentSimilarQ && !isMobile ? (
                  <div style={{ display: 'flex', gap: 5 }}>
                    {questions.slice(Math.max(0, qIdx - 3), Math.min(questions.length, qIdx + 4)).map((_, i) => {
                      const abs = Math.max(0, qIdx - 3) + i;
                      const res = results[questions[abs]?.id];
                      return (
                        <div key={abs} onClick={() => setQIdx(abs)} style={{ width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', background: abs === qIdx ? 'var(--text-1)' : res === 'correct' ? 'var(--ok)' : res === 'incorrect' ? 'var(--err)' : 'var(--border)', transition: 'background .15s' }} />
                      );
                    })}
                  </div>
                ) : (
                  /* On mobile: show compact progress */
                  !currentSimilarQ ? (
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
                      {answeredCount}/{questions.length} done
                    </span>
                  ) : <div />
                )}

                {!submitted
                  ? (
                    <button
                      onClick={handleSubmit} disabled={!canSubmit}
                      style={{
                        background: canSubmit ? 'var(--submit-bg)' : 'var(--border)',
                        color: canSubmit ? 'var(--submit-txt)' : 'var(--text-3)',
                        border: 'none', borderRadius: 8,
                        padding: isMobile ? '10px 22px' : '9px 28px',
                        fontWeight: 700, fontSize: isMobile ? 14 : 14,
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        touchAction: 'manipulation', whiteSpace: 'nowrap',
                      }}
                    >
                      Submit
                    </button>
                  ) : currentSimilarQ ? (
                    <button
                      onClick={() => setCurrentSimilarQ(null)}
                      style={{
                        background: 'var(--submit-bg)', color: 'var(--submit-txt)',
                        border: 'none', borderRadius: 8,
                        padding: isMobile ? '10px 18px' : '9px 24px',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        touchAction: 'manipulation', whiteSpace: 'nowrap',
                      }}
                    >
                      Back to Q{qIdx + 1}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(1)} disabled={qIdx >= questions.length - 1}
                      style={{
                        background: 'var(--submit-bg)', color: 'var(--submit-txt)',
                        border: 'none', borderRadius: 8,
                        padding: isMobile ? '10px 22px' : '9px 24px',
                        fontWeight: 700, fontSize: 14,
                        cursor: qIdx >= questions.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: qIdx >= questions.length - 1 ? 0.4 : 1,
                        touchAction: 'manipulation', whiteSpace: 'nowrap',
                      }}
                    >
                      Next →
                    </button>
                  )
                }
              </div>
            </div>

            {/* InsightPanel — hidden on mobile (shown as bottom sheet inside the component) */}
            {!isMobile && (
              <InsightPanel
                submitted={submitted} isCorrect={isCorrect} timedOut={timedOut}
                explanation={currentQ.explanation} communityStats={communityStats}
                diffVote={diffVote} onDiffVote={handleDiffVote}
                liked={liked} onLike={handleLike}
              />
            )}
          </div>
        </div>

        {/* InsightPanel for mobile (bottom sheet, rendered outside layout flow) */}
        {isMobile && (
          <InsightPanel
            submitted={submitted} isCorrect={isCorrect} timedOut={timedOut}
            explanation={currentQ.explanation} communityStats={communityStats}
            diffVote={diffVote} onDiffVote={handleDiffVote}
            liked={liked} onLike={handleLike}
          />
        )}

        <Sidebar
          activeTopicId={activeTopicId}
          expandedTopicId={expandedTopicId}
          qIdx={qIdx}
          activeQId={currentQ.id}
          results={results}
          similarResults={similarResults}
          completedTopics={completedTopics}
          topicProgressMap={topicProgressMap}
          unlockedTopics={unlockedTopics}
          isPro={isPro}
          mockLocked={mockLocked}
          darkMode={dark}
          user={user}
          onTopicToggle={handleTopicToggle}
          onQuestionClick={handleSidebarQClick}
          onSimilarClick={handleSimilarClick}
          onReAttempt={handleReAttempt}
          onOpenSettings={() => setShowSettings(true)}
          onOpenMockTest={handleOpenMockTest}
          onUpgradeRequired={handleUpgradeRequired}
        />
      </div>

      <SettingsModal
        open={showSettings} onClose={() => setShowSettings(false)}
        timerMinutes={timerMins} onTimerChange={handleTimerChange}
        darkMode={dark} onDarkModeChange={setDark}
        isPro={isPro}
        user={user} onLogout={handleLogout} onNameSave={handleNameSave}
      />
    </>
  );
}