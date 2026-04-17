'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  createMockSession, saveMockQuestionAttempt,
  finaliseMockSession, getAllMockSessions,
} from '../../lib/firestore';
import { MOCK_SECTION_1, MOCK_SECTION_2, MOCK_SECTION_TIME } from '../../lib/mockQuestions';
import type { UnifiedQuestion } from '../../lib/adapter/adapter';
import type { MockQuestionAttempt, MockTestSession } from '../../lib/types';
import { LIGHT, DARK, GLOBAL_STYLES } from '../styles/theme';
import {
  ContextBlock, QCRenderer, MCRenderer, NumericRenderer, SelectAllRenderer,
} from '../components/renderers';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { isAnswerCorrect, ALPHA } from '../utils/helpers';
import { ReportModal } from '../../components/ReportModal';
import { TOPIC_REGISTRY } from '../../lib/registry/registry';
import { Settings, X, SkipForward, Grid } from 'lucide-react';

type Phase = 'intro' | 'section1' | 'section_break' | 'section2' | 'results';
type QStatus = 'unanswered' | 'answered' | 'skipped' | 'current';

interface AnswerEntry {
  qId:              string;
  isCorrect:        boolean;
  skipped?:         boolean;
  selectedOption?:  number;
  textAnswer?:      string;
  selectedOptions?: string[];
  qcSelected?:      string;
}

function qTypeLabel(t: UnifiedQuestion['type']) {
  if (t === 'quantitative_comparison') return 'QC';
  if (t === 'multiple_choice')         return 'MC';
  if (t === 'numeric_entry')           return 'NE';
  return 'SA';
}

function fmtTime(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTopicLabel(topicId: string) {
  return TOPIC_REGISTRY.find(t => t.id === topicId)?.label ?? topicId;
}

function StatusDot({ status, num, onClick }: { status: QStatus; num: number; onClick: () => void }) {
  const bg =
    status === 'answered' ? 'var(--submit-bg)' :
    status === 'skipped'  ? 'var(--text-4)'    :
    status === 'current'  ? 'var(--text-1)'    :
    'var(--border)';
  const txtColor = status === 'unanswered' ? 'var(--text-3)' : '#fff';
  return (
    <button
      onClick={onClick}
      title={`Question ${num}`}
      style={{
        width: 32, height: 32, borderRadius: 6,
        background: bg, color: txtColor,
        border: status === 'current' ? '2px solid var(--text-1)' : '2px solid transparent',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s', flexShrink: 0,
      }}
    >
      {num}
    </button>
  );
}

function SectionTimer({ duration, running, onExpire, resetKey }: {
  duration: number; running: boolean; onExpire: () => void; resetKey: number;
}) {
  const [remaining, setRemaining] = useState(duration);
  const ivRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => { setRemaining(duration); expiredRef.current = false; }, [resetKey, duration]);
  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!running) return;
    ivRef.current = setInterval(() => setRemaining(p => p - 1), 1000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [running, resetKey]);
  useEffect(() => {
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      if (ivRef.current) clearInterval(ivRef.current);
      setTimeout(onExpire, 0);
    }
  }, [remaining, onExpire]);

  const safe  = Math.max(0, remaining);
  const pct   = safe / duration;
  const color = pct > 0.4 ? 'var(--ok)' : pct > 0.15 ? '#f59e0b' : 'var(--err)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '5px 12px', borderRadius: 8,
      border: `1.5px solid ${color}44`, background: `${color}0a`,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        animation: running && safe <= 60 ? 'pulse 1s infinite' : 'none',
      }} />
      <span style={{
        fontSize: 14, fontWeight: 800, color,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
      }}>
        {fmtTime(safe)}
      </span>
    </div>
  );
}

interface MockTestPageProps { user: User; dark: boolean; onExit: () => void; }

export function MockTestPage({ user, dark, onExit }: MockTestPageProps) {
  const [phase,   setPhase]   = useState<Phase>('intro');
  const [section, setSection] = useState<1 | 2>(1);
  const [qIdx,    setQIdx]    = useState(0);

  const [mcSelected,   setMcSelected]   = useState<number | null>(null);
  const [qcSelected,   setQcSelected]   = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState('');
  const [selectAllSet, setSelectAllSet] = useState<Set<string>>(new Set());
  const [answered,     setAnswered]     = useState(false);

  const [timerRunning,  setTimerRunning]  = useState(false);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const answers      = useRef<Record<string, AnswerEntry>>({});
  const sessionIdRef = useRef<string | null>(null);
  const [pastSessions, setPastSessions] = useState<(MockTestSession & { id: string })[]>([]);

  const [reportOpen,      setReportOpen]      = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false); // mobile sidebar sheet
  const [sidebarSection,  setSidebarSection]  = useState<1 | 2>(1);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen && isMobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isMobile]);

  const currentQuestions = section === 1 ? MOCK_SECTION_1 : MOCK_SECTION_2;
  const currentQ         = currentQuestions[qIdx];
  const typeBadge        = currentQ ? qTypeLabel(currentQ.type) : '';
  const qSource          = currentQ?.source  ?? TOPIC_REGISTRY.find(t => t.id === currentQ?.topicId)?.source  ?? null;
  const qChapter         = currentQ?.chapter ?? TOPIC_REGISTRY.find(t => t.id === currentQ?.topicId)?.chapter ?? null;

  useEffect(() => {
    getAllMockSessions(user.uid).then(s => setPastSessions(s)).catch(() => {});
  }, [user.uid]);

  useEffect(() => { setSidebarSection(section); }, [section]);

  function resetQ() {
    setMcSelected(null); setQcSelected(null); setNumericValue('');
    setSelectAllSet(new Set()); setAnswered(false);
  }

  function goTo(idx: number) { resetQ(); setQIdx(idx); setSidebarOpen(false); }

  function getStatus(q: UnifiedQuestion, idx: number, sec: 1 | 2): QStatus {
    if (sec === section && idx === qIdx) return 'current';
    const a = answers.current[q.id];
    if (!a) return 'unanswered';
    if (a.skipped) return 'skipped';
    return 'answered';
  }

  async function startSection1() {
    const id = await createMockSession(user.uid);
    sessionIdRef.current = id;
    setSection(1); setQIdx(0); resetQ();
    setTimerRunning(true); setTimerResetKey(k => k + 1);
    setPhase('section1');
  }

  function autoFinish(sec: 1 | 2) {
    const qs = sec === 1 ? MOCK_SECTION_1 : MOCK_SECTION_2;
    for (const q of qs) {
      if (!answers.current[q.id]) {
        answers.current[q.id] = { qId: q.id, isCorrect: false, skipped: true };
        if (sessionIdRef.current) {
          saveMockQuestionAttempt(user.uid, sessionIdRef.current, { questionId: q.id, section: sec, isCorrect: false } as MockQuestionAttempt).catch(() => {});
        }
      }
    }
  }

  function handleS1Expire() { autoFinish(1); setTimerRunning(false); setPhase('section_break'); }
  function handleS2Expire() { autoFinish(2); setTimerRunning(false); finishTest(); }

  function proceedToS2() {
    setSection(2); setQIdx(0); resetQ();
    setTimerRunning(true); setTimerResetKey(k => k + 1);
    setPhase('section2');
  }

  async function finishTest() {
    const calc = (qs: UnifiedQuestion[]) => qs.filter(q => {
      const a = answers.current[q.id];
      if (!a || a.skipped) return false;
      let ua: string | string[] = '';
      if      (a.qcSelected)                  ua = a.qcSelected;
      else if (a.selectedOption !== undefined) ua = (q.optionKeys ?? ALPHA)[a.selectedOption];
      else if (a.textAnswer !== undefined)     ua = a.textAnswer;
      else if (a.selectedOptions)             ua = a.selectedOptions;
      const correct = isAnswerCorrect(q, ua);
      answers.current[q.id].isCorrect = correct;
      return correct;
    }).length;

    const s1c = calc(MOCK_SECTION_1);
    const s2c = calc(MOCK_SECTION_2);

    if (sessionIdRef.current) {
      await finaliseMockSession(user.uid, sessionIdRef.current, {
        section1Correct: s1c, section2Correct: s2c,
        totalCorrect: s1c + s2c, totalQuestions: 40,
      }).catch(() => {});
    }
    const updated = await getAllMockSessions(user.uid).catch(() => []);
    setPastSessions(updated);
    setPhase('results'); setTimerRunning(false);
  }

  const handleSubmit = useCallback(async () => {
    if (!currentQ || answered || answers.current[currentQ.id]) return;
    let ua: string | string[] = '';
    if      (currentQ.type === 'quantitative_comparison') { if (!qcSelected) return;         ua = qcSelected; }
    else if (currentQ.type === 'multiple_choice')          { if (mcSelected === null) return;  ua = (currentQ.optionKeys ?? ALPHA)[mcSelected]; }
    else if (currentQ.type === 'numeric_entry')            { if (!numericValue.trim()) return; ua = numericValue.trim(); }
    else if (currentQ.type === 'select_all')               { if (!selectAllSet.size) return;   ua = Array.from(selectAllSet); }

    const entry: AnswerEntry = {
      qId: currentQ.id, isCorrect: false,
      selectedOption:  currentQ.type === 'multiple_choice' && mcSelected !== null ? mcSelected : undefined,
      textAnswer:      currentQ.type === 'numeric_entry' ? numericValue.trim() : undefined,
      selectedOptions: currentQ.type === 'select_all' ? Array.from(selectAllSet) : undefined,
      qcSelected:      currentQ.type === 'quantitative_comparison' ? qcSelected ?? undefined : undefined,
    };
    answers.current[currentQ.id] = entry;
    setAnswered(true);

    if (sessionIdRef.current) {
      saveMockQuestionAttempt(user.uid, sessionIdRef.current, {
        questionId: currentQ.id, section, isCorrect: false,
        selectedOption: entry.selectedOption, textAnswer: entry.textAnswer,
        selectedOptions: entry.selectedOptions, qcSelected: entry.qcSelected,
      } as MockQuestionAttempt).catch(() => {});
    }
  }, [currentQ, answered, qcSelected, mcSelected, numericValue, selectAllSet, section, user.uid]);

  function handleSkip() {
    if (!currentQ || answered) return;
    answers.current[currentQ.id] = { qId: currentQ.id, isCorrect: false, skipped: true };
    if (sessionIdRef.current) {
      saveMockQuestionAttempt(user.uid, sessionIdRef.current, { questionId: currentQ.id, section, isCorrect: false } as MockQuestionAttempt).catch(() => {});
    }
    const qs   = currentQuestions;
    const next = qs.findIndex((q, i) => i > qIdx && !answers.current[q.id]);
    if (next !== -1) goTo(next);
    else if (qIdx < qs.length - 1) goTo(qIdx + 1);
    else {
      setTimerRunning(false);
      if (section === 1) { autoFinish(1); setPhase('section_break'); }
      else               { autoFinish(2); finishTest(); }
    }
  }

  async function handleNext() {
    if (qIdx < currentQuestions.length - 1) { goTo(qIdx + 1); }
    else {
      setTimerRunning(false);
      if (section === 1) { autoFinish(1); setPhase('section_break'); }
      else               { autoFinish(2); await finishTest(); }
    }
  }

  useEffect(() => {
    if (!currentQ) return;
    const c = answers.current[currentQ.id];
    if (c && !c.skipped) {
      setAnswered(true);
      setMcSelected(c.selectedOption ?? null);
      setQcSelected(c.qcSelected ?? null);
      setNumericValue(c.textAnswer ?? '');
      setSelectAllSet(new Set(c.selectedOptions ?? []));
    } else { resetQ(); }
  }, [currentQ?.id, section]);

  const canSubmit = !currentQ || answered ? false
    : currentQ.type === 'quantitative_comparison' ? !!qcSelected
    : currentQ.type === 'multiple_choice'         ? mcSelected !== null
    : currentQ.type === 'numeric_entry'           ? !!numericValue.trim()
    : selectAllSet.size > 0;

  const answeredCount = currentQuestions.filter(q => answers.current[q.id] && !answers.current[q.id].skipped).length;
  const skippedCount  = currentQuestions.filter(q => answers.current[q.id]?.skipped).length;

  const s1Correct = MOCK_SECTION_1.filter(q => answers.current[q.id]?.isCorrect).length;
  const s2Correct = MOCK_SECTION_2.filter(q => answers.current[q.id]?.isCorrect).length;
  const s1Pct     = Math.round((s1Correct / 20) * 100);
  const s2Pct     = Math.round((s2Correct / 20) * 100);
  const totalPct  = Math.round(((s1Correct + s2Correct) / 40) * 100);

  const sidebarQuestions = sidebarSection === 1 ? MOCK_SECTION_1 : MOCK_SECTION_2;

  // ── Settings overlay ───────────────────────────────────────────────────────
  const SettingsOverlay = () => (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={() => setShowSettings(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 320, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Mock Test</span>
          <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 20 }}>
          Section <strong style={{ color: 'var(--text-1)' }}>{section}</strong> · Timer is {timerRunning ? 'running' : 'paused'}.
        </div>
        <button
          onClick={() => { setShowSettings(false); onExit(); }}
          style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600, background: 'var(--err)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Exit Mock Test
        </button>
      </div>
    </div>
  );

  // ── Mobile sidebar sheet ───────────────────────────────────────────────────
  const MobileSidebarSheet = () => (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,.3)' }}
        />
      )}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '70vh', zIndex: 200,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
        transform: sidebarOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .3s ease',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        {/* Section tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {([1, 2] as const).map(sec => (
            <button key={sec} onClick={() => setSidebarSection(sec)} style={{
              flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: sidebarSection === sec ? 'var(--bg-card)' : 'transparent',
              color: sidebarSection === sec ? 'var(--text-1)' : 'var(--text-4)',
              borderBottom: sidebarSection === sec ? '2px solid var(--submit-bg)' : '2px solid transparent',
            }}>
              Section {sec}{sec > section && <span style={{ fontSize: 9, marginLeft: 4, opacity: .5 }}>(locked)</span>}
            </button>
          ))}
        </div>
        {/* Counts */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 20 }}>
          {(() => {
            const qs  = sidebarSection === 1 ? MOCK_SECTION_1 : MOCK_SECTION_2;
            const ans = qs.filter(q => answers.current[q.id] && !answers.current[q.id].skipped).length;
            const ski = qs.filter(q => answers.current[q.id]?.skipped).length;
            const lft = qs.length - ans - ski;
            return [{ val: ans, label: 'Done', color: 'var(--ok)' }, { val: ski, label: 'Skipped', color: 'var(--text-4)' }, { val: lft, label: 'Left', color: 'var(--text-2)' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif' }}>{s.label}</div>
              </div>
            ));
          })()}
        </div>
        {/* Dots grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
          {sidebarSection > section ? (
            <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', marginTop: 24, lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>
              Section 2 unlocks after Section 1 is complete.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sidebarQuestions.map((q, i) => (
                <StatusDot key={q.id} num={i + 1} status={getStatus(q, i, sidebarSection)} onClick={() => { if (sidebarSection === section) goTo(i); }} />
              ))}
            </div>
          )}
        </div>
        {/* End section button */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => { setTimerRunning(false); setSidebarOpen(false); if (section === 1) { autoFinish(1); setPhase('section_break'); } else { autoFinish(2); finishTest(); } }}
            style={{ width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}
          >
            {section === 1 ? 'End Section 1' : 'Finish Test'}
          </button>
        </div>
      </div>
    </>
  );

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <>
        <style>{dark ? DARK : LIGHT}</style>
        <style>{GLOBAL_STYLES}</style>
        <div
          onClick={onExit}
          style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,.14)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}
          >
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>◆ GRE Quantitative Reasoning</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Official Mock Test</div>
              </div>
              <button onClick={onExit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-4)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '16px 18px 20px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 16px' }}>Two timed sections, 20 questions each. No feedback during the test — correct answers shown at the end.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { icon: '📋', label: 'Sections',        value: '2'          },
                  { icon: '❓', label: 'Questions / sec', value: '20'         },
                  { icon: '⏱',  label: 'Time / section',  value: '35 min'     },
                  { icon: '📚', label: 'Topics covered',  value: '23 chapters' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-4)', marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {pastSessions.filter(s => s.status === 'completed').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Previous attempts</div>
                  {pastSessions.filter(s => s.status === 'completed').slice(0, 3).map((s, i) => {
                    const p = s.overallScore ?? 0;
                    const c = p >= 70 ? 'var(--ok)' : p >= 50 ? '#f59e0b' : 'var(--err)';
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 5 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', minWidth: 18 }}>#{i + 1}</div>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p}%`, background: c, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: c, minWidth: 34 }}>{p}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>S1:{s.section1Score ?? '?'}% S2:{s.section2Score ?? '?'}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onExit} style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
                <button onClick={startSection1} style={{ flex: 2, padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'var(--submit-bg)', color: 'var(--submit-txt)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Begin Section 1 →</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── SECTION BREAK ──────────────────────────────────────────────────────────
  if (phase === 'section_break') {
    const ans1 = Object.keys(answers.current).filter(id => MOCK_SECTION_1.some(q => q.id === id) && !answers.current[id].skipped).length;
    const ski1 = Object.keys(answers.current).filter(id => MOCK_SECTION_1.some(q => q.id === id) && answers.current[id].skipped).length;
    return (
      <>
        <style>{dark ? DARK : LIGHT}</style>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 20 }}>
          <div style={{ maxWidth: 440, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}>
            <div style={{ height: 3, background: 'var(--ok)' }} />
            <div style={{ padding: 'clamp(24px, 6vw, 36px) clamp(20px, 6vw, 36px)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-1)', fontFamily: 'system-ui, sans-serif' }}>Section 1 Complete</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>Short break before Section 2. Results shown after both sections.</p>
              <div style={{ padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24, display: 'flex', justifyContent: 'space-around' }}>
                {[{ label: 'Answered', val: ans1 }, { label: 'Skipped', val: ski1 }, { label: 'Total', val: 20 }].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{item.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2, fontFamily: 'system-ui, sans-serif' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={proceedToS2} style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, background: 'var(--submit-bg)', color: 'var(--submit-txt)', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
                Begin Section 2 →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const scoreColor  = totalPct >= 70 ? 'var(--ok)' : totalPct >= 50 ? '#f59e0b' : 'var(--err)';
    const allQuestions = [...MOCK_SECTION_1, ...MOCK_SECTION_2];
    return (
      <>
        <style>{dark ? DARK : LIGHT}</style>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 'clamp(16px, 4vw, 24px)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* Score card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.07)', marginBottom: 16 }}>
              <div style={{ height: 3, background: scoreColor }} />
              <div style={{ padding: 'clamp(20px, 5vw, 32px)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, fontFamily: 'system-ui, sans-serif' }}>GRE Mock Test Complete</div>
                  <div style={{ fontSize: 'clamp(48px, 12vw, 64px)', fontWeight: 800, color: scoreColor, lineHeight: 1, marginBottom: 6 }}>
                    {totalPct}<span style={{ fontSize: '40%', opacity: .5 }}>%</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'system-ui, sans-serif' }}>{s1Correct + s2Correct} of 40 correct</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[{ label: 'Section 1', correct: s1Correct, pct: s1Pct }, { label: 'Section 2', correct: s2Correct, pct: s2Pct }].map(s => {
                    const c = s.pct >= 70 ? 'var(--ok)' : s.pct >= 50 ? '#f59e0b' : 'var(--err)';
                    return (
                      <div key={s.label} style={{ padding: 'clamp(12px, 3vw, 16px)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6, fontFamily: 'system-ui, sans-serif' }}>{s.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: c, marginBottom: 4 }}>{s.pct}%</div>
                        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${s.pct}%`, background: c, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif' }}>{s.correct}/20 correct</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onExit} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>← Back</button>
                  <button onClick={() => { answers.current = {}; setPhase('intro'); setTimerRunning(false); setQIdx(0); setSection(1); resetQ(); }} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, background: 'var(--submit-bg)', color: 'var(--submit-txt)', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>Retake →</button>
                </div>
              </div>
            </div>

            {/* Answer review */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}>
              <div style={{ padding: '16px clamp(16px, 4vw, 24px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'system-ui, sans-serif' }}>Answer Review</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif' }}>All 40 questions</span>
              </div>
              <div style={{ padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allQuestions.map((q, i) => {
                  const a          = answers.current[q.id];
                  const sec        = i < 20 ? 1 : 2;
                  const qNum       = i < 20 ? i + 1 : i - 19;
                  const correct    = a?.isCorrect ?? false;
                  const skippedQ   = a?.skipped ?? !a;
                  const correctAns = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
                  const borderCol  = skippedQ ? 'var(--border)' : correct ? 'var(--ok-bd)' : 'var(--err-bd)';
                  const bgCol      = skippedQ ? 'var(--ctx-bg)' : correct ? 'var(--ok-bg)' : 'var(--err-bg)';
                  const labelCol   = skippedQ ? 'var(--text-4)' : correct ? 'var(--ok)' : 'var(--err)';
                  const label      = skippedQ ? 'Skipped' : correct ? 'Correct ✓' : 'Incorrect ✗';
                  let userAns = '';
                  if (!skippedQ && !correct) {
                    if (a?.textAnswer)                        userAns = a.textAnswer;
                    else if (a?.selectedOption !== undefined) userAns = (q.optionKeys ?? ALPHA)[a.selectedOption];
                    else if (a?.qcSelected)                   userAns = a.qcSelected;
                    else if (a?.selectedOptions?.length)      userAns = a.selectedOptions.join(', ');
                  }
                  return (
                    <div key={q.id} style={{ border: `1px solid ${borderCol}`, borderRadius: 10, background: bgCol, padding: 'clamp(10px, 2vw, 14px) clamp(12px, 3vw, 16px)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flexShrink: 0, minWidth: 52 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', marginBottom: 3, fontFamily: 'system-ui, sans-serif' }}>S{sec} · Q{qNum}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: labelCol, fontFamily: 'system-ui, sans-serif' }}>{label}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 6 }}><MarkdownRenderer text={q.text ?? ''} /></div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontFamily: 'system-ui, sans-serif' }}>
                            {!skippedQ && <span>Correct: <strong style={{ color: 'var(--text-1)' }}>{correctAns}</strong></span>}
                            {userAns   && <span>Yours: <strong style={{ color: 'var(--err)' }}>{userAns}</strong></span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── QUESTION VIEW ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{dark ? DARK : LIGHT}</style>
      <style>{GLOBAL_STYLES}</style>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {showSettings && <SettingsOverlay />}
      {isMobile && <MobileSidebarSheet />}
      {reportOpen && currentQ && (
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} uid={user.uid} questionId={currentQ.id} topicId={currentQ.topicId} questionNum={qIdx + 1} questionType={typeBadge} />
      )}

      <div style={{ display: 'flex', height: '100dvh', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-page)' }}>

        {/* TOP BAR */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '0 clamp(12px, 3vw, 20px)', height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 8,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.01em', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif' }}>
              {isMobile ? 'Mock' : 'GRE Mock Test'}
            </span>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--ctx-bg)', border: '1px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif' }}>
              §{section} · Q{qIdx + 1}/{currentQuestions.length}
            </span>
          </div>

          {/* Timer — center */}
          <SectionTimer duration={MOCK_SECTION_TIME} running={timerRunning} onExpire={section === 1 ? handleS1Expire : handleS2Expire} resetKey={timerResetKey} />

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isMobile && (
              <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>
                {answeredCount}✓ {skippedCount}–
              </span>
            )}
            {/* Mobile: grid button opens sidebar sheet */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(p => !p)}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
              >
                <Grid size={14} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* QUESTION PANEL */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
            overflow: 'hidden', background: 'var(--bg-card)',
            borderRight: isMobile ? 'none' : '1px solid var(--border)',
          }}>
            {/* Scrollable question body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 28px) 0', maxWidth: 720 }}>
                {/* Badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'var(--ctx-bg)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'system-ui, sans-serif' }}>Q{qIdx + 1}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--ctx-bg)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'system-ui, sans-serif' }}>{typeBadge}</span>
                  {!isMobile && (
                    <span style={{ fontSize: 11, color: 'var(--text-4)', background: 'var(--ctx-bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontFamily: 'system-ui, sans-serif' }}>
                      {getTopicLabel(currentQ.topicId)}
                    </span>
                  )}
                  <button
                    onClick={() => setReportOpen(true)}
                    style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-4)', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--err)'; e.currentTarget.style.borderColor = 'var(--err)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    ⚑ Report
                  </button>
                </div>

                {currentQ.context && <ContextBlock text={currentQ.context} />}
                {currentQ.image && (
                  <div style={{ marginBottom: 20 }}>
                    <img src={currentQ.image} alt="diagram" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8 }} />
                  </div>
                )}
                {currentQ.text && (
                  <div style={{ marginBottom: 14, fontSize: 'clamp(14px, 2.5vw, 15px)', lineHeight: 1.8 }}>
                    <MarkdownRenderer text={currentQ.text} />
                  </div>
                )}
                {currentQ.type === 'quantitative_comparison' && !currentQ.text && (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontStyle: 'italic', fontFamily: 'system-ui, sans-serif' }}>
                    Compare the two quantities and choose A, B, C, or D.
                  </p>
                )}

                {currentQ.type === 'quantitative_comparison' && <QCRenderer q={currentQ} selected={qcSelected} submitted={false} onSelect={v => { if (!answered) setQcSelected(v); }} />}
                {currentQ.type === 'multiple_choice' && <div style={{ paddingLeft: 4 }}><MCRenderer q={currentQ} selectedIdx={mcSelected} submitted={false} onSelect={i => { if (!answered) setMcSelected(i); }} /></div>}
                {currentQ.type === 'numeric_entry' && <div style={{ paddingLeft: 4 }}><NumericRenderer value={numericValue} submitted={false} isCorrect={null} correctAnswer="" onChange={v => { if (!answered) setNumericValue(v); }} onSubmit={handleSubmit} /></div>}
                {currentQ.type === 'select_all' && <div style={{ paddingLeft: 4, paddingBottom: 8 }}><SelectAllRenderer q={currentQ} selectedSet={selectAllSet} submitted={false} onToggle={opt => { if (answered) return; setSelectAllSet(prev => { const n = new Set(prev); n.has(opt) ? n.delete(opt) : n.add(opt); return n; }); }} /></div>}

                {(qSource || qChapter) && (
                  <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 11, opacity: 0.35 }}>📖</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'system-ui, sans-serif' }}>
                      {qSource}
                      {qChapter != null && <span style={{ fontStyle: 'normal', fontWeight: 600 }}> · Ch. {qChapter}</span>}
                    </span>
                  </div>
                )}
                <div style={{ height: 28 }} />
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div style={{
              borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
              padding: 'clamp(10px, 2vw, 12px) clamp(14px, 3vw, 24px)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, gap: 8,
            }}>
              <button
                onClick={() => qIdx > 0 && goTo(qIdx - 1)}
                disabled={qIdx === 0}
                style={{
                  background: 'var(--btn-bg)', border: '1px solid var(--btn-bd)', borderRadius: 8,
                  padding: isMobile ? '8px 12px' : '8px 16px',
                  fontSize: 13, cursor: qIdx === 0 ? 'not-allowed' : 'pointer',
                  color: 'var(--btn-txt)', opacity: qIdx === 0 ? 0.35 : 1,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                ← {isMobile ? '' : 'Prev'}
              </button>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!answered && (
                  <button
                    onClick={handleSkip}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 8, padding: isMobile ? '8px 10px' : '8px 14px',
                      fontSize: 12, cursor: 'pointer', color: 'var(--text-3)',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--text-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <SkipForward size={13} />
                    {!isMobile && ' Skip'}
                  </button>
                )}
                {!answered ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                      background: canSubmit ? 'var(--submit-bg)' : 'var(--border)',
                      color: canSubmit ? 'var(--submit-txt)' : 'var(--text-3)',
                      border: 'none', borderRadius: 8,
                      padding: isMobile ? '9px 20px' : '9px 28px',
                      fontWeight: 700, fontSize: 14,
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--submit-bg)', color: 'var(--submit-txt)',
                      border: 'none', borderRadius: 8,
                      padding: isMobile ? '9px 18px' : '9px 24px',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {qIdx < currentQuestions.length - 1
                      ? 'Next →'
                      : section === 1 ? 'End §1 →' : 'Finish →'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR — desktop only */}
          {!isMobile && (
            <div style={{ width: 220, flexShrink: 0, background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Section tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {([1, 2] as const).map(sec => (
                  <button key={sec} onClick={() => setSidebarSection(sec)} style={{ flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: sidebarSection === sec ? 'var(--bg-card)' : 'transparent', color: sidebarSection === sec ? 'var(--text-1)' : 'var(--text-4)', borderBottom: sidebarSection === sec ? '2px solid var(--submit-bg)' : '2px solid transparent', fontFamily: 'system-ui, sans-serif' }}>
                    S{sec}{sec > section && <span style={{ fontSize: 9, marginLeft: 4, opacity: .5 }}>🔒</span>}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {[{ color: 'var(--submit-bg)', label: 'Done' }, { color: 'var(--text-4)', label: 'Skipped' }, { color: 'var(--border)', label: 'Left' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9.5, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Counts */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexShrink: 0 }}>
                {(() => {
                  const qs  = sidebarSection === 1 ? MOCK_SECTION_1 : MOCK_SECTION_2;
                  const ans = qs.filter(q => answers.current[q.id] && !answers.current[q.id].skipped).length;
                  const ski = qs.filter(q => answers.current[q.id]?.skipped).length;
                  const lft = qs.length - ans - ski;
                  return [{ val: ans, label: 'Done' }, { val: ski, label: 'Skip' }, { val: lft, label: 'Left' }].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-4)', fontFamily: 'system-ui, sans-serif' }}>{s.label}</div>
                    </div>
                  ));
                })()}
              </div>
              {/* Dots */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {sidebarSection > section ? (
                  <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', marginTop: 20, lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
                    Section 2 unlocks after Section 1 is complete.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sidebarQuestions.map((q, i) => (
                      <StatusDot key={q.id} num={i + 1} status={getStatus(q, i, sidebarSection)} onClick={() => { if (sidebarSection === section) goTo(i); }} />
                    ))}
                  </div>
                )}
              </div>
              {/* End section */}
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <button
                  onClick={() => { setTimerRunning(false); if (section === 1) { autoFinish(1); setPhase('section_break'); } else { autoFinish(2); finishTest(); } }}
                  style={{ width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 700, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  {section === 1 ? 'End Section 1' : 'Finish Test'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}