'use client';

/**
 * InsightPanel.tsx — academic/white aesthetic
 * No gray box fills anywhere. Dividers are thin lines.
 * Text does all the work.
 * Fully responsive for all devices.
 */

import { useEffect, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DifficultyVote }   from './ui';
import type { DifficultyLevel, QuestionStats } from '../../lib/types';

interface Props {
  submitted:      boolean;
  isCorrect:      boolean | null;
  timedOut:       boolean;
  explanation:    string;
  communityStats: QuestionStats | null;
  diffVote:       DifficultyLevel | null;
  onDiffVote:     (v: DifficultyLevel) => void;
  liked:          boolean;
  onLike:         () => void;
}

export function InsightPanel({
  submitted, isCorrect, timedOut,
  explanation, communityStats,
  diffVote, onDiffVote,
  liked, onLike,
}: Props) {

  const [isMobile, setIsMobile]   = useState(false);
  const [isTablet, setIsTablet]   = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth >= 600 && window.innerWidth < 900);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (submitted && isMobile) setPanelOpen(true);
  }, [submitted, isMobile]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isMobile && panelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, panelOpen]);

  const totalVotes = communityStats
    ? (communityStats.easyVotes ?? 0) + (communityStats.mediumVotes ?? 0) + (communityStats.hardVotes ?? 0)
    : 0;
  const likedCount = communityStats?.likedCount ?? 0;

  const panelWidth = isMobile ? '100%' : isTablet ? 240 : 288;

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Floating hint when not submitted */}
        {!submitted && (
          <div style={{
            position: 'fixed', bottom: 72, right: 16, zIndex: 100,
          }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 11, color: 'var(--text-4)',
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            }}>
              💡 Submit to see insights
            </div>
          </div>
        )}

        {submitted && (
          <>
            {/* Toggle tab — sits just above the sheet */}
            <button
              onClick={() => setPanelOpen(p => !p)}
              style={{
                position: 'fixed',
                bottom: panelOpen ? 'calc(75vh + 8px)' : 72,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 201,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '6px 16px',
                fontSize: 11, fontWeight: 700, color: 'var(--text-2)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'bottom .3s ease',
                touchAction: 'manipulation',
                whiteSpace: 'nowrap',
              }}
            >
              {panelOpen ? '▼ Hide insights' : '▲ Show insights'}
            </button>

            {/* Backdrop */}
            {panelOpen && (
              <div
                onClick={() => setPanelOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 199,
                  background: 'rgba(0,0,0,.25)',
                }}
              />
            )}

            {/* Sheet — 75vh, fully scrollable inside */}
            <div
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                height: '75vh',          // taller sheet
                zIndex: 200,
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                borderRadius: '16px 16px 0 0',
                boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
                transform: panelOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform .3s ease',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',       // clip at sheet edges
              }}
            >
              {/* Drag handle */}
              <div style={{
                flexShrink: 0,
                display: 'flex', justifyContent: 'center',
                padding: '10px 0 6px',
              }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>

              {/* ← THIS is the key fix: scrollable inner wrapper */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',  // smooth iOS scroll
                padding: '4px 20px 40px',           // generous bottom padding
              }}>
                <PanelContent
                  submitted={submitted} isCorrect={isCorrect} timedOut={timedOut}
                  explanation={explanation} communityStats={communityStats}
                  diffVote={diffVote} onDiffVote={onDiffVote}
                  liked={liked} onLike={onLike}
                  totalVotes={totalVotes} likedCount={likedCount}
                />
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop / tablet placeholder ──────────────────────────────────────────
  if (!submitted) {
    return (
      <div style={{ ...panelStyle, width: panelWidth }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, padding: 28,
          textAlign: 'center', flex: 1, minHeight: 0,
        }}>
          <div style={{ fontSize: 22, opacity: .25 }}>💡</div>
          <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6, maxWidth: 170 }}>
            Submit answer to see explanation &amp; stats
          </p>
        </div>
      </div>
    );
  }

  // ── Desktop / tablet full panel ───────────────────────────────────────────
  return (
    <div style={{ ...panelStyle, width: panelWidth }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          overflowY: 'auto', overflowX: 'hidden',
          padding: isTablet ? '16px 14px 12px' : '20px 18px 16px',
          display: 'flex', flexDirection: 'column',
          animation: 'slideIn .2s',
        }}>
          <PanelContent
            submitted={submitted} isCorrect={isCorrect} timedOut={timedOut}
            explanation={explanation} communityStats={communityStats}
            diffVote={diffVote} onDiffVote={onDiffVote}
            liked={liked} onLike={onLike}
            totalVotes={totalVotes} likedCount={likedCount}
          />
        </div>
      </div>
    </div>
  );
}

// ── Inner content ─────────────────────────────────────────────────────────────
function PanelContent({
  submitted, isCorrect, timedOut,
  explanation, communityStats,
  diffVote, onDiffVote,
  liked, onLike,
  totalVotes, likedCount,
}: Props & { totalVotes: number; likedCount: number }) {

  const resultColor = isCorrect ? 'var(--ok)' : timedOut ? 'var(--acc)' : 'var(--err)';
  const resultLabel = isCorrect ? '✓ Correct' : timedOut ? '⏱ Time\'s up' : '✗ Incorrect';

  return (
    <>
      {/* Result line */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: resultColor,
        letterSpacing: '.02em', marginBottom: 14,
        textTransform: 'uppercase', flexShrink: 0,
      }}>
        {resultLabel}
      </div>

      {/* Explanation */}
      <div style={{ ...sectionLabel, flexShrink: 0 }}>Explanation</div>
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <MarkdownRenderer text={explanation} />
      </div>

      <div style={{ ...divider, flexShrink: 0 }} />

      {/* Community */}
      <div style={{ ...sectionLabel, flexShrink: 0 }}>Community</div>

      <div style={{
        fontSize: 12, color: 'var(--text-3)',
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5,
        flexShrink: 0,
      }}>
        <span style={{ color: likedCount > 0 ? 'var(--ok)' : 'var(--text-4)' }}>
          {likedCount > 0 ? `${likedCount} found this helpful` : 'No helpful votes yet'}
        </span>
      </div>

      <div style={{ flexShrink: 0 }}>
        {totalVotes > 0 ? (
          <DiffBar
            easy={communityStats!.easyVotes ?? 0}
            medium={communityStats!.mediumVotes ?? 0}
            hard={communityStats!.hardVotes ?? 0}
            total={totalVotes}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 14, fontStyle: 'italic' }}>
            No difficulty votes yet
          </div>
        )}
      </div>

      <div style={{ ...divider, flexShrink: 0 }} />

      {/* Difficulty vote */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <DifficultyVote value={diffVote} onChange={onDiffVote} disabled={!!diffVote} />
        {diffVote && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 5 }}>Voted!</div>
        )}
      </div>

      <div style={{ ...divider, flexShrink: 0 }} />

      {/* Like */}
      <button
        onClick={onLike}
        style={{
          background: 'none', border: 'none',
          padding: '6px 0', cursor: 'pointer',
          fontSize: 12,
          color: liked ? 'var(--ok)' : 'var(--text-4)',
          fontWeight: liked ? 600 : 400,
          textAlign: 'left', transition: 'color .12s',
          flexShrink: 0, touchAction: 'manipulation',
        }}
      >
        {liked ? '👍 Helpful!' : '👍 Mark as helpful'}
      </button>
    </>
  );
}

// ── Difficulty bar ────────────────────────────────────────────────────────────
function DiffBar({ easy, medium, hard, total }: {
  easy: number; medium: number; hard: number; total: number;
}) {
  const p = (n: number) => Math.round((n / total) * 100);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        height: 4, borderRadius: 2, overflow: 'hidden',
        display: 'flex', gap: 1, marginBottom: 6,
      }}>
        {easy   > 0 && <div style={{ flex: easy,   background: 'var(--ok)',  borderRadius: 2 }} />}
        {medium > 0 && <div style={{ flex: medium, background: '#f59e0b',    borderRadius: 2 }} />}
        {hard   > 0 && <div style={{ flex: hard,   background: 'var(--err)', borderRadius: 2 }} />}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
        {easy   > 0 && <span style={{ color: 'var(--ok)'  }}>Easy {p(easy)}%</span>}
        {medium > 0 && <span style={{ color: '#f59e0b'    }}>Med {p(medium)}%</span>}
        {hard   > 0 && <span style={{ color: 'var(--err)' }}>Hard {p(hard)}%</span>}
        <span style={{ color: 'var(--text-4)', marginLeft: 'auto' }}>{total} votes</span>
      </div>
    </div>
  );
}

// ── Shared micro styles ───────────────────────────────────────────────────────
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  textTransform: 'uppercase', letterSpacing: '.08em',
  marginBottom: 8,
};

const divider: React.CSSProperties = {
  height: 1, background: 'var(--border)',
  margin: '14px 0',
};

const panelStyle: React.CSSProperties = {
  flexShrink: 0,
  borderLeft: '1px solid var(--border)',
  background: 'var(--bg-card)',
  display: 'flex', flexDirection: 'column', minHeight: 0,
};