'use client';

/**
 * ui.tsx — shared UI primitives
 * White/transparent everywhere. Borders and text carry state.
 * No gray box fills.
 * Fully responsive — touch-friendly targets on mobile.
 */

import { useState, useEffect, useRef } from 'react';
import type { DifficultyLevel } from '../../lib/types';

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({
  value, onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onClick={() => onChange(!value)}
      onKeyDown={e => e.key === 'Enter' && onChange(!value)}
      style={{
        width: 38, height: 22,
        background: value ? 'var(--text-1)' : 'var(--border)',
        borderRadius: 11, position: 'relative', cursor: 'pointer',
        transition: 'background .18s', flexShrink: 0,
        touchAction: 'manipulation',
        // Larger touch area on mobile via padding trick
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 19 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: 'white',
        transition: 'left .16s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── QuestionTimer ─────────────────────────────────────────────────────────────
export function QuestionTimer({
  duration, running, onExpire, resetKey,
}: {
  duration:  number;
  running:   boolean;
  onExpire?: () => void;
  resetKey:  number;
}) {
  const [rem,  setRem]  = useState(duration);
  const ivRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => { setRem(duration); firedRef.current = false; }, [resetKey, duration]);

  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!running) return;
    ivRef.current = setInterval(() => setRem(p => p - 1), 1000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [running, resetKey]);

  useEffect(() => {
    if (rem <= 0 && !firedRef.current) {
      if (ivRef.current) clearInterval(ivRef.current);
      firedRef.current = true;
      setTimeout(() => onExpire?.(), 0);
    }
  }, [rem, onExpire]);

  const safe  = Math.max(rem, 0);
  const pct   = safe / duration;
  const color = pct > 0.4 ? 'var(--text-3)' : pct > 0.15 ? '#f59e0b' : 'var(--err)';
  const mins  = Math.floor(safe / 60);
  const secs  = safe % 60;

  return (
    <div style={{
      fontSize: 12, fontWeight: 600, color,
      fontFamily: '"JetBrains Mono","Fira Mono","Courier New",monospace',
      letterSpacing: '.04em', userSelect: 'none',
      minWidth: 40, textAlign: 'right',
      transition: 'color .3s',
    }}>
      {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`}
    </div>
  );
}

// ── DifficultyVote ────────────────────────────────────────────────────────────
// No filled backgrounds — active state = colored text + matching border
export function DifficultyVote({
  value, onChange, disabled,
}: {
  value:     DifficultyLevel | null;
  onChange:  (v: DifficultyLevel) => void;
  disabled?: boolean;
}) {
  const opts: { val: DifficultyLevel; label: string; color: string }[] = [
    { val: 'easy',   label: 'Easy',   color: 'var(--ok)'  },
    { val: 'medium', label: 'Medium', color: '#f59e0b'    },
    { val: 'hard',   label: 'Hard',   color: 'var(--err)' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
        Rate:
      </span>
      {opts.map(o => {
        const active = value === o.val;
        return (
          <button
            key={o.val}
            disabled={disabled}
            onClick={() => onChange(o.val)}
            style={{
              background: 'transparent',
              color:  active ? o.color : 'var(--text-4)',
              border: `1px solid ${active ? o.color : 'var(--border)'}`,
              borderRadius: 5, padding: '4px 10px',
              fontSize: 11, fontWeight: active ? 700 : 400,
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all .12s',
              opacity: disabled && !active ? 0.4 : 1,
              touchAction: 'manipulation',
              // Slightly taller touch target on mobile
              minHeight: 30,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── StatusIcon ────────────────────────────────────────────────────────────────
// Sidebar dots — minimal circles
export function StatusIcon({
  status,
}: {
  status: 'correct' | 'incorrect' | 'unattempted';
}) {
  if (status === 'correct')
    return (
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: '1.5px solid var(--ok)', color: 'var(--ok)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, flexShrink: 0,
        background: 'transparent',
      }}>✓</div>
    );
  if (status === 'incorrect')
    return (
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: '1.5px solid var(--err)', color: 'var(--err)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, flexShrink: 0,
        background: 'transparent',
      }}>✕</div>
    );
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      border: '1px solid var(--border)',
      background: 'transparent', flexShrink: 0,
    }} />
  );
}