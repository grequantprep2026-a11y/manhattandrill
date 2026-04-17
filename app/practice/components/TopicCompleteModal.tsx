'use client';

/**
 * TopicCompleteModal.tsx
 * Academic, sleek — matches practice page aesthetic.
 * Fully responsive for all devices.
 */

import { useEffect, useState } from 'react';
import type { TopicAttemptRecord } from '../../lib/types';

interface TopicCompleteModalProps {
  topicLabel:     string;
  totalQuestions: number;
  correctCount:   number;
  attemptNumber:  number;
  attemptHistory: TopicAttemptRecord[];
  onReAttempt:    () => void;
  onClose:        () => void;
}

export function TopicCompleteModal({
  topicLabel, totalQuestions, correctCount,
  attemptNumber, attemptHistory,
  onReAttempt, onClose,
}: TopicCompleteModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const pct       = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const bestScore = attemptHistory.length > 0
    ? Math.max(...attemptHistory.map(a => a.scorePct), pct)
    : pct;

  const tier =
    pct === 100 ? { label: 'Perfect',    color: '#16a34a', bg: '#f0fdf4', bd: '#bbf7d0', emoji: '◆' } :
    pct >= 80   ? { label: 'Excellent',  color: '#2563eb', bg: '#eff6ff', bd: '#bfdbfe', emoji: '▲' } :
    pct >= 60   ? { label: 'Good',       color: '#d97706', bg: '#fffbeb', bd: '#fde68a', emoji: '●' } :
                  { label: 'Keep at it', color: '#dc2626', bg: '#fef2f2', bd: '#fecaca', emoji: '○' };

  const scoreColor = (s: number) =>
    s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

  const pastAttempts = [...attemptHistory].sort((a, b) => b.attemptNumber - a.attemptNumber);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 24,
        animation: 'fadeUp .18s',
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: isMobile ? 'none' : '1px solid var(--border)',
        borderRadius: isMobile ? '16px 16px 0 0' : 16,
        width: '100%',
        maxWidth: isMobile ? '100%' : 400,
        boxShadow: '0 8px 32px rgba(0,0,0,.12)',
        animation: 'fadeUp .2s',
        maxHeight: isMobile ? '92vh' : '88vh',
        overflowY: 'auto',
        fontFamily: 'Georgia, "Times New Roman", serif',
        // On mobile: stick to bottom like a sheet
        ...(isMobile ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
        } : {}),
      }}>

        {/* Score header strip */}
        <div style={{
          background: tier.bg,
          borderBottom: `1px solid ${tier.bd}`,
          borderRadius: isMobile ? '16px 16px 0 0' : '16px 16px 0 0',
          padding: isMobile ? '20px 20px 16px' : '24px 28px 20px',
          textAlign: 'center',
        }}>
          {/* Tier badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            border: `1px solid ${tier.bd}`,
            borderRadius: 4, padding: '2px 10px', marginBottom: isMobile ? 10 : 14,
            fontSize: 10, fontWeight: 700, color: tier.color,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            {tier.emoji} &nbsp;{tier.label} · Attempt #{attemptNumber}
          </div>

          {/* Big score */}
          <div style={{
            fontSize: isMobile ? 48 : 56,
            fontWeight: 400, color: tier.color,
            lineHeight: 1, marginBottom: 4, fontFamily: 'Georgia, serif',
          }}>
            {pct}<span style={{ fontSize: isMobile ? 20 : 24, opacity: .6 }}>%</span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>
            {correctCount} of {totalQuestions} correct · {topicLabel}
          </div>

          {/* Progress bar */}
          <div style={{
            height: 5, borderRadius: 3,
            background: `${tier.color}22`,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: tier.color,
              borderRadius: 3, transition: 'width .7s ease',
            }} />
          </div>

          {bestScore > pct && (
            <div style={{
              marginTop: 10, fontSize: 11,
              color: '#16a34a', fontFamily: 'system-ui, sans-serif',
            }}>
              Personal best: {bestScore}%
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '16px 20px 24px' : '20px 28px 24px' }}>

          {/* Attempt history */}
          {pastAttempts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
                textTransform: 'uppercase', letterSpacing: '.08em',
                marginBottom: 10, fontFamily: 'system-ui, sans-serif',
              }}>
                History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pastAttempts.map(a => {
                  const isCurrent = a.attemptNumber === attemptNumber;
                  return (
                    <div key={a.attemptNumber} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px',
                      background: isCurrent ? `${scoreColor(a.scorePct)}08` : 'transparent',
                      border: `1px solid ${isCurrent ? scoreColor(a.scorePct) + '30' : 'var(--border)'}`,
                      borderRadius: 8,
                      fontFamily: 'system-ui, sans-serif',
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', minWidth: 60, flexShrink: 0 }}>
                        #{a.attemptNumber}{isCurrent ? ' ←' : ''}
                      </div>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${a.scorePct}%`,
                          background: scoreColor(a.scorePct), borderRadius: 2,
                        }} />
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: scoreColor(a.scorePct),
                        minWidth: 38, textAlign: 'right', flexShrink: 0,
                      }}>
                        {a.scorePct}%
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0 }}>
                        {a.correctAnswers}/{a.totalQuestions}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 8, fontFamily: 'system-ui, sans-serif',
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: isMobile ? '13px 0' : '10px 0',
                fontSize: 12, fontWeight: 600,
                background: 'transparent', color: 'var(--text-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', letterSpacing: '.01em',
                touchAction: 'manipulation',
              }}
            >
              Close
            </button>
            <button
              onClick={onReAttempt}
              style={{
                flex: 1, padding: isMobile ? '13px 0' : '10px 0',
                fontSize: 12, fontWeight: 700,
                background: 'var(--text-1)', color: 'var(--bg-card)',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                letterSpacing: '.01em', touchAction: 'manipulation',
              }}
            >
              Re-attempt →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}