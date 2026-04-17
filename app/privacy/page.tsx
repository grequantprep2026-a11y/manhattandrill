'use client';
import { useState } from 'react';


export const ManhattanDrillLogo = () => (
  <svg width="180" height="44" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42V8L18 28L30 8V42" stroke="#1a1a18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="50" y="24" fontFamily="Inter, -apple-system, sans-serif" fontSize="20" fontWeight="800" fill="#1a1a18" letterSpacing="-0.4">Manhattan</text>
    <text x="50" y="40" fontFamily="Inter, -apple-system, sans-serif" fontSize="12" fontWeight="600" fill="#2d6a4f" letterSpacing="3">DRILL</text>
  </svg>
);

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

export default function TermsPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        a { text-decoration: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        /* NAV */
        .terms-nav-root {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .terms-nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          height: 56px; padding: 40px 60px;
        }
        .terms-nav-desktop { display: flex; align-items: center; gap: 24px; }
        .terms-nav-link {
          font-size: 13px; font-weight: 500; color: #6b7280;
          text-decoration: none; transition: color .15s;
        }
        .terms-nav-link:hover { color: #1a1a18; }
        .terms-signin-btn {
          background: #1a1a18; color: #fff; border-radius: 8px;
          padding: 8px 18px; font-size: 13px; font-weight: 700;
          text-decoration: none; transition: opacity .15s; display: inline-block;
        }
        .terms-signin-btn:hover { opacity: .85; }

        /* hamburger hidden on desktop */
        .terms-ham-btn {
          display: none; background: none; border: none;
          cursor: pointer; padding: 6px; border-radius: 6px;
          align-items: center; justify-content: center; line-height: 0;
        }

        /* mobile dropdown */
        .terms-mob-menu {
          display: none; flex-direction: column;
          padding: 8px 20px 18px; gap: 0;
          border-top: 1px solid #f0f0ee;
          animation: fadeDown .18s ease;
        }
        .terms-mob-menu.open { display: flex; }
        .terms-mob-menu a {
          display: block; padding: 13px 2px;
          font-size: 15px; font-weight: 500; color: #3a3a37;
          text-decoration: none; border-bottom: 1px solid #f5f5f3;
        }
        .terms-mob-menu a:last-of-type { border-bottom: none; }
        .terms-mob-cta {
          margin-top: 14px; padding: 14px 18px; border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; cursor: pointer; width: 100%;
          text-align: center; background: #1a1a18; color: #fff;
          text-decoration: none; display: block;
        }

        /* CONTENT */
        .terms-main {
          max-width: 680px; margin: 0 auto;
          padding: 64px 24px 96px;
          animation: fadeUp .3s ease;
        }

        /* TABLET */
        @media (min-width: 640px) and (max-width: 900px) {
          .terms-nav-inner { padding: 0 28px; height: 56px; }
          .terms-main { padding: 48px 28px 72px; }
        }

        /* MOBILE */
        @media (max-width: 639px) {
          .terms-nav-inner { padding: 0 18px; height: 54px; }
          .terms-nav-desktop { display: none !important; }
          .terms-ham-btn { display: flex !important; }
          .terms-main { padding: 32px 18px 60px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="terms-nav-root">
        <div className="terms-nav-inner">
          <a href="/"><ManhattanDrillLogo /></a>

          {/* desktop */}
          <div className="terms-nav-desktop">
            <a href="/" className="terms-nav-link">Home</a>
            <a href="/privacy" className="terms-nav-link">Privacy</a>
            <a href="/login" className="terms-signin-btn">Sign In →</a>
          </div>

          {/* hamburger */}
          <button className="terms-ham-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>

        {/* mobile dropdown */}
        <div className={`terms-mob-menu${menuOpen ? ' open' : ''}`}>
          <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/privacy" onClick={() => setMenuOpen(false)}>Privacy</a>
          <a href="/login" className="terms-mob-cta" onClick={() => setMenuOpen(false)}>Sign In →</a>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="terms-main">
        <div style={{ marginBottom:48, paddingBottom:32, borderBottom:'1px solid #e5e7eb' }}>
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#9ca3af', marginBottom:12 }}>Legal Document</p>
          <h1 style={{ fontSize:32, fontWeight:900, color:'#1a1a18', letterSpacing:'-.03em', lineHeight:1.1, marginBottom:12 }}>Terms of Service</h1>
          <p style={{ fontSize:13.5, color:'#6b7280', lineHeight:1.7, fontFamily:'Georgia, serif' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:40 }}>
          <Section title="1. Acceptance of Terms">
            By accessing or using Manhattan Drill ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately. The Service is offered for educational purposes to assist with GRE Quantitative Reasoning preparation. We reserve the right to update these terms at any time, with changes effective upon posting.
          </Section>
          <Section title="2. Use of the Service">
            Manhattan Drill is intended for personal, non-commercial educational use. You agree not to: reproduce, distribute, or resell any content from the Service without written permission; use automated tools to scrape, harvest, or extract question content; attempt to reverse-engineer, decompile, or otherwise tamper with the application; use the Service in any way that violates applicable law.
          </Section>
          <Section title="3. Intellectual Property">
            Practice questions in this application are sourced from the Manhattan Prep 5 lb. Book of GRE Practice Problems. All question content remains the intellectual property of Manhattan Prep, LLC. This application does not claim ownership over question content and is intended solely as a study interface. If you are a representative of Manhattan Prep and have concerns, please contact us at the address below.
          </Section>
          <Section title="4. User Accounts">
            You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. We reserve the right to suspend accounts that violate these terms or engage in fraudulent activity. You may delete your account at any time; this will permanently remove your progress data.
          </Section>
          <Section title="5. Data & Privacy">
            Your use of the Service is also governed by our Privacy Policy. We collect only the data necessary to provide study progress tracking. We do not sell personal data to third parties. See our full Privacy Policy for details.
          </Section>
          <Section title="6. Disclaimers">
            The Service is provided "as is" without warranties of any kind. Manhattan Drill does not guarantee specific test score improvements. The GRE® is a registered trademark of Educational Testing Service (ETS), which does not endorse this product.
          </Section>
          <Section title="7. Limitation of Liability">
            To the fullest extent permitted by law, Manhattan Drill shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our maximum liability to you shall not exceed the amount you paid for the Service in the twelve months prior to the claim.
          </Section>
          <Section title="8. Governing Law">
            These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law provisions.
          </Section>
          <Section title="9. Contact">
            For any questions regarding these Terms of Service, contact us at: manhattandrill@gmail.com
          </Section>
        </div>

        <div style={{ marginTop:64, paddingTop:32, borderTop:'1px solid #e5e7eb' }}>
          <a href="/" style={{ fontSize:12, color:'#9ca3af', letterSpacing:'.06em' }}
            onMouseEnter={e => (e.currentTarget.style.color='#1a1a18')}
            onMouseLeave={e => (e.currentTarget.style.color='#9ca3af')}>← Back to Home</a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize:14, fontWeight:700, color:'#1a1a18', letterSpacing:'-.01em', marginBottom:14, paddingBottom:8, borderBottom:'1px solid #f3f4f6' }}>{title}</h2>
      <p style={{ fontSize:14, lineHeight:1.85, color:'#374151', fontFamily:'Georgia, "Times New Roman", serif' }}>{children}</p>
    </div>
  );
}