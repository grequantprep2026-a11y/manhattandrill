'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  duration: number;      // seconds
  running: boolean;
  onExpire?: () => void;
  resetKey: number;      // change to reset timer
}

const SIZE = 52;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function QuestionTimer({
  duration,
  running,
  onExpire,
  resetKey,
}: Props) {
  const [remaining, setRemaining] = useState(duration);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);

  // 🔁 Reset timer when question changes
  useEffect(() => {
    setRemaining(duration);
    hasExpiredRef.current = false;
  }, [resetKey, duration]);

  // ⏱️ Start / stop interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!running) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, resetKey]);

  // 🚨 Handle expire SAFELY (no React error)
  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;

        // Delay avoids React render conflict
        setTimeout(() => {
          onExpire?.();
        }, 0);
      }
    }
  }, [remaining, onExpire]);

  // 🎯 UI calculations
  const safeRemaining = Math.max(remaining, 0);
  const pct = safeRemaining / duration;
  const dashOffset = CIRC * (1 - pct);

  const color =
    pct > 0.4
      ? 'var(--brand)'
      : pct > 0.2
      ? 'var(--accent)'
      : 'var(--danger)';

  const mins = Math.floor(safeRemaining / 60);
  const secs = safeRemaining % 60;

  const isUrgent = safeRemaining <= 10;

  return (
    <div
      style={{
        position: 'relative',
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        transform: isUrgent ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.2s',
      }}
    >
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />

        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
          }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            fontFamily: 'var(--font-body)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {mins > 0
            ? `${mins}:${String(secs).padStart(2, '0')}`
            : `${secs}s`}
        </span>
      </div>
    </div>
  );
}