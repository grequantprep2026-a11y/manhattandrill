'use client';

/**
 * FeedbackModal.tsx
 *
 * Aesthetic: matches SettingsModal exactly — editorial-academic,
 * left-rail navigation, monospaced accents, hairline borders.
 *
 * Fully responsive:
 *  - Desktop (≥480px): left rail + right content side by side
 *  - Mobile (<480px):  left rail hidden, top dropdown nav (same pattern as SettingsModal)
 *
 * Tabs:
 *  • Feature request — category pill, title, description, priority, anon toggle
 *  • Bug report      — what happened, steps to reproduce
 *  • Other           — freeform message
 *
 * All submissions write to Firestore collection: `featureRequests`
 * Shape: { type, category?, title?, description, priority?, steps?,
 *          uid, displayName, email, submittedAt, status: 'open' }
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean;
  onClose: () => void;
  darkMode: boolean;
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
}

type Tab      = 'request' | 'bug' | 'other';
type Priority = 'low' | 'medium' | 'high';

const CATEGORIES = [
  'UX / Design',
  'Questions',
  'Stats & Progress',
  'Timer',
  'Auth / Account',
  'Other',
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function FeedbackModal({ open, onClose, darkMode, user }: Props) {
  const [tab,      setTab]      = useState<Tab>('request');
  const [success,  setSuccess]  = useState(false);
  const [refId,    setRefId]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [anon,     setAnon]     = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Feature request fields
  const [category,    setCategory]    = useState<string>(CATEGORIES[0]);
  const [featTitle,   setFeatTitle]   = useState('');
  const [featDesc,    setFeatDesc]    = useState('');
  const [priority,    setPriority]    = useState<Priority>('low');

  // Bug report fields
  const [bugDesc,     setBugDesc]     = useState('');
  const [bugSteps,    setBugSteps]    = useState('');

  // Other
  const [otherMsg,    setOtherMsg]    = useState('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTab('request'); setSuccess(false); setError(''); setAnon(false);
        setMobileNavOpen(false);
        setFeatTitle(''); setFeatDesc(''); setPriority('low'); setCategory(CATEGORIES[0]);
        setBugDesc(''); setBugSteps(''); setOtherMsg('');
      }, 200);
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  // Close mobile nav when tab changes
  const handleTabChange = (t: Tab) => {
    setTab(t);
    setMobileNavOpen(false);
    setSuccess(false);
    setError('');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const base = {
        type:        tab,
        uid:         anon ? null : (user?.uid ?? null),
        displayName: anon ? null : (user?.displayName ?? null),
        email:       anon ? null : (user?.email ?? null),
        anonymous:   anon,
        submittedAt: serverTimestamp(),
        status:      'open',
      };

      let payload: Record<string, unknown> = base;
      if (tab === 'request') {
        payload = { ...base, category, title: featTitle.trim(), description: featDesc.trim(), priority };
      } else if (tab === 'bug') {
        payload = { ...base, description: bugDesc.trim(), steps: bugSteps.trim() };
      } else {
        payload = { ...base, description: otherMsg.trim() };
      }

      const docRef = await addDoc(collection(db, 'featureRequests'), payload);
      setRefId('FR-' + docRef.id.slice(-6).toUpperCase());
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const canSubmitRequest = featTitle.trim().length > 3 && featDesc.trim().length > 10;
  const canSubmitBug     = bugDesc.trim().length > 10;
  const canSubmitOther   = otherMsg.trim().length > 5;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'request', icon: '◈', label: 'Feature request' },
    { id: 'bug',     icon: '◯', label: 'Bug report'      },
    { id: 'other',   icon: '◇', label: 'Other'           },
  ];

  const currentTabLabel = TABS.find(t => t.id === tab)?.label ?? 'Feedback';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 2100,
          background: darkMode ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.35)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'fbFadeIn .15s ease',
        }}
      >
        <style>{`
          @keyframes fbFadeIn    { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
          @keyframes fbSlideIn   { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:none } }
          @keyframes fbDropDown  { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
          .fb-tab-btn:hover      { background: var(--fb-hover) !important; }
          .fb-close-btn:hover    { background: var(--fb-hover) !important; }
          .fb-cat-pill:hover     { border-color: var(--text-3) !important; color: var(--text-1) !important; }
          .fb-input:focus        { outline: none; border-color: var(--text-1) !important; }
          .fb-textarea:focus     { outline: none; border-color: var(--text-1) !important; }
          .fb-submit-btn:hover:not(:disabled) { opacity: .85; }
          .fb-pri-btn:hover      { opacity: .75; }
          .fb-mob-dropdown-btn:hover { background: var(--fb-hover) !important; }
          .fb-mob-nav-item:hover { background: var(--fb-hover); }

          /* ── SHELL ── */
          .fb-shell {
            display: flex;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            width: 100%;
            max-width: 580px;
            max-height: 90vh;
            box-shadow: ${darkMode
              ? '0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)'
              : '0 32px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)'};
          }

          /* ── LEFT RAIL (desktop/tablet) ── */
          .fb-left-rail {
            width: 168px;
            flex-shrink: 0;
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: ${darkMode ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.015)'};
          }

          /* ── RIGHT CONTENT ── */
          .fb-right-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-height: 90vh;
          }

          /* ── MOBILE HEADER (hidden on desktop) ── */
          .fb-mob-header {
            display: none;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            position: relative;
          }
          .fb-mob-tab-label {
            font-size: 14px;
            font-weight: 800;
            color: var(--text-1);
            letter-spacing: -.02em;
          }
          .fb-mob-dropdown-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 7px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-3);
            transition: background .1s;
          }
          .fb-mob-nav-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            right: 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,.12);
            z-index: 10;
            min-width: 160px;
            animation: fbDropDown .15s ease;
          }
          .fb-mob-nav-dropdown.open { display: block; }
          .fb-mob-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border: none;
            background: transparent;
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-1);
            transition: background .1s;
          }
          .fb-mob-nav-item.active { font-weight: 700; }

          /* ── DESKTOP HEADER (hidden on mobile) ── */
          .fb-desk-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 22px 16px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
          }

          /* ── TABLET: shrink rail ── */
          @media (min-width: 480px) and (max-width: 640px) {
            .fb-shell { max-width: 100%; border-radius: 12px; }
            .fb-left-rail { width: 130px; }
          }

          /* ── MOBILE: hide left rail, show top dropdown nav ── */
          @media (max-width: 479px) {
            .fb-shell {
              flex-direction: column;
              max-width: 100%;
              border-radius: 14px;
              max-height: 92vh;
            }
            .fb-left-rail    { display: none !important; }
            .fb-right-content { max-height: 92vh; }
            .fb-mob-header   { display: flex !important; }
            .fb-desk-header  { display: none !important; }
          }
        `}</style>

        {/* Modal shell */}
        <div
          className="fb-shell"
          onClick={e => e.stopPropagation()}
          style={{ ['--fb-hover' as any]: darkMode ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)' }}
        >

          {/* ── Left rail (desktop / tablet) ──────────────────────────────── */}
          <div className="fb-left-rail">
            <div style={{ padding: '20px 16px 14px' }}>
              <div style={{
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
                letterSpacing: '.12em', textTransform: 'uppercase',
              }}>GRE Quant</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>Feedback</div>
            </div>

            <nav style={{ flex: 1, padding: '0 8px' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className="fb-tab-btn"
                  onClick={() => { setTab(t.id); setSuccess(false); setError(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 10px', marginBottom: 2,
                    background: tab === t.id ? (darkMode ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)') : 'transparent',
                    border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
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
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '.06em',
              }}>v1.0.0 · Manhattan 5lb</div>
            </div>
          </div>

          {/* ── Right content ─────────────────────────────────────────────── */}
          <div className="fb-right-content">

            {/* Mobile header with dropdown tab switcher */}
            <div className="fb-mob-header">
              <div className="fb-mob-tab-label">{currentTabLabel}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Tab switcher dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="fb-mob-dropdown-btn"
                    onClick={() => setMobileNavOpen(o => !o)}
                  >
                    <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10 }}>
                      {TABS.find(t => t.id === tab)?.icon}
                    </span>
                    <span>Switch</span>
                    <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace' }}>▾</span>
                  </button>
                  <div className={`fb-mob-nav-dropdown${mobileNavOpen ? ' open' : ''}`}>
                    {TABS.map(t => (
                      <button
                        key={t.id}
                        className={`fb-mob-nav-item${tab === t.id ? ' active' : ''}`}
                        onClick={() => handleTabChange(t.id)}
                      >
                        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'var(--text-4)' }}>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Close button */}
                <button
                  className="fb-close-btn"
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
            </div>

            {/* Desktop header */}
            <div className="fb-desk-header">
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.02em' }}>
                {currentTabLabel}
              </div>
              <button
                className="fb-close-btn"
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

            {/* Scrollable body */}
            <div
              key={tab}
              style={{ flex: 1, overflowY: 'auto', padding: '22px', animation: 'fbSlideIn .18s ease' }}
              onClick={() => setMobileNavOpen(false)}
            >

              {/* ── SUCCESS STATE ──────────────────────────────────────────── */}
              {success ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 12, padding: '32px 0', textAlign: 'center',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: '2px solid var(--ok)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'var(--ok)',
                  }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.02em' }}>
                    Submitted — thank you
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-4)', lineHeight: 1.6, maxWidth: 240 }}>
                    We review every submission and prioritise by votes and frequency.
                  </div>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
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

              ) : tab === 'request' ? (
                /* ── FEATURE REQUEST ───────────────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <FL>Category</FL>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        className="fb-cat-pill"
                        onClick={() => setCategory(c)}
                        style={{
                          padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                          border: `1.5px solid ${category === c ? 'var(--text-1)' : 'var(--border)'}`,
                          background: category === c ? (darkMode ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)') : 'transparent',
                          color: category === c ? 'var(--text-1)' : 'var(--text-3)',
                          transition: 'all .12s',
                        }}
                      >{c}</button>
                    ))}
                  </div>

                  <FL>Title</FL>
                  <input
                    className="fb-input"
                    value={featTitle}
                    onChange={e => setFeatTitle(e.target.value)}
                    placeholder="One-line summary of your idea"
                    maxLength={80}
                    style={{
                      width: '100%', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                      fontFamily: 'inherit', transition: 'border-color .15s',
                      marginBottom: 18, boxSizing: 'border-box',
                    }}
                  />

                  <FL>Description</FL>
                  <textarea
                    className="fb-textarea"
                    value={featDesc}
                    onChange={e => setFeatDesc(e.target.value)}
                    placeholder="Describe what you'd like and why it would help your study workflow…"
                    maxLength={600}
                    rows={5}
                    style={{
                      width: '100%', background: 'transparent', resize: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                      fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 6,
                      transition: 'border-color .15s', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginBottom: 22,
                  }}>
                    {featDesc.length} / 600
                  </div>

                  <Divider />

                  <FL style={{ marginTop: 20 }}>Priority (your view)</FL>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {([
                      { val: 'low',    label: 'Low',    selCls: { border: '#16a34a', bg: '#f0fdf4', color: '#15803d' } },
                      { val: 'medium', label: 'Medium', selCls: { border: '#ca8a04', bg: '#fefce8', color: '#a16207' } },
                      { val: 'high',   label: 'High',   selCls: { border: '#dc2626', bg: '#fef2f2', color: '#b91c1c' } },
                    ] as const).map(({ val, label, selCls }) => {
                      const active = priority === val;
                      return (
                        <button
                          key={val}
                          className="fb-pri-btn"
                          onClick={() => setPriority(val)}
                          style={{
                            flex: 1, padding: '9px 0',
                            fontSize: 11.5, fontWeight: 700,
                            fontFamily: '"JetBrains Mono", monospace',
                            borderRadius: 8, cursor: 'pointer',
                            border: `1.5px solid ${active ? selCls.border : 'var(--border)'}`,
                            background: active ? selCls.bg : 'transparent',
                            color: active ? selCls.color : 'var(--text-3)',
                            transition: 'all .1s',
                          }}
                        >{label}</button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 24 }}>
                    Helps us understand relative urgency to you.
                  </div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}

                  <SubmitRow
                    anon={anon} onToggleAnon={() => setAnon(a => !a)}
                    disabled={!canSubmitRequest || saving}
                    saving={saving} onSubmit={handleSubmit}
                    darkMode={darkMode}
                  />
                </div>

              ) : tab === 'bug' ? (
                /* ── BUG REPORT ────────────────────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <FL>What happened?</FL>
                  <textarea
                    className="fb-textarea"
                    value={bugDesc}
                    onChange={e => setBugDesc(e.target.value)}
                    placeholder="Describe the bug — what you did, what you expected, what actually occurred…"
                    maxLength={600}
                    rows={5}
                    style={{
                      width: '100%', background: 'transparent', resize: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                      fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 6,
                      transition: 'border-color .15s', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginBottom: 22,
                  }}>{bugDesc.length} / 600</div>

                  <FL>Steps to reproduce</FL>
                  <textarea
                    className="fb-textarea"
                    value={bugSteps}
                    onChange={e => setBugSteps(e.target.value)}
                    placeholder={'1. Go to…\n2. Click…\n3. See error…'}
                    maxLength={400}
                    rows={4}
                    style={{
                      width: '100%', background: 'transparent', resize: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                      fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 24,
                      transition: 'border-color .15s', boxSizing: 'border-box',
                    }}
                  />

                  {error && <ErrorMsg>{error}</ErrorMsg>}

                  <SubmitRow
                    anon={anon} onToggleAnon={() => setAnon(a => !a)}
                    disabled={!canSubmitBug || saving}
                    saving={saving} onSubmit={handleSubmit}
                    darkMode={darkMode}
                    label="Send report"
                  />
                </div>

              ) : (
                /* ── OTHER ──────────────────────────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <FL>Your message</FL>
                  <textarea
                    className="fb-textarea"
                    value={otherMsg}
                    onChange={e => setOtherMsg(e.target.value)}
                    placeholder="Anything on your mind — praise, questions, general thoughts…"
                    maxLength={800}
                    rows={7}
                    style={{
                      width: '100%', background: 'transparent', resize: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                      fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 6,
                      transition: 'border-color .15s', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginBottom: 24,
                  }}>{otherMsg.length} / 800</div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}

                  <SubmitRow
                    anon={anon} onToggleAnon={() => setAnon(a => !a)}
                    disabled={!canSubmitOther || saving}
                    saving={saving} onSubmit={handleSubmit}
                    darkMode={darkMode}
                    label="Send message"
                  />
                </div>
              )}

            </div>{/* end scrollable body */}
          </div>{/* end right content */}
        </div>{/* end shell */}
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FL({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
      letterSpacing: '.1em', textTransform: 'uppercase',
      marginBottom: 8, fontFamily: '"JetBrains Mono", "Courier New", monospace',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)' }} />;
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11.5, color: 'var(--err)', background: 'var(--err-bg)',
      border: '1px solid var(--err-bd)', borderRadius: 7,
      padding: '8px 12px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function SubmitRow({
  anon, onToggleAnon, disabled, saving, onSubmit, darkMode, label = 'Send request',
}: {
  anon: boolean; onToggleAnon: () => void;
  disabled: boolean; saving: boolean; onSubmit: () => void;
  darkMode: boolean; label?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <label
        onClick={onToggleAnon}
        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
      >
        {/* Toggle */}
        <div style={{
          width: 32, height: 18, borderRadius: 9,
          border: `1.5px solid ${anon ? 'var(--text-1)' : 'var(--border)'}`,
          background: anon ? 'var(--text-1)' : 'transparent',
          position: 'relative', transition: 'background .15s, border-color .15s', flexShrink: 0,
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: anon ? 'var(--bg-card)' : 'var(--border)',
            position: 'absolute', top: 1,
            left: anon ? 'calc(100% - 13px)' : '1px',
            transition: 'left .15s, background .15s',
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', userSelect: 'none' }}>
          Submit anonymously
        </span>
      </label>
      <button
        className="fb-submit-btn"
        onClick={onSubmit}
        disabled={disabled}
        style={{
          background: disabled ? 'var(--border)' : 'var(--submit-bg)',
          color: disabled ? 'var(--text-3)' : 'var(--submit-txt)',
          border: 'none', borderRadius: 8, padding: '10px 24px',
          fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'opacity .1s', fontFamily: 'inherit',
          opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {saving ? 'Sending…' : `${label} →`}
      </button>
    </div>
  );
}