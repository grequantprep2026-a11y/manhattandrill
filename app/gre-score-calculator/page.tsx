'use client';

/**
 * /app/gre-score-calculator/page.tsx
 * Manhattan Drill — GRE Quant Score Calculator
 * Free public tool — no auth required.
 * Matches homepage aesthetic exactly: white bg, grid dot bg,
 * same logo SVG, same nav, same pill/eyebrow/font language.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ── Logo — identical to homepage ─────────────────────────────────────────────
const ManhattanDrillLogo = () => (
  <svg width="180" height="44" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42V8L18 28L30 8V42" stroke="#1a1a18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="50" y="24" fontFamily="Inter, -apple-system, sans-serif" fontSize="20" fontWeight="800" fill="#1a1a18" letterSpacing="-0.4">Manhattan</text>
    <text x="50" y="40" fontFamily="Inter, -apple-system, sans-serif" fontSize="12" fontWeight="600" fill="#2d6a4f" letterSpacing="3">DRILL</text>
  </svg>
);

// ── ETS raw→scaled (0–40 correct → 130–170) ──────────────────────────────────
const SCALED: number[] = [
  130, 130, 130, 130, 131, 132, 133, 134, 136, 137,
  138, 139, 141, 142, 143, 144, 146, 147, 148, 149,
  151, 152, 153, 154, 155, 156, 157, 158, 159, 160,
  161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 170,
];

// ETS 2024 percentile data
const PERCENTILE: Record<number, number> = {
  130:1,  131:1,  132:2,  133:3,  134:4,  135:6,
  136:8,  137:10, 138:13, 139:16, 140:20, 141:23,
  142:27, 143:31, 144:36, 145:41, 146:46, 147:50,
  148:55, 149:59, 150:63, 151:67, 152:71, 153:74,
  154:77, 155:80, 156:82, 157:85, 158:87, 159:89,
  160:91, 161:92, 162:94, 163:95, 164:96, 165:97,
  166:98, 167:98, 168:99, 169:99, 170:99,
};

function rawToScaled(raw: number): number {
  return SCALED[Math.max(0, Math.min(40, Math.round(raw)))];
}
function scaledToPct(scaled: number): number {
  return PERCENTILE[Math.max(130, Math.min(170, scaled))] ?? 1;
}
function getTip(scaled: number): string {
  if (scaled <= 140) return 'Focus on arithmetic fundamentals — number properties, fractions, and ratios are highest-yield on the GRE.';
  if (scaled <= 149) return 'Work on Algebra and Data Analysis — the two most frequent GRE Quant topic areas in the 5lb book.';
  if (scaled <= 155) return 'Solid effort. Each extra correct answer in this range adds roughly 1–2 scaled points.';
  if (scaled <= 160) return 'Strong score. Tackle Geometry and QC edge cases to push into the 160s.';
  if (scaled <= 165) return 'Excellent. Most errors at this level are careless — slow down on trap answers.';
  return 'Elite range. Practice the hardest 5lb problems and ETS Power Prep tests to stay here.';
}

type Mode = 'quick' | 'breakdown' | 'target';

export default function GREScoreCalculator() {
  const [mode, setMode] = useState<Mode>('quick');

  // Quick
  const [s1, setS1] = useState(14);
  const [s2, setS2] = useState(14);

  // Breakdown
  const [mc, setMc] = useState(7);
  const [qc, setQc] = useState(5);
  const [ne, setNe] = useState(5);
  const [sa, setSa] = useState(3);

  // Target
  const [ts1, setTs1] = useState(12);
  const [ts2, setTs2] = useState(12);
  const [tgt, setTgt] = useState(34);

  const { raw, scaled, pct, tip } = useMemo(() => {
    const raw =
      mode === 'quick'     ? s1 + s2 :
      mode === 'breakdown' ? mc + qc + ne + sa :
      ts1 + ts2;
    const scaled = rawToScaled(raw);
    return { raw, scaled, pct: scaledToPct(scaled), tip: getTip(scaled) };
  }, [mode, s1, s2, mc, qc, ne, sa, ts1, ts2]);

  const accuracy = Math.round((raw / 40) * 100);

  const scoreColor =
    scaled >= 160 ? '#2d6a4f' :
    scaled >= 150 ? '#1a1a18' :
    scaled >= 140 ? '#b45309' : '#c0392b';

  const barPct = ((scaled - 130) / 40) * 100;

  const tgtScaled = rawToScaled(tgt);
  const gapRaw    = Math.max(0, tgt - (ts1 + ts2));
  const gapScaled = Math.max(0, tgtScaled - scaled);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; background: #ffffff; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

        .grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: .35;
        }

        .calc-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          background: rgba(255,255,255,.94); backdrop-filter: blur(8px);
          gap: 12px;
        }
        @media (min-width: 640px)  { .calc-nav { padding: 20px 32px; } }
        @media (min-width: 1024px) { .calc-nav { padding: 24px 60px; } }

        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-badge {
          font-size: 9px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #2d6a4f;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 99px; padding: 3px 10px;
          display: none;
        }
        @media (min-width: 480px) { .nav-badge { display: inline-block; } }
        .btn-nav {
          background: #1a1a18; color: #fff; border: none; border-radius: 8px;
          padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
          white-space: nowrap; transition: opacity .15s; text-decoration: none;
          display: inline-block; -webkit-tap-highlight-color: transparent;
        }
        .btn-nav:hover { opacity: .8; }
        @media (min-width: 640px) { .btn-nav { padding: 8px 20px; font-size: 13px; } }

        .calc-page {
          position: relative; z-index: 1;
          width: 100%; min-height: 100vh; display: flex; flex-direction: column;
        }
        .calc-main {
          flex: 1; padding: 40px 20px 60px;
          animation: fadeUp .4s ease both;
        }
        @media (min-width: 640px)  { .calc-main { padding: 48px 32px 72px; } }
        @media (min-width: 1024px) { .calc-main { padding: 56px 60px 80px; } }
        .calc-inner { max-width: 860px; margin: 0 auto; }

        .eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .eyebrow-line { width: 20px; height: 1px; background: #d1d5db; }
        .eyebrow-text {
          font-size: 9px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af;
        }
        @media (min-width: 640px) { .eyebrow-text { font-size: 10px; } }

        .calc-title {
          font-size: clamp(28px, 6vw, 48px);
          font-weight: 800; color: #1a1a18;
          letter-spacing: -.03em; line-height: 1.1; margin-bottom: 10px;
        }
        .calc-subtitle {
          font-size: clamp(13px, 2vw, 14px); color: #6b7280;
          line-height: 1.7; max-width: 520px; margin-bottom: 32px;
        }

        .mode-tabs {
          display: flex; gap: 0;
          border: 1px solid #e5e7eb; border-radius: 10px;
          overflow: hidden; width: fit-content;
          margin-bottom: 24px; background: #fff;
          max-width: 100%; overflow-x: auto;
        }
        .mode-tab {
          padding: 9px 18px; font-size: 12px; font-weight: 600;
          border: none; cursor: pointer; transition: all .15s;
          border-right: 1px solid #e5e7eb; white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          flex-shrink: 0;
        }
        .mode-tab:last-child { border-right: none; }
        .mode-tab.active { background: #1a1a18; color: #fff; }
        .mode-tab:not(.active) { background: #fff; color: #6b7280; }
        .mode-tab:not(.active):hover { background: #f9fafb; color: #1a1a18; }

        .calc-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 16px; align-items: start;
        }
        @media (max-width: 700px) { .calc-grid { grid-template-columns: 1fr; } }

        .calc-card {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,.04);
        }
        .card-header {
          padding: 16px 20px 14px; border-bottom: 1px solid #f3f4f6;
        }
        .card-title {
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 2px;
        }
        .card-desc { font-size: 12px; color: #6b7280; line-height: 1.5; }
        .card-body { padding: 20px; }

        .slider-wrap { margin-bottom: 22px; }
        .slider-header {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 8px;
        }
        .slider-label { font-size: 13px; font-weight: 600; color: #374151; }
        .slider-val {
          font-size: 22px; font-weight: 800; color: #1a1a18;
          font-variant-numeric: tabular-nums; letter-spacing: -.04em;
        }
        .slider-max { font-size: 13px; color: #9ca3af; font-weight: 400; }
        .slider-ticks {
          display: flex; justify-content: space-between;
          font-size: 9px; color: #d1d5db; margin-top: 5px; letter-spacing: .05em;
        }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 3px; border-radius: 2px;
          background: #e5e7eb; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: #1a1a18; cursor: pointer;
          border: 3px solid #fff; box-shadow: 0 0 0 1.5px #1a1a18;
          transition: transform .1s;
        }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }

        .stepper-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stepper-wrap {
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 12px;
        }
        .stepper-label {
          font-size: 9px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 8px;
        }
        .stepper-row { display: flex; align-items: center; gap: 6px; }
        .stepper-btn {
          width: 28px; height: 28px; border-radius: 6px;
          background: #fff; border: 1px solid #e5e7eb;
          font-size: 16px; cursor: pointer; color: #374151;
          display: flex; align-items: center; justify-content: center;
          transition: background .1s; font-family: inherit;
        }
        .stepper-btn:hover { background: #f3f4f6; }
        .stepper-num {
          flex: 1; text-align: center; font-size: 22px; font-weight: 800;
          color: #1a1a18; letter-spacing: -.04em; font-variant-numeric: tabular-nums;
        }
        .stepper-max {
          font-size: 9px; color: #9ca3af; text-align: center;
          margin-top: 4px; letter-spacing: .05em;
        }

        .info-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border: 1px solid #e5e7eb;
          border-radius: 99px; background: #f9fafb;
        }
        .pill-key {
          font-size: 9px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af;
        }
        .pill-val { font-size: 13px; font-weight: 800; color: #1a1a18; }

        .gap-box { margin-top: 16px; padding: 12px 16px; border-radius: 10px; border: 1px solid; }
        .gap-title { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
        .gap-sub { font-size: 12px; line-height: 1.6; }

        /* Result card — uses exact unit-cell language from homepage countdown */
        .result-card {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,.04);
          position: sticky; top: 88px;
        }
        .result-top { padding: 18px 20px 14px; border-bottom: 1px solid #f3f4f6; }
        .result-eyebrow {
          font-size: 9px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 4px;
        }
        .result-score {
          font-size: 72px; font-weight: 800;
          letter-spacing: -.05em; line-height: 1;
          font-variant-numeric: tabular-nums; transition: color .3s;
        }
        .result-denom { font-size: 18px; color: #9ca3af; font-weight: 400; }

        .score-bar-wrap { padding: 14px 20px; border-bottom: 1px solid #f3f4f6; }
        .score-bar-track {
          height: 3px; border-radius: 2px;
          background: #e5e7eb; position: relative; overflow: visible;
        }
        .score-bar-fill { height: 100%; border-radius: 2px; transition: width .4s cubic-bezier(.4,0,.2,1); }
        .score-bar-needle {
          position: absolute; top: 50%; transform: translate(-50%, -50%);
          width: 14px; height: 14px; border-radius: 50%;
          border: 3px solid #fff;
          transition: left .4s cubic-bezier(.4,0,.2,1), background .3s;
        }
        .score-bar-labels {
          display: flex; justify-content: space-between;
          margin-top: 6px; font-size: 9px; color: #d1d5db; letter-spacing: .05em;
        }

        /* Stat cells — same visual as countdown unit-cells */
        .stat-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          border-bottom: 1px solid #f3f4f6;
        }
        .stat-cell {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 14px 8px;
          border-right: 1px solid #f3f4f6;
        }
        .stat-cell:last-child { border-right: none; }
        .stat-val {
          font-size: 20px; font-weight: 800; color: #1a1a18;
          letter-spacing: -.03em; font-variant-numeric: tabular-nums;
        }
        .stat-lbl {
          font-size: 9px; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af; margin-top: 4px;
        }

        .tip-wrap { padding: 14px 20px; }
        .tip-row { display: flex; gap: 8px; align-items: flex-start; }
        .tip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .tip-text { font-size: 11px; color: #6b7280; line-height: 1.65; }
        .result-disclaimer { padding: 0 20px 14px; font-size: 10px; color: #9ca3af; line-height: 1.6; }

        /* Reference table */
        .ref-section { margin-top: 48px; padding-top: 40px; border-top: 1px solid #f3f4f6; }
        .ref-eyebrow {
          font-size: 9px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 8px;
        }
        .ref-title {
          font-size: clamp(20px, 4vw, 28px); font-weight: 800;
          color: #1a1a18; letter-spacing: -.03em; margin-bottom: 6px;
        }
        .ref-sub { font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
        .ref-table-wrap {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,.04);
          overflow-x: auto;
        }
        table { width: 100%; border-collapse: collapse; min-width: 400px; }
        th {
          padding: 11px 16px; text-align: left;
          font-size: 9px; font-weight: 700; color: #9ca3af;
          letter-spacing: .1em; text-transform: uppercase;
          background: #f9fafb; border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        td { padding: 10px 16px; font-size: 13px; color: #374151; }
        tr { border-bottom: 1px solid #f9fafb; }
        tr:last-child { border-bottom: none; }
        tr:hover td { background: #fafafa; }

        /* CTA */
        .cta-section {
          background: #1a1a18; margin-top: 56px;
          padding: clamp(40px, 8vw, 72px) clamp(20px, 5vw, 60px);
          text-align: center; position: relative; z-index: 1;
        }
        .cta-inner { max-width: 480px; margin: 0 auto; }
        .cta-eyebrow { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 20px; }
        .cta-eyebrow-line { width: 20px; height: 1px; background: rgba(255,255,255,.2); }
        .cta-eyebrow-text {
          font-size: 9px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: rgba(255,255,255,.4);
        }
        .cta-title {
          font-size: clamp(22px, 5vw, 36px); font-weight: 800;
          color: #fff; letter-spacing: -.03em; line-height: 1.15; margin-bottom: 12px;
        }
        .cta-sub { font-size: 14px; color: rgba(255,255,255,.55); line-height: 1.7; margin-bottom: 28px; }
        .cta-btn {
          display: inline-block; background: #fff; color: #1a1a18;
          border: none; border-radius: 12px;
          padding: 15px 40px; font-size: 14px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          transition: opacity .15s, transform .15s;
          -webkit-tap-highlight-color: transparent;
        }
        .cta-btn:hover { opacity: .9; transform: translateY(-1px); }
        @media (min-width: 480px) { .cta-btn { padding: 16px 60px; font-size: 15px; } }

        /* Footer — identical to homepage */
        .calc-footer {
          position: relative; z-index: 10;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 12px 20px; padding: 20px;
          border-top: 1px solid rgba(0,0,0,.04); background: #fff;
        }
        .footer-link {
          font-size: 11px; font-weight: 500; color: #9ca3af;
          text-decoration: none; letter-spacing: .04em; transition: color .15s;
        }
        .footer-link:hover { color: #1a1a18; }
        .footer-link.active { color: #1a1a18; font-weight: 700; }
        .footer-copy { font-size: 11px; color: #9ca3af; font-weight: 500; }
      `}</style>

      <div style={{ width: '100vw', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
        <div className="grid-bg" />

        {/* ── NAV ── */}
        <nav className="calc-nav">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <ManhattanDrillLogo />
          </Link>
          <div className="nav-right">
            <span className="nav-badge">◆ Free Tool</span>
            <Link href="/practice" className="btn-nav">Practice →</Link>
          </div>
        </nav>

        {/* ── MAIN ── */}
        <div className="calc-page">
          <main className="calc-main">
            <div className="calc-inner">

              {/* Hero */}
              <div className="eyebrow">
                <div className="eyebrow-line" />
                <span className="eyebrow-text">GRE Quantitative Reasoning</span>
                <div className="eyebrow-line" />
              </div>
              <h1 className="calc-title">Score Calculator</h1>
              <p className="calc-subtitle">
                Convert raw correct answers into a scaled score (130–170) using ETS's official conversion tables, with real 2024 percentile data.
              </p>

              {/* Mode tabs */}
              <div className="mode-tabs">
                {([
                  ['quick',     'Quick estimate'],
                  ['breakdown', 'By question type'],
                  ['target',    'Target planner'],
                ] as [Mode, string][]).map(([m, lbl]) => (
                  <button
                    key={m}
                    className={`mode-tab${mode === m ? ' active' : ''}`}
                    onClick={() => setMode(m)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Two-column grid */}
              <div className="calc-grid">

                {/* LEFT: inputs */}
                <div className="calc-card">
                  <div className="card-header">
                    <div className="card-title">
                      {mode === 'quick'     && 'Questions correct'}
                      {mode === 'breakdown' && 'Correct by question type'}
                      {mode === 'target'    && 'Current performance'}
                    </div>
                    <div className="card-desc">
                      {mode === 'quick'     && 'Two sections of 20 questions each — 40 total.'}
                      {mode === 'breakdown' && 'Typical ETS distribution across 40 questions.'}
                      {mode === 'target'    && 'See how many more you need to hit your goal.'}
                    </div>
                  </div>
                  <div className="card-body">

                    {/* QUICK */}
                    {mode === 'quick' && (
                      <>
                        <SliderRow label="Section 1" value={s1} onChange={setS1} />
                        <SliderRow label="Section 2" value={s2} onChange={setS2} />
                        <div className="info-pill">
                          <span className="pill-key">Total correct</span>
                          <span className="pill-val">{s1 + s2} / 40</span>
                        </div>
                      </>
                    )}

                    {/* BREAKDOWN */}
                    {mode === 'breakdown' && (
                      <>
                        <div className="stepper-grid">
                          <StepperCell label="Multiple Choice" value={mc} max={14} onChange={setMc} />
                          <StepperCell label="Quant Comparison" value={qc} max={14} onChange={setQc} />
                          <StepperCell label="Numeric Entry" value={ne} max={10} onChange={setNe} />
                          <StepperCell label="Select All" value={sa} max={8} onChange={setSa} />
                        </div>
                        <div className="info-pill" style={{ marginTop: 16 }}>
                          <span className="pill-key">Total correct</span>
                          <span className="pill-val">{mc + qc + ne + sa} / 40</span>
                        </div>
                      </>
                    )}

                    {/* TARGET */}
                    {mode === 'target' && (
                      <>
                        <SliderRow label="Section 1 — current correct" value={ts1} onChange={setTs1} />
                        <SliderRow label="Section 2 — current correct" value={ts2} onChange={setTs2} />

                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9ca3af', marginBottom: 12 }}>
                            Your raw target
                          </div>
                          <div className="slider-wrap">
                            <div className="slider-header">
                              <span className="slider-label">Target: {tgt} correct → {tgtScaled} scaled</span>
                              <span className="slider-val">{tgt}<span className="slider-max">/40</span></span>
                            </div>
                            <input type="range" min={0} max={40} value={tgt} onChange={e => setTgt(Number(e.target.value))} />
                            <div className="slider-ticks"><span>0</span><span>20</span><span>40</span></div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                            <div className="info-pill">
                              <span className="pill-key">Target scaled</span>
                              <span className="pill-val">{tgtScaled}</span>
                            </div>
                            <div className="info-pill">
                              <span className="pill-key">Percentile</span>
                              <span className="pill-val">{scaledToPct(tgtScaled)}th</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="gap-box"
                          style={{
                            borderColor: gapRaw > 0 ? '#fde68a' : '#bbf7d0',
                            background:  gapRaw > 0 ? '#fffbeb' : '#f0fdf4',
                          }}
                        >
                          <div className="gap-title" style={{ color: gapRaw > 0 ? '#b45309' : '#166534' }}>
                            {gapRaw > 0 ? `${gapRaw} more correct answers needed` : '✓ Target already reached!'}
                          </div>
                          {gapRaw > 0 && (
                            <div className="gap-sub" style={{ color: '#92400e' }}>
                              {gapScaled} scaled point{gapScaled !== 1 ? 's' : ''} away. Work through the 5lb book chapters covering your weak topics to close this gap.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT: result */}
                <div className="result-card">
                  <div className="result-top">
                    <div className="result-eyebrow">Estimated scaled score</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="result-score" style={{ color: scoreColor }}>{scaled}</span>
                      <span className="result-denom">/170</span>
                    </div>
                  </div>

                  <div className="score-bar-wrap">
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${barPct}%`, background: scoreColor }} />
                      <div className="score-bar-needle" style={{ left: `${barPct}%`, background: scoreColor, boxShadow: `0 0 0 1.5px ${scoreColor}` }} />
                    </div>
                    <div className="score-bar-labels">
                      <span>130</span><span>140</span><span>150</span><span>160</span><span>170</span>
                    </div>
                  </div>

                  {/* Stat cells — mirrors homepage countdown unit-cells */}
                  <div className="stat-grid">
                    <div className="stat-cell">
                      <span className="stat-val">{pct}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>th</span></span>
                      <span className="stat-lbl">Percentile</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-val">{raw}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>/40</span></span>
                      <span className="stat-lbl">Raw correct</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-val">{accuracy}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>%</span></span>
                      <span className="stat-lbl">Accuracy</span>
                    </div>
                  </div>

                  <div className="tip-wrap">
                    <div className="tip-row">
                      <div className="tip-dot" style={{ background: scoreColor }} />
                      <div className="tip-text">{tip}</div>
                    </div>
                  </div>

                  <div className="result-disclaimer">
                    Uses ETS published raw→scaled tables. Scores may vary by form due to equating. Percentiles from ETS 2024 data.
                  </div>
                </div>
              </div>

              {/* ── Reference table ── */}
              <div className="ref-section">
                <div className="ref-eyebrow">Reference</div>
                <h2 className="ref-title">Full score table</h2>
                <p className="ref-sub">ETS official raw→scaled conversion across both Quant sections (40 questions combined).</p>
                <div className="ref-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Raw correct</th>
                        <th>Scaled score</th>
                        <th>Percentile</th>
                        <th>Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        [38,40,'170','99th','Elite'],
                        [35,37,'168–169','98–99th','Elite'],
                        [31,34,'164–167','96–98th','Excellent'],
                        [27,30,'160–163','91–95th','Strong'],
                        [23,26,'155–159','80–89th','Above avg'],
                        [19,22,'151–154','67–77th','Average'],
                        [15,18,'146–150','46–63th','Below avg'],
                        [10,14,'139–145','20–41st','Developing'],
                        [0,  9,'130–138','1–13th', 'Foundational'],
                      ] as [number,number,string,string,string][]).map(([lo,hi,sc,p,band]) => (
                        <tr key={lo}>
                          <td style={{ fontWeight: 600, color: '#1a1a18', fontVariantNumeric: 'tabular-nums' }}>
                            {lo === hi ? lo : `${lo}–${hi}`}
                          </td>
                          <td style={{ fontWeight: 700, color: '#1a1a18' }}>{sc}</td>
                          <td style={{ color: '#6b7280' }}>{p}</td>
                          <td>
                            <span style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 700,
                              padding: '2px 9px', borderRadius: 99, letterSpacing: '.05em',
                              background:
                                band === 'Elite'        ? '#f0fdf4' :
                                band === 'Excellent'    ? '#eff6ff' :
                                band === 'Strong'       ? '#fdf4ff' :
                                band === 'Above avg'    ? '#fefce8' :
                                band === 'Average'      ? '#f9fafb' : '#fef2f2',
                              color:
                                band === 'Elite'        ? '#166534' :
                                band === 'Excellent'    ? '#1e40af' :
                                band === 'Strong'       ? '#7e22ce' :
                                band === 'Above avg'    ? '#854d0e' :
                                band === 'Average'      ? '#4b5563' : '#991b1b',
                              border: '1px solid',
                              borderColor:
                                band === 'Elite'        ? '#bbf7d0' :
                                band === 'Excellent'    ? '#bfdbfe' :
                                band === 'Strong'       ? '#e9d5ff' :
                                band === 'Above avg'    ? '#fde68a' :
                                band === 'Average'      ? '#e5e7eb' : '#fecaca',
                            }}>{band}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </main>

          {/* ── CTA ── */}
          <section className="cta-section">
            <div className="cta-inner">
              <div className="cta-eyebrow">
                <div className="cta-eyebrow-line" />
                <span className="cta-eyebrow-text">Manhattan Drill</span>
                <div className="cta-eyebrow-line" />
              </div>
              <h2 className="cta-title">Now drill the problems that move your score.</h2>
              <p className="cta-sub">
                Practice all official Manhattan 5lb problems, full timed mock tests, and step-by-step explanations — completely free.
              </p>
              <Link href="/practice" className="cta-btn">Start Practice →</Link>
            </div>
          </section>

          {/* ── FOOTER — identical to homepage ── */}
          <footer className="calc-footer">
            <Link href="/terms"                className="footer-link">Terms</Link>
            <Link href="/privacy"              className="footer-link">Privacy</Link>
            <Link href="/"                     className="footer-link">Home</Link>
            <Link href="/practice"             className="footer-link">Practice</Link>
            <Link href="/gre-score-calculator" className="footer-link active">Score Calculator</Link>
            <span className="footer-copy">© Manhattan Drill</span>
          </footer>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="slider-wrap">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-val">{value}<span className="slider-max">/20</span></span>
      </div>
      <input type="range" min={0} max={20} value={value} onChange={e => onChange(Number(e.target.value))} />
      <div className="slider-ticks"><span>0</span><span>10</span><span>20</span></div>
    </div>
  );
}

function StepperCell({ label, value, max, onChange }: {
  label: string; value: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="stepper-wrap">
      <div className="stepper-label">{label}</div>
      <div className="stepper-row">
        <button className="stepper-btn" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span className="stepper-num">{value}</span>
        <button className="stepper-btn" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
      <div className="stepper-max">max {max}</div>
    </div>
  );
}