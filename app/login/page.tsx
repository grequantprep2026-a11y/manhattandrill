'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '../lib/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        router.replace(!profile?.onboardingDone ? '/onboarding' : '/practice');
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      // redirect handled by onAuthStateChanged
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--brand)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '48px 40px', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)', borderRadius: 16, marginBottom: 16, fontSize: 26 }}>
            📐
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            GRE Quant Prep
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
            Manhattan-style questions · Track your progress
          </p>
        </div>

        {/* Feature list */}
        <div style={{ background: 'var(--bg-sidebar)', borderRadius: 12, padding: 16, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            ['📚', '30-day structured study plan'],
            ['⏱️', 'Per-question timer with custom duration'],
            ['📊', 'Community accuracy stats per question'],
          ] as [string, string][]).map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '13px 20px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.15s' }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(66,133,244,0.15)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          {loading ? (
            <div style={{ width: 20, height: 20, border: '2px solid var(--brand)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center', marginTop: 12 }}>{error}</p>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          By continuing, you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Terms</a>{' '}and{' '}
          <a href="/privacy" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to   { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}