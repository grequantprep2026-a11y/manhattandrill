'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { createUserProfile } from '../lib/firestore';
import type { UserProfile } from '../lib/types';

type FieldKey = keyof Pick<
  UserProfile,
  'displayName' | 'examDate' | 'attempt' | 'targetScore' | 'studyHours' | 'weakAreas'
>;

interface Step {
  id:          string;
  label:       string;
  type:        'text' | 'date' | 'select' | 'multi';
  placeholder?: string;
  options?:    string[];
  key:         FieldKey;
  emoji:       string;
}

const STEPS: Step[] = [
  { id: 'name',        emoji: '👋', label: "What should we call you?",           type: 'text',   placeholder: 'Your name or username', key: 'displayName' },
  { id: 'examDate',    emoji: '📅', label: 'When is your GRE exam?',              type: 'date',   key: 'examDate' },
  { id: 'attempt',     emoji: '🎯', label: 'Which attempt is this?',              type: 'select', options: ['1st attempt', '2nd attempt', '3rd attempt', '4th+ attempt'], key: 'attempt' },
  { id: 'targetScore', emoji: '🏆', label: 'What is your target Quant score?',    type: 'select', options: ['160–164', '165–167', '168–169', '170 (Perfect)'], key: 'targetScore' },
  { id: 'studyHours',  emoji: '⏰', label: 'How many hours per day can you study?',type: 'select', options: ['< 1 hour', '1–2 hours', '2–3 hours', '3+ hours'], key: 'studyHours' },
  { id: 'weakAreas',   emoji: '🔍', label: 'Which areas feel weakest? (pick any)',type: 'multi',  options: ['Geometry', 'Algebra', 'Word Problems', 'Probability', 'Data Interpretation', 'Number Properties'], key: 'weakAreas' },
];

type Answers = Partial<Record<FieldKey, string | string[]>>;

export default function OnboardingPage() {
  const router  = useRouter();
  const [user, setUser]       = useState<User | null>(null);
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      setAnswers((prev) => ({ ...prev, displayName: u.displayName ?? '' }));
    });
    return () => unsub();
  }, [router]);

  const current = STEPS[step];

  function setValue(val: string) {
    setAnswers((prev) => ({ ...prev, [current.key]: val }));
  }

  function toggleMulti(val: string) {
    setAnswers((prev) => {
      const arr = (prev[current.key] as string[] | undefined) ?? [];
      return {
        ...prev,
        [current.key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  }

  async function handleNext() {
    if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
    if (!user) return;
    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        ...(answers as Partial<UserProfile>),
        email:          user.email ?? '',
        photoURL:       user.photoURL ?? undefined,
        onboardingDone: true,
      });
      router.replace('/practice');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  function canProceed(): boolean {
    const val = answers[current.key];
    if (current.type === 'multi') return true;
    return !!val && String(val).trim() !== '';
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.3s ease' }}>
        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--brand), #7c3aed)', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 36 }}>{current.emoji}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '12px 0 28px' }}>
            {current.label}
          </h2>

          {current.type === 'text' && (
            <input
              type="text"
              value={(answers[current.key] as string) ?? ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={current.placeholder}
              autoFocus
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', outline: 'none' }}
              onFocus={(e)  => { e.target.style.borderColor = 'var(--brand)'; }}
              onBlur={(e)   => { e.target.style.borderColor = 'var(--border)'; }}
            />
          )}

          {current.type === 'date' && (
            <input
              type="date"
              value={(answers[current.key] as string) ?? ''}
              onChange={(e) => setValue(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', outline: 'none', colorScheme: 'light dark' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
            />
          )}

          {current.type === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {current.options!.map((opt) => {
                const active = answers[current.key] === opt;
                return (
                  <button key={opt} onClick={() => setValue(opt)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? 'var(--brand-light)' : 'var(--bg)', border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: active ? 'var(--brand)' : 'var(--text-primary)', cursor: 'pointer', fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}
                  >
                    {opt}
                    {active && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === 'multi' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {current.options!.map((opt) => {
                const selected = ((answers[current.key] as string[]) ?? []).includes(opt);
                return (
                  <button key={opt} onClick={() => toggleMulti(opt)}
                    style={{ background: selected ? 'var(--brand-light)' : 'var(--bg)', border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: selected ? 'var(--brand)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selected ? 600 : 400, transition: 'all 0.15s' }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)}
                style={{ flex: 1, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}>
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              style={{ flex: 2, background: canProceed() ? 'var(--brand)' : 'var(--border)', color: canProceed() ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '13px 20px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: canProceed() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              {loading ? 'Saving…' : step === STEPS.length - 1 ? '🚀 Start Practicing' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}