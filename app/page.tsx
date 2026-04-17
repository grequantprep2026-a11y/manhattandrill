'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './lib/firestore';

const IMG_BOOK = '/manhattanimg.png';

export const ManhattanDrillLogo = () => (
  <svg width="180" height="44" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42V8L18 28L30 8V42" stroke="#1a1a18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="50" y="24" fontFamily="Inter, -apple-system, sans-serif" fontSize="20" fontWeight="800" fill="#1a1a18" letterSpacing="-0.4">Manhattan</text>
    <text x="50" y="40" fontFamily="Inter, -apple-system, sans-serif" fontSize="12" fontWeight="600" fill="#2d6a4f" letterSpacing="3">DRILL</text>
  </svg>
);

function Check() {
  return (
    <span style={{ flexShrink:0, width:20, height:20, background:'#2d6a4f', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2 }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {open ? (
        <>
          <line x1="4" y1="4" x2="18" y2="18" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="18" y1="4" x2="4" y2="18" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="19" y2="6" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="3" y1="11" x2="19" y2="11" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="3" y1="16" x2="19" y2="16" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

const BULLETS = [
  { bold: '754+ practice quant questions', rest: ' from the 5lb. Bible of GRE' },
  { bold: 'Unlimited official timed GRE quant mock test:', rest: ' 2 sections, 20 min each' },
  { bold: '', rest: 'Track your progress by topic and master tough questions' },
  { bold: 'Re-attempt', rest: ' similar question types until you master them' },
  { bold: '', rest: 'Crack the exam in 30 days — schedule each topic daily!' },
];

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setIsSignedIn(false); setChecking(false); return; }
      setIsSignedIn(true);
      const p = await getUserProfile(u.uid);
      if (!p?.onboardingDone) { router.replace('/onboarding'); }
      else { setChecking(false); }
    });
    return () => unsub();
  }, [router]);

  const handleNav = (path: string) => { setMenuOpen(false); router.push(path); };

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <div style={{ width:32, height:32, border:'2px solid #ccc', borderTopColor:'#1a1a18', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeDown {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ─── NAV ─── */
        .nav-root {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          height: 60px; padding: 40px 52px;
        }
        .nav-desktop { display: flex; align-items: center; gap: 24px; }
        .nav-link {
          font-size: 13px; font-weight: 500; color: #6b7280;
          text-decoration: none; transition: color .15s;
        }
        .nav-link:hover { color: #1a1a18; }
        .nav-btn {
          border: none; border-radius: 8px; padding: 8px 18px;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .15s;
        }
        .nav-btn:hover { opacity: .85; }

        /* hamburger — hidden on desktop */
        .ham-btn {
          display: none; background: none; border: none;
          cursor: pointer; padding: 6px; border-radius: 6px;
          align-items: center; justify-content: center; line-height:0;
        }

        /* mobile dropdown */
        .mob-menu {
          display: none; flex-direction: column;
          padding: 8px 20px 18px; gap: 0;
          border-top: 1px solid #f0f0ee;
          animation: fadeDown .18s ease;
        }
        .mob-menu.open { display: flex; }
        .mob-menu a {
          display: block; padding: 13px 2px;
          font-size: 15px; font-weight: 500; color: #3a3a37;
          text-decoration: none; border-bottom: 1px solid #f5f5f3;
        }
        .mob-menu a:last-of-type { border-bottom: none; }
        .mob-cta-btn {
          margin-top: 14px; padding: 14px 18px; border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; text-align: center;
        }

        /* ─── MAIN ─── */
        .main-wrap {
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh;
          padding: 100px 52px 52px;
          box-sizing: border-box;
        }
        .book-wrap {
          max-width: 1020px; width: 100%;
          display: flex; flex-direction: row;
          align-items: center; gap: 60px;
        }

        /* image */
        .book-img-outer { flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .book-perspective { transform: perspective(900px) rotateY(14deg) rotateX(3deg); }
        .book-box { width:320px; height:320px; overflow:hidden; border-radius:4px; }
        .book-box img { width:100%; height:100%; object-fit:cover; display:block; }

        /* text */
        .book-text { flex:1; min-width:0; display:flex; flex-direction:column; }

        .eyebrow {
          font-size: clamp(10px,.85vw,12px); font-weight:700;
          letter-spacing:.1em; text-transform:uppercase;
          color:#2d6a4f; margin:0 0 10px;
        }
        .headline {
          font-size: clamp(24px,2.8vw,40px); font-weight:800;
          color:#1a1a18; line-height:1.22; margin:0 0 22px;
        }
        .bullet-list {
          list-style:none; padding:0; margin:0 0 28px;
          display:flex; flex-direction:column; gap:12px;
        }
        .bullet-item {
          display:flex; align-items:flex-start; gap:10px;
          color:#3a3a37; line-height:1.55;
          font-size: clamp(13px,1.1vw,15px);
        }

        /* cta box */
        .cta-box {
          background:#f8f8f6; border:1px solid #e5e7eb; border-radius:12px;
          padding:18px 20px;
          display:flex; flex-direction:row;
          align-items:center; justify-content:space-between; gap:20px;
        }
        .cta-text { font-size:clamp(14px,1.2vw,17px); color:#3a3a37; line-height:1.4; }
        .cta-btn {
          flex-shrink:0; background:#2d4a2d; color:#fff; border:none;
          border-radius:10px; padding:13px 22px;
          font-size:clamp(13px,1vw,15px); font-weight:700;
          cursor:pointer; transition:opacity .15s; white-space:nowrap;
        }
        .cta-btn:hover { opacity:.85; }

        /* ─── TABLET 640–900 ─── */
        @media (min-width:640px) and (max-width:900px) {
          .nav-inner  { padding: 0 28px; }
          .main-wrap  { padding: 88px 28px 40px; }
          .book-wrap  { gap: 36px; }
          .book-box   { width:240px !important; height:240px !important; }
        }

        /* ─── MOBILE < 640 ─── */
        @media (max-width:639px) {
          /* nav */
          .nav-inner      { padding: 0 18px; height: 54px; }
          .nav-desktop    { display: none !important; }
          .ham-btn        { display: flex !important; }

          /* main */
          .main-wrap {
            padding: 120px 18px 36px;
            align-items: flex-start;
          }

          /* stack vertically, center everything */
          .book-wrap {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .book-text { align-items: center; width:100%; }

          /* image — centered, no tilt, nice shadow */
          .book-img-outer { width:100%; justify-content:center; }
          .book-perspective { transform: none !important; }
          /* text */
          .eyebrow   { text-align:center; }
          .headline  { text-align:center; font-size:clamp(21px,6vw,28px); }
          .bullet-list { align-self:stretch; text-align:left; }

          /* cta */
          .cta-box { flex-direction:column !important; align-items:stretch !important; text-align:center; }
          .cta-text { text-align:center; }
          .cta-btn  { width:100%; padding:14px 18px; font-size:15px; }
        }

       
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav-root">
        <div className="nav-inner">
          <ManhattanDrillLogo />

          {/* desktop */}
          <div className="nav-desktop">
            <a href="/terms" className="nav-link">Terms</a>
            <a href="/privacy" className="nav-link">Privacy</a>
            {isSignedIn
              ? <button className="nav-btn" style={{ background:'#2d4a2d', color:'#fff' }} onClick={() => router.push('/practice')}>Practice →</button>
              : <button className="nav-btn" style={{ background:'#1a1a18', color:'#fff' }} onClick={() => router.push('/login')}>Sign In →</button>
            }
          </div>

          {/* hamburger */}
          <button className="ham-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>

        {/* mobile dropdown */}
        <div className={`mob-menu${menuOpen ? ' open' : ''}`}>
          <a href="/terms"   onClick={() => setMenuOpen(false)}>Terms</a>
          <a href="/privacy" onClick={() => setMenuOpen(false)}>Privacy</a>
          {isSignedIn
            ? <button className="mob-cta-btn" style={{ background:'#2d4a2d', color:'#fff' }} onClick={() => handleNav('/practice')}>Practice →</button>
            : <button className="mob-cta-btn" style={{ background:'#1a1a18', color:'#fff' }} onClick={() => handleNav('/login')}>Sign In →</button>
          }
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="main-wrap">
        <div className="book-wrap">

          {/* Book image */}
          <div className="book-img-outer">
            <div className="book-perspective">
              <div className="book-box">
                <img src={IMG_BOOK} alt="Manhattan 5lb" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="book-text">
            <p className="eyebrow">Smartest Software for GRE Quant Prep</p>

            <h1 className="headline">
              754+ questions <br />One goal: master manhattan quant 5lb like never before.
            </h1>

            <ul className="bullet-list">
              {BULLETS.map((b, i) => (
                <li key={i} className="bullet-item">
                  <Check />
                  <span>
                    {b.bold && <strong>{b.bold}</strong>}{b.rest}
                  </span>
                </li>
              ))}
            </ul>

            <div className="cta-box">
              <div className="cta-text">
                Join <strong style={{ fontWeight:800, color:'#1a1a18', fontSize:'1.25em' }}>200,000+</strong><br />
                aspirants mastering GRE Quant with Manhattan 5LB
              </div>
              <button className="cta-btn" onClick={() => router.push('/practice')}>
                Start Mastering the GRE Quant &nbsp;›
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}