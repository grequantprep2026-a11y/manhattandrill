'use client';

import { useEffect, useState } from 'react';

const DODO_BASE = 'https://checkout.dodopayments.com/buy/pdt_0NcbbD8tiMjvLAGeiI4p4?quantity=1';

interface Props {
  open:      boolean;
  onClose:   () => void;
  reason?:   'topic' | 'mock';
  userEmail: string;
  userId:    string;
}

export function UpgradeModal({ open, onClose, reason = 'topic', userEmail, userId }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!open) return null;

  const checkoutUrl = `${DODO_BASE}&email=${encodeURIComponent(userEmail)}&external_id=${userId}&disableEmail=true`;

  const heading = reason === 'mock' ? 'One free mock test used' : 'Unlock all 23 topics';
  const body    = reason === 'mock'
    ? 'Free accounts get one mock test. Upgrade to Pro for unlimited attempts, full section review, and all topic practice.'
    : 'Free accounts include Topic 1 (Arithmetic). Upgrade to Pro for all 23 GRE Quant chapters, similar questions, mock tests, and more.';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(6px)',
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
        boxShadow: '0 12px 48px rgba(0,0,0,.18)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        animation: 'fadeUp .2s',
        // On mobile: bottom sheet
        ...(isMobile ? {
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
        } : {}),
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #b45309, #f59e0b, #b45309)' }} />

        <div style={{ padding: isMobile ? '22px 20px 32px' : '26px 26px 22px' }}>

          {/* Drag handle on mobile */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 4, padding: '3px 12px', marginBottom: 16,
            fontSize: 10, fontWeight: 700, color: '#b45309',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            ★ Pro Plan
          </div>

          <h2 style={{
            fontSize: isMobile ? 18 : 20,
            fontWeight: 700, color: 'var(--text-1)',
            margin: '0 0 10px', lineHeight: 1.3,
          }}>
            {heading}
          </h2>

          <p style={{
            fontSize: isMobile ? 13.5 : 13,
            color: 'var(--text-3)', lineHeight: 1.7,
            margin: '0 0 22px',
          }}>
            {body}
          </p>

          <div style={{
            background: 'var(--ctx-bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 22,
          }}>
            {[
              { free: '1 topic',          pro: 'All 23 GRE Quant chapters' },
              { free: '1 mock test',       pro: 'Unlimited mock tests'     },
              { free: 'Limited reattempt', pro: 'Unlimited reattempts'     },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, padding: '5px 0',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'var(--err)', fontSize: 10 }}>✗</span> {row.free}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ok)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10 }}>✓</span> {row.pro}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { window.location.href = checkoutUrl; }}
            style={{
              width: '100%',
              padding: isMobile ? '15px 0' : '13px 0',
              fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, #b45309, #f59e0b)',
              color: '#fff', border: 'none', borderRadius: 10,
              cursor: 'pointer', letterSpacing: '.01em',
              boxShadow: '0 2px 10px rgba(180,83,9,.25)',
              transition: 'opacity .12s',
              touchAction: 'manipulation',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Upgrade to Pro →
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: 8,
              padding: isMobile ? '13px 0' : '10px 0',
              fontSize: 12.5, fontWeight: 500,
              background: 'transparent', color: 'var(--text-4)',
              border: 'none', cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}