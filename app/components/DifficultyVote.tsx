'use client';
import type { DifficultyLevel } from '../lib/types';

interface Props {
  value:    DifficultyLevel | null;
  onChange: (val: DifficultyLevel) => void;
}

const OPTS: { val: DifficultyLevel; label: string; color: string; bg: string }[] = [
  { val: 'easy',   label: 'Easy',   color: 'var(--success)', bg: 'var(--success-light)' },
  { val: 'medium', label: 'Medium', color: 'var(--accent)',  bg: '#fef3c7' },
  { val: 'hard',   label: 'Hard',   color: 'var(--danger)',  bg: 'var(--danger-light)' },
];

export default function DifficultyVote({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rate:</span>
      {OPTS.map((opt) => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          style={{
            background: value === opt.val ? opt.bg    : 'var(--bg)',
            color:      value === opt.val ? opt.color : 'var(--text-muted)',
            border:     `1px solid ${value === opt.val ? opt.color : 'var(--border)'}`,
            borderRadius: 6, padding: '4px 10px',
            fontFamily: 'var(--font-body)', fontSize: 12,
            fontWeight: value === opt.val ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}