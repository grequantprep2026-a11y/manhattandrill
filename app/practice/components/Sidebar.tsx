'use client';

/**
 * Sidebar.tsx
 *
 * PAYWALL CHANGES:
 * - Receives `isPro` prop
 * - Topics at index > 0 in TOPIC_REGISTRY are paywalled for free users:
 *   clicking them calls onUpgradeRequired() instead of navigating
 * - Mock Test button calls onUpgradeRequired() for free users who have
 *   already used their 1 free attempt (controlled by parent via `mockLocked`)
 * - Locked-by-paywall topics show a ★ icon instead of 🔒
 *   (🔒 is reserved for score-based unlock within Pro plan)
 *
 * FEEDBACK CHANGE:
 * - "Suggest a Feature" footer link opens FeedbackModal directly inside Sidebar
 *   No prop threading needed — state is local to this component.
 *
 * RESPONSIVE CHANGE:
 * - On mobile (<768px) sidebar is hidden behind a hamburger toggle
 * - Slides in from the right as a full-height overlay drawer
 * - Close on backdrop click or X button
 */

import { useMemo, useState, useEffect }   from 'react';
import { StatusIcon }                      from './ui';
import { useRouter }                       from 'next/navigation';
import { truncate, qTypeLabel, stripMarkdown } from '../utils/helpers';
import {
  TOPIC_REGISTRY, getTopicQuestions, getMixedQuestions, getSimilarQuestions,
} from '../../lib/registry/registry';
import type { UnifiedQuestion } from '../../lib/adapter/adapter';
import { FeedbackModal }        from '../../components/FeedbackModel';

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < bp);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [bp]);
  return isMobile;
}

// ── SidebarSection ────────────────────────────────────────────────────────────

interface SidebarSectionProps {
  label:              string;
  topicId:            string;
  topicIndex:         number;
  isActive:           boolean;
  isExpanded:         boolean;
  questions:          UnifiedQuestion[];
  activeQIdx:         number;
  activeQId:          string | undefined;
  results:            Record<string, 'correct' | 'incorrect'>;
  similarResults:     Record<string, 'correct' | 'incorrect'>;
  isCompleted:        boolean;
  isScoreLocked:      boolean;
  isPaywalled:        boolean;
  attemptCount:       number;
  onHeaderClick:      (id: string) => void;
  onQuestionClick:    (topicId: string, idx: number) => void;
  onSimilarClick:     (topicId: string, parentIdx: number, simIdx: number) => void;
  onReAttempt:        (topicId: string) => void;
  onUpgradeRequired:  () => void;
}

function SidebarSection({
  label, topicId, topicIndex, isActive, isExpanded,
  questions, activeQIdx, activeQId,
  results, similarResults,
  isCompleted, isScoreLocked, isPaywalled, attemptCount,
  onHeaderClick, onQuestionClick, onSimilarClick, onReAttempt, onUpgradeRequired,
}: SidebarSectionProps) {

  const [expandedSimId, setExpandedSimId] = useState<string | null>(null);

  const isLocked      = isScoreLocked || isPaywalled;
  const answeredCount = questions.filter(q => results[q.id]).length;
  const correctCount  = questions.filter(q => results[q.id] === 'correct').length;
  const scorePct      = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const progressWidth = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  function handleHeaderClick() {
    if (isPaywalled) { onUpgradeRequired(); return; }
    if (isScoreLocked) return;
    onHeaderClick(topicId);
  }

  const lockIcon  = isPaywalled ? '★' : '🔒';
  const lockTitle = isPaywalled
    ? 'Upgrade to Pro to unlock this topic'
    : 'Complete the previous topic with ≥80% to unlock';

  return (
    <div style={{ borderBottom: '1px solid var(--border-s)' }}>

      {/* ── Topic header ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={handleHeaderClick}
          title={isLocked ? lockTitle : label}
          style={{
            flex: 1, background: isActive ? 'var(--sidebar-act)' : 'transparent',
            border: 'none', padding: '11px 14px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: isLocked ? (isPaywalled ? 'pointer' : 'not-allowed') : 'pointer',
            textAlign: 'left',
            opacity: isLocked ? 0.55 : 1, transition: 'opacity .15s',
            touchAction: 'manipulation',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {isLocked && (
                <span style={{
                  fontSize: isPaywalled ? 9 : 10, flexShrink: 0,
                  color: isPaywalled ? '#b45309' : undefined,
                  fontWeight: isPaywalled ? 700 : undefined,
                }}>
                  {lockIcon}
                </span>
              )}
              <span style={{ fontSize: 12.5, fontWeight: isActive ? 700 : 600, color: 'var(--text-1)', lineHeight: 1.3, minWidth: 0 }}>
                {label}
              </span>
              {isCompleted && !isLocked && <span style={{ fontSize: 10, color: 'var(--ok)', flexShrink: 0 }}>✓</span>}
              {isPaywalled && (
                <span style={{
                  fontSize: 8.5, fontWeight: 700, color: '#b45309',
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 3, padding: '1px 5px', flexShrink: 0,
                }}>
                  PRO
                </span>
              )}
            </div>

            {!isLocked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progressWidth}%`,
                    background: isCompleted
                      ? (scorePct >= 80 ? 'var(--ok)' : scorePct >= 50 ? '#f59e0b' : 'var(--err)')
                      : answeredCount > 0 ? 'var(--text-3)' : 'transparent',
                    borderRadius: 2, transition: 'width .3s',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {answeredCount}/{questions.length}
                  {isCompleted && ` · ${scorePct}%`}
                </span>
              </div>
            )}

            {!isLocked && attemptCount > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                Attempt #{attemptCount}
              </div>
            )}
          </div>

          {!isLocked && (
            <span style={{
              color: 'var(--text-4)', fontSize: 11, marginLeft: 8, flexShrink: 0,
              transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .18s',
            }}>▾</span>
          )}
        </button>

        {/* Retry button */}
        {!isLocked && (
          <button
            onClick={() => isCompleted && onReAttempt(topicId)}
            title={isCompleted ? 'Re-attempt this topic' : 'Complete the topic to retry'}
            style={{
              padding: '8px 10px', background: 'transparent', border: 'none',
              cursor: isCompleted ? 'pointer' : 'not-allowed',
              fontSize: 13, opacity: isCompleted ? 1 : 0.2,
              color: isCompleted ? 'var(--ok)' : 'var(--text-4)',
              transition: 'opacity .15s', flexShrink: 0,
              touchAction: 'manipulation',
            }}
            aria-disabled={!isCompleted}
          >🔁</button>
        )}
      </div>

      {/* ── Expanded question list ── */}
      {isExpanded && !isLocked && (
        <div style={{ padding: '4px 8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {questions.map((q, idx) => {
            const isCurrent = isActive && idx === activeQIdx && activeQId === q.id;
            const res       = results[q.id];
            const simQs     = getSimilarQuestions(topicId, q.id);
            const isSimOpen = expandedSimId === q.id;

            return (
              <div key={q.id}>
                {/* Main question row */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <button
                    onClick={() => onQuestionClick(topicId, idx)}
                    style={{
                      flex: 1, textAlign: 'left',
                      border: isCurrent ? '1px solid var(--check-act-bd)' : '1px solid transparent',
                      background: isCurrent ? 'var(--sidebar-act)' : 'transparent',
                      borderRadius: 8, padding: '7px 4px 7px 10px',
                      cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8,
                      transition: 'background .1s', touchAction: 'manipulation',
                    }}
                  >
                    <StatusIcon status={res ?? 'unattempted'} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-1)' }}>Q{idx + 1}</span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                          border: '1px solid var(--border)', color: 'var(--text-3)', background: 'var(--ctx-bg)',
                        }}>
                          {qTypeLabel(q.type)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-2)' }}>
                        {truncate(stripMarkdown(q.text ?? q.quantityA ?? ''), 50)}
                      </div>
                    </div>
                  </button>

                  {simQs.length > 0 && (
                    <button
                      onClick={() => setExpandedSimId(prev => prev === q.id ? null : q.id)}
                      title={`${simQs.length} similar practice questions`}
                      style={{
                        padding: '8px 5px 8px 3px', background: 'transparent', border: 'none',
                        cursor: 'pointer', flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        color: isSimOpen ? 'var(--ok)' : 'var(--text-4)', transition: 'color .12s',
                        touchAction: 'manipulation',
                      }}
                      onMouseEnter={e => { if (!isSimOpen) e.currentTarget.style.color = 'var(--text-2)'; }}
                      onMouseLeave={e => { if (!isSimOpen) e.currentTarget.style.color = 'var(--text-4)'; }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{simQs.length}</span>
                      <span style={{ fontSize: 8, display: 'inline-block', transform: isSimOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', lineHeight: 1 }}>▼</span>
                    </button>
                  )}
                </div>

                {/* Similar questions sub-list */}
                {isSimOpen && simQs.length > 0 && (
                  <div style={{ marginLeft: 6, marginTop: 2, marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.07em', padding: '3px 0 2px 4px' }}>
                      Practice · not scored
                    </div>
                    {simQs.map((sq, simIdx) => {
                      const simLabel = `${idx + 1}.${simIdx + 1}`;
                      const isSimCur = activeQId === sq.id;
                      const simRes   = similarResults[sq.id];
                      return (
                        <button
                          key={sq.id}
                          onClick={() => onSimilarClick(topicId, idx, simIdx)}
                          style={{
                            width: '100%', textAlign: 'left',
                            border: isSimCur ? '1px solid var(--check-act-bd)' : '1px solid transparent',
                            background: isSimCur ? 'var(--sidebar-act)' : 'transparent',
                            borderRadius: 7, padding: '5px 8px 5px 6px',
                            cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 6,
                            transition: 'background .1s', marginBottom: 1,
                            touchAction: 'manipulation',
                          }}
                        >
                          <StatusIcon status={simRes ?? 'unattempted'} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-1)' }}>Q{simLabel}</span>
                              <span style={{ fontSize: 9, fontWeight: 600, padding: '0px 4px', borderRadius: 3, border: '1px solid var(--border)', color: 'var(--text-4)', background: 'var(--ctx-bg)' }}>{qTypeLabel(sq.type)}</span>
                              <span style={{ fontSize: 8, padding: '0px 4px', borderRadius: 3, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontWeight: 600 }}>✦</span>
                            </div>
                            <div style={{ fontSize: 10.5, lineHeight: 1.35, color: 'var(--text-3)' }}>
                              {truncate(stripMarkdown(sq.text ?? sq.quantityA ?? ''), 50)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Full Sidebar ──────────────────────────────────────────────────────────────

interface SidebarProps {
  activeTopicId:     string;
  expandedTopicId:   string | null;
  qIdx:              number;
  activeQId:         string | undefined;
  results:           Record<string, 'correct' | 'incorrect'>;
  similarResults:    Record<string, 'correct' | 'incorrect'>;
  completedTopics:   Set<string>;
  topicProgressMap:  Record<string, any>;
  unlockedTopics:    Set<string>;
  isPro:             boolean;
  mockLocked:        boolean;
  darkMode:          boolean;
  user:              { uid: string; displayName?: string | null; email?: string | null } | null;
  onTopicToggle:     (id: string) => void;
  onQuestionClick:   (topicId: string, idx: number) => void;
  onSimilarClick:    (topicId: string, parentIdx: number, simIdx: number) => void;
  onReAttempt:       (topicId: string) => void;
  onOpenSettings:    () => void;
  onOpenMockTest:    () => void;
  onUpgradeRequired: (reason?: 'topic' | 'mock') => void;
}

export function Sidebar({
  activeTopicId, expandedTopicId, qIdx, activeQId,
  results, similarResults,
  completedTopics, topicProgressMap, unlockedTopics,
  isPro, mockLocked,
  darkMode, user,
  onTopicToggle, onQuestionClick, onSimilarClick, onReAttempt,
  onOpenSettings, onOpenMockTest, onUpgradeRequired,
}: SidebarProps) {

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const isMobile = useIsMobile();

  const topicQuestions = useMemo(() => {
    const map: Record<string, UnifiedQuestion[]> = {};
    for (const t of TOPIC_REGISTRY) map[t.id] = getTopicQuestions(t.id);
    map['mixed'] = getMixedQuestions();
    return map;
  }, []);

  const effectiveUnlocked = useMemo(() => {
    if (unlockedTopics.size > 0) return unlockedTopics;
    const unlocked = new Set<string>();
    TOPIC_REGISTRY.forEach((t, i) => {
      if (i === 0) { unlocked.add(t.id); return; }
      const prevBest = topicProgressMap[TOPIC_REGISTRY[i - 1].id]?.bestScore ?? 0;
      if (prevBest >= 80) unlocked.add(t.id);
    });
    unlocked.add('mixed');
    return unlocked;
  }, [unlockedTopics, topicProgressMap]);

  const router = useRouter();

  function handleMockClick() {
    if (!isPro && mockLocked) {
      onUpgradeRequired('mock');
      return;
    }
    router.push('/mock-test');
  }

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTopicId]);

  const sidebarContent = (
    <>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.01em' }}>
          Manhattan 5lb Official practice problems
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: 'transparent', border: 'none', padding: '4px 8px',
              cursor: 'pointer', fontSize: 18, color: 'var(--text-3)',
              touchAction: 'manipulation', flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Mock Test Entry */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={handleMockClick}
          style={{
            width: '100%', textAlign: 'left',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            border: 'none', borderRadius: 10,
            padding: '11px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(29,78,216,.2)',
            transition: 'transform .12s, box-shadow .12s',
            position: 'relative',
            touchAction: 'manipulation',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(29,78,216,.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(29,78,216,.2)';
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              GRE Official Mock Test
              {!isPro && (
                <span style={{ fontSize: 8.5, fontWeight: 700, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 3, padding: '1px 5px', color: '#fde68a' }}>
                  1 FREE
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>
              2 sections · 20 Qs each · 35 min
              {!isPro && mockLocked && (
                <span style={{ color: '#fca5a5', display: 'block', marginTop: 2 }}>✗ Upgrade for more attempts</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,.8)' }}>→</span>
        </button>
      </div>

      {/* Lock notice */}
      <div style={{
        padding: '8px 14px', background: 'var(--acc-bg)',
        borderBottom: '1px solid var(--acc-bd)',
        fontSize: 10.5, color: 'var(--acc)', lineHeight: 1.5, flexShrink: 0,
      }}>
        {isPro
          ? '🔓 Score ≥80% to unlock the next topic'
          : '★ Free: Topic 1 only · Upgrade for all 23 topics'
        }
      </div>

      {/* Topic list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {TOPIC_REGISTRY.map((t, topicIndex) => {
          const isScoreLocked = isPro && !effectiveUnlocked.has(t.id);
          const isPaywalled   = !isPro && topicIndex > 0;

          const p       = topicProgressMap[t.id];
          const attempt = p?.attemptNumber ?? (completedTopics.has(t.id) ? 1 : 0);

          return (
            <SidebarSection
              key={t.id}
              label={t.label}
              topicId={t.id}
              topicIndex={topicIndex}
              isActive={activeTopicId === t.id}
              isExpanded={expandedTopicId === t.id}
              questions={topicQuestions[t.id] ?? []}
              activeQIdx={activeTopicId === t.id ? qIdx : -1}
              activeQId={activeTopicId === t.id ? activeQId : undefined}
              results={results}
              similarResults={similarResults}
              isCompleted={completedTopics.has(t.id)}
              isScoreLocked={isScoreLocked}
              isPaywalled={isPaywalled}
              attemptCount={attempt}
              onHeaderClick={onTopicToggle}
              onQuestionClick={onQuestionClick}
              onSimilarClick={onSimilarClick}
              onReAttempt={onReAttempt}
              onUpgradeRequired={() => onUpgradeRequired('topic')}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--border)',
        flexShrink: 0, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <button
          onClick={() => setFeedbackOpen(true)}
          style={{
            marginLeft: '4px',
            background: 'transparent', border: 'none',
            fontSize: 10.5, color: 'var(--text-4)',
            cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
            textDecoration: 'none',
            touchAction: 'manipulation',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; }}
        >
          ^ Suggest feature
        </button>
        {['Terms', 'Privacy', 'Home'].map(l => (
          <a key={l} href={`/${l.toLowerCase()}`}
            style={{ fontSize: 10.5, color: 'var(--text-4)', textDecoration: 'none' }}>
            {l}
          </a>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile: hamburger toggle button ── */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', bottom: 90, right: 20, zIndex: 150,
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,.12)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--text-1)',
            touchAction: 'manipulation',
          }}
          aria-label="Open topics"
        >
          ☰
        </button>
      )}

      {/* ── Mobile: backdrop ── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 198,
            background: 'rgba(0,0,0,.35)',
          }}
        />
      )}

      {/* ── Sidebar panel ── */}
      <div style={{
        width: 280, flexShrink: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
        overflow: 'hidden',

        // Mobile: fixed overlay, slides in/out
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 199,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s ease',
          boxShadow: mobileOpen ? '-4px 0 24px rgba(0,0,0,.12)' : 'none',
          width: Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.88 : 300),
        } : {}),
      }}>
        {sidebarContent}
      </div>

      {/* ── FeedbackModal ── */}
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        darkMode={darkMode}
        user={user}
      />
    </>
  );
}