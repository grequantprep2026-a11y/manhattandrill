'use client';

/**
 * BillingModal.tsx
 *
 * Tabs:
 *  • Refund   — reason, detail, submits to Firestore `billingRequests`
 *  • Cancel   — reason, submits to Firestore `billingRequests`
 *
 * After submit: shows confirmation with 24-hour SLA message + contact email.
 */

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  open:     boolean;
  onClose:  () => void;
  darkMode: boolean;
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
}

type Tab = 'refund' | 'cancel';

const REFUND_REASONS = [
  'Did not meet expectations',
  'Purchased by mistake',
  'Technical issues',
  'Switching to another tool',
  'Other',
] as const;

const CANCEL_REASONS = [
  'No longer studying for GRE',
  'Too expensive',
  'Not using it enough',
  'Switching to another tool',
  'Other',
] as const;

export function BillingModal({ open, onClose, darkMode, user }: Props) {
  const [tab,     setTab]     = useState<Tab>('refund');
  const [success, setSuccess] = useState(false);
  const [refId,   setRefId]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Refund fields
  const [refundReason, setRefundReason] = useState<string>(REFUND_REASONS[0]);
  const [refundDetail, setRefundDetail] = useState('');

  // Cancel fields
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [cancelNote,   setCancelNote]   = useState('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTab('refund'); setSuccess(false); setError('');
        setRefundReason(REFUND_REASONS[0]); setRefundDetail('');
        setCancelReason(CANCEL_REASONS[0]); setCancelNote('');
      }, 200);
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        type:        tab,
        reason:      tab === 'refund' ? refundReason : cancelReason,
        detail:      tab === 'refund' ? refundDetail.trim() : cancelNote.trim(),
        uid:         user?.uid         ?? null,
        displayName: user?.displayName ?? null,
        email:       user?.email       ?? null,
        submittedAt: serverTimestamp(),
        status:      'open',
      };
      const docRef = await addDoc(collection(db, 'billingRequests'), payload);
      setRefId('BR-' + docRef.id.slice(-6).toUpperCase());
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    tab === 'refund'
      ? refundReason.length > 0
      : cancelReason.length > 0;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'refund', icon: '◈', label: 'Request refund' },
    { id: 'cancel', icon: '◇', label: 'Cancel plan'    },
  ];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2200,
        background: darkMode ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.35)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'blFadeIn .15s ease',
      }}
    >
      <style>{`
        @keyframes blFadeIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes blSlideIn { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:none } }
        .bl-tab-btn:hover  { background: var(--bl-hover) !important; }
        .bl-close:hover    { background: var(--bl-hover) !important; }
        .bl-pill:hover     { border-color: var(--text-3) !important; color: var(--text-1) !important; }
        .bl-input:focus    { outline: none; border-color: var(--text-1) !important; }
        .bl-textarea:focus { outline: none; border-color: var(--text-1) !important; }
        .bl-submit:hover:not(:disabled) { opacity: .85; }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
          width: '100%', maxWidth: 560, maxHeight: '90vh',
          boxShadow: darkMode
            ? '0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)'
            : '0 32px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)',
          ['--bl-hover' as any]: darkMode ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
        }}
      >
        {/* ── Left rail ── */}
        <div style={{
          width: 168, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: darkMode ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.015)',
        }}>
          <div style={{ padding: '20px 16px 14px' }}>
            <div style={{
              fontFamily: '"JetBrains Mono","Courier New",monospace',
              fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
              letterSpacing: '.12em', textTransform: 'uppercase',
            }}>GRE Quant</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>Billing</div>
          </div>

          <nav style={{ flex: 1, padding: '0 8px' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className="bl-tab-btn"
                onClick={() => { setTab(t.id); setSuccess(false); setError(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', marginBottom: 2,
                  background: tab === t.id
                    ? (darkMode ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)')
                    : 'transparent',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  textAlign: 'left', transition: 'background .1s',
                }}
              >
                <span style={{
                  fontFamily: '"JetBrains Mono",monospace', fontSize: 12,
                  color: tab === t.id ? 'var(--text-1)' : 'var(--text-4)',
                }}>{t.icon}</span>
                <span style={{
                  fontSize: 12.5,
                  fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? 'var(--text-1)' : 'var(--text-3)',
                }}>{t.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{
              fontFamily: '"JetBrains Mono",monospace',
              fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '.06em',
            }}>v1.0.0 · Manhattan 5lb</div>
          </div>
        </div>

        {/* ── Right content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxHeight: '90vh' }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.02em' }}>
              {TABS.find(t => t.id === tab)?.label}
            </div>
            <button
              className="bl-close"
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 12, color: 'var(--text-3)',
                transition: 'background .1s',
              }}
            >✕</button>
          </div>

          {/* Body */}
          <div
            key={tab}
            style={{ flex: 1, overflowY: 'auto', padding: '22px', animation: 'blSlideIn .18s ease' }}
          >

            {/* ── SUCCESS ── */}
            {success ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 12, padding: '28px 0', textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: '2px solid var(--ok)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'var(--ok)',
                }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.02em' }}>
                  Request submitted
                </div>
                <div style={{
                  fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.7,
                  maxWidth: 260,
                }}>
                  {tab === 'refund'
                    ? 'We\'ll review your refund request and get back to you within 24 hours.'

                    : 'Your cancellation request is noted. We\'ll confirm and resolve it within 24 hours.'}
                  <br /><br />
                  For anything urgent, reach us at{' '}
                  <a
                    href="mailto:manhattandrill@gmail.com"
                    style={{ color: 'var(--text-1)', fontWeight: 600 }}
                  >
                    manhattandrill@gmail.com
                  </a>
                  {' '}and quote your reference below.
                </div>
                <div style={{
                  fontFamily: '"JetBrains Mono",monospace',
                  fontSize: 10.5, color: 'var(--text-4)', marginTop: 4,
                }}>
                  ref · {refId}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    marginTop: 8, background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '8px 20px', fontSize: 12.5, color: 'var(--text-3)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Close</button>
              </div>

            ) : tab === 'refund' ? (
              /* ── REFUND FORM ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Info banner */}
                <div style={{
                  background: darkMode ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
                  border: '1px solid var(--border)', borderRadius: 9,
                  padding: '12px 14px', marginBottom: 22, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65,
                }}>
                  Refund requests are reviewed within <strong style={{ color: 'var(--text-1)' }}>24 hours</strong>.
                  We'll reach out to your registered email once processed.
                </div>

                <FL>Reason for refund</FL>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                  {REFUND_REASONS.map(r => (
                    <button
                      key={r}
                      className="bl-pill"
                      onClick={() => setRefundReason(r)}
                      style={{
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                        border: `1.5px solid ${refundReason === r ? 'var(--text-1)' : 'var(--border)'}`,
                        background: refundReason === r
                          ? (darkMode ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)')
                          : 'transparent',
                        color: refundReason === r ? 'var(--text-1)' : 'var(--text-3)',
                        transition: 'all .12s',
                      }}
                    >{r}</button>
                  ))}
                </div>

                <FL>Additional detail <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FL>
                <textarea
                  className="bl-textarea"
                  value={refundDetail}
                  onChange={e => setRefundDetail(e.target.value)}
                  placeholder="Anything else we should know…"
                  maxLength={500}
                  rows={4}
                  style={{
                    width: '100%', background: 'transparent', resize: 'none',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                    fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 6,
                    transition: 'border-color .15s',
                  }}
                />
                <div style={{
                  fontFamily: '"JetBrains Mono",monospace',
                  fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginBottom: 24,
                }}>{refundDetail.length} / 500</div>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="bl-submit"
                    onClick={handleSubmit}
                    disabled={!canSubmit || saving}
                    style={{
                      background: !canSubmit ? 'var(--border)' : 'var(--submit-bg)',
                      color: !canSubmit ? 'var(--text-3)' : 'var(--submit-txt)',
                      border: 'none', borderRadius: 8, padding: '10px 24px',
                      fontSize: 13, fontWeight: 700, cursor: !canSubmit ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
                      transition: 'opacity .1s',
                    }}
                  >
                    {saving ? 'Sending…' : 'Submit refund request →'}
                  </button>
                </div>
              </div>

            ) : (
              /* ── CANCEL FORM ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Info banner */}
                <div style={{
                  background: darkMode ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
                  border: '1px solid var(--border)', borderRadius: 9,
                  padding: '12px 14px', marginBottom: 22, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65,
                }}>
                  Cancellations are processed within <strong style={{ color: 'var(--text-1)' }}>24 hours</strong>.
                  Your Pro access remains active until the end of your current billing period.
                </div>

                <FL>Reason for cancelling</FL>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                  {CANCEL_REASONS.map(r => (
                    <button
                      key={r}
                      className="bl-pill"
                      onClick={() => setCancelReason(r)}
                      style={{
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                        border: `1.5px solid ${cancelReason === r ? 'var(--text-1)' : 'var(--border)'}`,
                        background: cancelReason === r
                          ? (darkMode ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)')
                          : 'transparent',
                        color: cancelReason === r ? 'var(--text-1)' : 'var(--text-3)',
                        transition: 'all .12s',
                      }}
                    >{r}</button>
                  ))}
                </div>

                <FL>Anything else? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FL>
                <textarea
                  className="bl-textarea"
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  placeholder="Your feedback helps us improve…"
                  maxLength={400}
                  rows={4}
                  style={{
                    width: '100%', background: 'transparent', resize: 'none',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                    fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 6,
                    transition: 'border-color .15s',
                  }}
                />
                <div style={{
                  fontFamily: '"JetBrains Mono",monospace',
                  fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginBottom: 24,
                }}>{cancelNote.length} / 400</div>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="bl-submit"
                    onClick={handleSubmit}
                    disabled={!canSubmit || saving}
                    style={{
                      background: !canSubmit ? 'var(--border)' : 'var(--err)',
                      color: !canSubmit ? 'var(--text-3)' : '#fff',
                      border: 'none', borderRadius: 8, padding: '10px 24px',
                      fontSize: 13, fontWeight: 700, cursor: !canSubmit ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
                      transition: 'opacity .1s',
                    }}
                  >
                    {saving ? 'Sending…' : 'Submit cancellation →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FL({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
      letterSpacing: '.1em', textTransform: 'uppercase',
      marginBottom: 8, fontFamily: '"JetBrains Mono","Courier New",monospace',
      ...style,
    }}>
      {children}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11.5, color: 'var(--err)',
      background: 'var(--err-bg)', border: '1px solid var(--err-bd)',
      borderRadius: 7, padding: '8px 12px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}