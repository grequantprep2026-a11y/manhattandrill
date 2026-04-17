'use client';

/**
 * TopicUnlockedModal.tsx
 * Academic, sleek — matches practice page aesthetic.
 * Fully responsive for all devices.
 */

import { useEffect, useState } from 'react';

interface TopicUnlockedModalProps {
  unlockedTopicLabel: string;
  scorePct:           number;
  onGoNext:           () => void;
  onClose:            () => void;
}

export function TopicUnlockedModal({
  unlockedTopicLabel,
  scorePct,
  onGoNext,
  onClose,
}: TopicUnlockedModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 12 : 24,
        animation: 'fadeUp .18s',
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: isMobile ? 12 : 16,
        width: '100%',
        maxWidth: isMobile ? '100%' : 360,
        boxShadow: '0 8px 32px rgba(0,0,0,.12)',
        animation: 'fadeUp .2s',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>

        {/* Top accent bar — thin green line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #16a34a, #4ade80, #16a34a)',
        }} />

        {/* Content */}
        <div style={{
          padding: isMobile ? '20px 18px 18px' : '28px 28px 24px',
          textAlign: 'center',
        }}>

          {/* Score pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 4, padding: '3px 12px', marginBottom: isMobile ? 14 : 18,
            fontSize: 10, fontWeight: 700, color: '#16a34a',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            ◆ &nbsp;{scorePct}% · Unlocked
          </div>

          {/* Headline */}
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '.1em',
            fontFamily: 'system-ui, sans-serif',
            marginBottom: 6,
          }}>
            Next Topic Available
          </div>

          <h2 style={{
            fontSize: isMobile ? 18 : 22,
            fontWeight: 400, color: 'var(--text-1)',
            margin: '0 0 12px', lineHeight: 1.3,
            fontFamily: 'Georgia, serif',
          }}>
            {unlockedTopicLabel}
          </h2>

          <p style={{
            fontSize: isMobile ? 12 : 13,
            color: 'var(--text-3)', lineHeight: 1.65,
            margin: isMobile ? '0 0 18px' : '0 0 24px',
            fontFamily: 'Georgia, serif',
          }}>
            You've scored ≥80% and unlocked the next chapter.
            Continue when ready.
          </p>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 8,
            fontFamily: 'system-ui, sans-serif',
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: isMobile ? '12px 0' : '10px 0',
                fontSize: 12, fontWeight: 600,
                background: 'transparent', color: 'var(--text-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', letterSpacing: '.01em',
                touchAction: 'manipulation',
              }}
            >
              Stay here
            </button>
            <button
              onClick={onGoNext}
              style={{
                flex: 1, padding: isMobile ? '12px 0' : '10px 0',
                fontSize: 12, fontWeight: 700,
                background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 8,
                cursor: 'pointer', letterSpacing: '.01em',
                touchAction: 'manipulation',
              }}
            >
              Go to {unlockedTopicLabel} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}