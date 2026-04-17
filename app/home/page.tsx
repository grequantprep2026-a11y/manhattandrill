'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { onAuthStateChanged }  from 'firebase/auth';
import { auth }                from '../lib/firebase';
import { getUserProfile }      from '../lib/firestore';

function pad(n: number) { return String(n).padStart(2, '0'); }

function getTimeLeft(examDateStr: string) {
  const diff = new Date(examDateStr + 'T00:00:00').getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, total: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000)  / 60000),
    s: Math.floor((diff % 60000)    / 1000),
    total: diff,
  };
}

const QUOTES = [
  'Consistency beats motivation — every time.',
  'Show up. Every single day.',
  'The 5lb book does not get lighter. You get stronger.',
  'Discipline beats talent when talent lacks discipline.',
  'Your exam is coming. Be ready.',
  'One session at a time. One question at a time.',
  'Trust the process.',
];

export const ManhattanDrillLogo = () => (
  <svg width="180" height="44" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42V8L18 28L30 8V42" stroke="#1a1a18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="50" y="24" fontFamily="Inter, -apple-system, sans-serif" fontSize="20" fontWeight="800" fill="#1a1a18" letterSpacing="-0.4">Manhattan</text>
    <text x="50" y="40" fontFamily="Inter, -apple-system, sans-serif" fontSize="12" fontWeight="600" fill="#2d6a4f" letterSpacing="3">DRILL</text>
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  const [user,     setUser]     = useState<any>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [tl,       setTl]       = useState({ d: 0, h: 0, m: 0, s: 0, total: -1 });
  const [vis,      setVis]      = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      if (!p?.onboardingDone) { router.replace('/onboarding'); return; }
      setProfile(p);
      setChecking(false);
      setTimeout(() => setVis(true), 80);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!profile?.examDate) return;
    const tick = () => setTl(getTimeLeft(profile.examDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [profile?.examDate]);

  if (checking) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .loader { width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #1a1a18; border-radius: 50%; animation: spin .7s linear infinite; }
      `}</style>
      <div className="loader" />
    </div>
  );

  const examDate = profile?.examDate    ?? '';
  const target   = profile?.targetScore ?? '';
  const name     = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Scholar';
  const hasTime  = tl.total > 0;
  const isOver   = examDate && tl.total === 0;
  const quote    = QUOTES[new Date().getDay()];
  const urgent   = tl.d <= 7 && hasTime;

  const UNITS = [
    { id: 'd', val: tl.d, lbl: 'days'  },
    { id: 'h', val: tl.h, lbl: 'hours' },
    { id: 'm', val: tl.m, lbl: 'min'   },
    { id: 's', val: tl.s, lbl: 'sec'   },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; }
        body { background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink  { 0%,100%{opacity:1} 45%,55%{opacity:.15} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }

        /* ── Grid background ── */
        .grid-bg {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: .35; pointer-events: none; z-index: 0;
        }

        /* ── Nav ── */
        .home-nav {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          background: rgba(255,255,255,.94); backdrop-filter: blur(8px);
          gap: 12px;
        }
        @media (min-width: 640px)  { .home-nav { padding: 20px 32px; } }
        @media (min-width: 1024px) { .home-nav { padding: 24px 60px; } }

        .nav-right { display: flex; align-items: center; gap: 10px; }
        @media (min-width: 480px) { .nav-right { gap: 16px; } }

        .nav-greeting {
          font-size: 12px; color: #9ca3af;
          display: none;
        }
        @media (min-width: 480px) { .nav-greeting { display: inline; } }

        .btn-nav-practice {
          background: #1a1a18; color: #fff; border: none; border-radius: 8px;
          padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
          white-space: nowrap; transition: opacity .15s;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-nav-practice:hover { opacity: .8; }
        @media (min-width: 640px) { .btn-nav-practice { padding: 8px 20px; font-size: 13px; } }

        /* ── Main content area ── */
        .home-main {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          position: relative; z-index: 1;
          padding: 32px 20px 48px;
          min-height: 0;
        }
        @media (min-width: 640px)  { .home-main { padding: 48px 32px 64px; } }
        @media (min-width: 1024px) { .home-main { padding: 64px 60px 80px; } }

        /* ── Fade-in wrapper ── */
        .home-content {
          width: 100%; display: flex; flex-direction: column; align-items: center;
          transition: opacity .3s;
        }

        /* ── Eyebrow ── */
        .eyebrow {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 20px;
        }
        @media (min-width: 640px) { .eyebrow { margin-bottom: 28px; } }

        .eyebrow-line { width: 16px; height: 1px; background: #d1d5db; }
        @media (min-width: 640px) { .eyebrow-line { width: 24px; } }

        .eyebrow-text {
          font-size: 9px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af; text-align: center;
          white-space: nowrap;
        }
        @media (min-width: 640px) { .eyebrow-text { font-size: 10px; } }

        /* ── Countdown grid ── */
        .countdown-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          width: 100%;
          max-width: 520px;
          margin-bottom: 28px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,.04);
        }
        @media (min-width: 640px) { .countdown-grid { max-width: 580px; margin-bottom: 36px; } }
        @media (min-width: 1024px) { .countdown-grid { max-width: 640px; margin-bottom: 40px; } }

        .unit-cell {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 18px 8px 14px;
          background: #fff;
          border-right: 1px solid #e5e7eb;
          position: relative;
        }
        .unit-cell:last-child { border-right: none; }

        /* Separator colon via pseudo-element */
        .unit-cell:not(:last-child)::after {
          content: ':';
          position: absolute; right: -7px; top: 50%; transform: translateY(-56%);
          font-size: 18px; font-weight: 300; color: #d1d5db; z-index: 1;
          animation: none;
        }
        .unit-cell.sec-cell::before { animation: blink 2s ease-in-out infinite; }

        .unit-val {
          font-size: clamp(28px, 8vw, 64px);
          font-weight: 800;
          letter-spacing: -.04em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: #1a1a18;
        }
        .unit-val.urgent {
          color: #c0392b;
          animation: pulse 1.2s ease-in-out infinite;
        }

        .unit-label {
          font-size: clamp(8px, 2vw, 10px);
          font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af; margin-top: 6px;
        }

        /* ── Info pills ── */
        .pill-row {
          display: flex; flex-wrap: wrap; align-items: center;
          justify-content: center; gap: 10px;
          margin-bottom: 20px;
        }
        @media (min-width: 480px) { .pill-row { gap: 14px; } }

        .info-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          border: 1px solid #e5e7eb; border-radius: 99px;
          background: #f9fafb;
        }
        .pill-key {
          font-size: 9px; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af;
        }
        .pill-val { font-size: 12px; font-weight: 800; color: #1a1a18; }
        .pill-date { font-size: 11px; font-weight: 600; color: #4b5563; }

        /* ── Quote ── */
        .quote-text {
          font-size: clamp(12px, 3vw, 13px);
          color: #9ca3af; font-style: italic; letter-spacing: .01em;
          text-align: center; margin-bottom: 32px;
          padding: 0 16px; max-width: 380px; line-height: 1.6;
        }
        @media (min-width: 640px) { .quote-text { margin-bottom: 40px; } }

        /* ── CTA button ── */
        .main-cta {
          background: #1a1a18; color: #fff; border: none; border-radius: 12px;
          padding: 15px 40px; font-size: 14px; font-weight: 700; cursor: pointer;
          width: 100%; max-width: 260px;
          transition: opacity .15s, transform .15s;
          -webkit-tap-highlight-color: transparent;
          letter-spacing: .01em;
        }
        .main-cta:hover { opacity: .85; transform: translateY(-1px); }
        .main-cta:active { transform: translateY(0); }
        @media (min-width: 480px) { .main-cta { padding: 16px 64px; max-width: none; width: auto; font-size: 15px; } }

        /* ── Welcome / no-date states ── */
        .welcome-title {
          font-size: clamp(22px, 6vw, 32px);
          font-weight: 800; color: #1a1a18;
          letter-spacing: -.03em; line-height: 1.2;
          text-align: center; margin-bottom: 12px;
        }
        .welcome-sub {
          font-size: clamp(13px, 3vw, 14px);
          color: #6b7280; margin-bottom: 32px; text-align: center;
          line-height: 1.6; padding: 0 16px;
        }
        .section-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af;
          margin-bottom: 16px; text-align: center;
        }

        /* ── Footer ── */
        .home-footer {
          position: relative; z-index: 10;
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: center;
          gap: 12px 20px;
          padding: 20px;
          border-top: 1px solid rgba(0,0,0,.04);
        }
        .footer-link {
          font-size: 11px; font-weight: 500; color: #9ca3af;
          text-decoration: none; letter-spacing: .04em;
          transition: color .15s;
        }
        .footer-link:hover { color: #1a1a18; }
        .footer-copy { font-size: 11px; color: #9ca3af; font-weight: 500; }
      `}</style>

      <div style={{ width: '100vw', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
        <div className="grid-bg" />

        {/* ── NAV ── */}
        <nav className="home-nav">
          <ManhattanDrillLogo />
          <div className="nav-right">
            <span className="nav-greeting">
              Hi, <strong style={{ color: '#1a1a18', fontWeight: 700 }}>{name}</strong>
            </span>
            <button className="btn-nav-practice" onClick={() => router.push('/practice')}>
              Practice →
            </button>
          </div>
        </nav>

        {/* ── MAIN ── */}
        <main className="home-main">

          {hasTime ? (
            <div
              className="home-content"
              style={{ opacity: vis ? 1 : 0, animation: vis ? 'fadeUp .5s ease both' : 'none' }}
            >
              {/* Eyebrow */}
              <div className="eyebrow">
                <div className="eyebrow-line" />
                <span className="eyebrow-text">
                  {urgent ? '⚠ Exam is very soon' : 'GRE countdown'}
                </span>
                <div className="eyebrow-line" />
              </div>

              {/* Countdown */}
              <div className="countdown-grid">
                {UNITS.map((u, i) => (
                  <div
                    key={u.id}
                    className={`unit-cell${i === 3 ? ' sec-cell' : ''}`}
                  >
                    <span
                      className={`unit-val${urgent && i === 0 ? ' urgent' : ''}`}
                    >
                      {pad(u.val)}
                    </span>
                    <span className="unit-label">{u.lbl}</span>
                  </div>
                ))}
              </div>

              {/* Pills */}
              <div className="pill-row">
                {target && (
                  <div className="info-pill">
                    <span className="pill-key">Target</span>
                    <span className="pill-val">{target}</span>
                  </div>
                )}
                {examDate && (
                  <div className="info-pill">
                    <span className="pill-key">Exam</span>
                    <span className="pill-date">
                      {new Date(examDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              <p className="quote-text">"{quote}"</p>

              <button className="main-cta" onClick={() => router.push('/practice')}>
                Start Practice
              </button>
            </div>

          ) : isOver ? (
            <div
              className="home-content"
              style={{ textAlign: 'center', opacity: vis ? 1 : 0, animation: vis ? 'fadeUp .5s ease both' : 'none' }}
            >
              <p className="section-eyebrow">Exam day</p>
              <p className="welcome-title">All the best, {name}.</p>
              <p className="welcome-sub">You've put in the work. Go get it.</p>
              <button className="main-cta" onClick={() => router.push('/practice')}>
                Continue Practicing
              </button>
            </div>

          ) : (
            <div
              className="home-content"
              style={{ textAlign: 'center', opacity: vis ? 1 : 0, animation: vis ? 'fadeUp .5s ease both' : 'none' }}
            >
              <p className="section-eyebrow">Welcome back</p>
              <p className="welcome-title">Ready to drill, {name}?</p>
              <p className="quote-text">"{quote}"</p>
              <button className="main-cta" onClick={() => router.push('/practice')}>
                Start Practice
              </button>
            </div>
          )}

        </main>

        {/* ── FOOTER ── */}
        <footer className="home-footer">
          <a href="/terms"   className="footer-link">Terms</a>
          <a href="/privacy" className="footer-link">Privacy</a>
          <span className="footer-copy">© Manhattan Drill</span>
        </footer>
      </div>
    </>
  );
}