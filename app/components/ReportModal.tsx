'use client';

/**
 * ReportModal.tsx
 * Compact modal — matches UpgradeModal height/style.
 */

import { useState } from 'react';
import { saveQuestionReport } from '../lib/firestore';
import type { ReportReason } from '../lib/types';

interface Props {
  open:         boolean;
  onClose:      () => void;
  uid:          string;
  questionId:   string;
  topicId:      string;
  questionNum:  number;
  questionType: string;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'wrong_answer',     label: 'Wrong answer'    },
  { value: 'unclear_question', label: 'Unclear question' },
  { value: 'typo_error',       label: 'Typo / error'    },
  { value: 'bad_explanation',  label: 'Bad explanation' },
  { value: 'other',            label: 'Other'           },
];

export function ReportModal({ open, onClose, uid, questionId, topicId, questionNum, questionType }: Props) {
  const [reason,    setReason]    = useState<ReportReason | ''>('');
  const [details,   setDetails]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!reason) return;
    setSaving(true);
    try {
      await saveQuestionReport(uid, {
        questionId, topicId,
        reason: reason as ReportReason,
        details: details.trim() || undefined,
        questionNum, questionType,
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Report failed:', e);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setReason(''); setDetails(''); setSubmitted(false); onClose();
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        width: '100%', maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,.14)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Report an issue</div>
            <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>Q{questionNum} · {questionType}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--text-4)', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px 18px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Report submitted</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>Thank you for helping improve the question bank.</div>
              <button onClick={handleClose} style={{ padding: '8px 24px', background: 'var(--text-1)', color: 'var(--bg-card)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <>
              {/* Reason pills — horizontal wrap instead of tall vertical list */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>What's wrong?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REASONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      style={{
                        padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
                        border: reason === r.value ? '1.5px solid var(--text-1)' : '1px solid var(--border)',
                        borderRadius: 20,
                        background: reason === r.value ? 'var(--ctx-bg)' : 'transparent',
                        color: reason === r.value ? 'var(--text-1)' : 'var(--text-3)',
                        cursor: 'pointer', transition: 'all .12s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details — 2 rows max */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Details (optional)</div>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Describe the issue…"
                  maxLength={500}
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 11px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    background: 'transparent', color: 'var(--text-1)',
                    fontSize: 12, lineHeight: 1.5,
                    resize: 'none', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleClose} style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!reason || saving}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700,
                    background: reason && !saving ? 'var(--text-1)' : 'var(--border)',
                    color: reason && !saving ? 'var(--bg-card)' : 'var(--text-3)',
                    border: 'none', borderRadius: 8,
                    cursor: reason && !saving ? 'pointer' : 'not-allowed',
                    transition: 'all .12s',
                  }}
                >
                  {saving ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}