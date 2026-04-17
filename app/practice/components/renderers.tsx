'use client';

/**
 * renderers.tsx
 * All question-type renderers + ContextBlock.
 * White/transparent everywhere — no gray/tinted fills.
 * Text, borders, and color-coded state do all the work.
 * Fully responsive for all devices.
 */

import { CSSProperties, useEffect, useState } from 'react';
import type { UnifiedQuestion } from '../../lib/adapter/adapter';
import { ALPHA } from '../utils/helpers';
import { MarkdownRenderer } from './MarkdownRenderer';

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(bp = 600) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < bp);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [bp]);
  return isMobile;
}

// ── Context block — clean, just a left-border, no gray fill ──────────────────
export function ContextBlock({ text }: { text: string }) {
  return (
    <div style={{
      borderLeft: '2px solid var(--border)',
      paddingLeft: 14,
      marginBottom: 18,
      fontSize: 13,
      lineHeight: 1.75,
      color: 'var(--text-2)',
      fontFamily: 'Georgia, "Times New Roman", serif',
      whiteSpace: 'pre-line',
    }}>
      <div><MarkdownRenderer text={text} /></div>
    </div>
  );
}

// ── QC Renderer ───────────────────────────────────────────────────────────────
export function QCRenderer({
  q, selected, submitted, onSelect,
}: {
  q: UnifiedQuestion;
  selected: string | null;
  submitted: boolean;
  onSelect: (v: string) => void;
}) {
  const isMobile = useIsMobile();
  const correct = q.answer as string;

  function optStyle(letter: string): CSSProperties {
    const isSel     = selected === letter;
    const isCorrect = submitted && letter === correct;
    const isWrong   = submitted && isSel && letter !== correct;

    return {
      flex: 1,
      padding: isMobile ? '11px 8px' : '9px 14px',
      minWidth: isMobile ? 60 : undefined,
      border: `1.5px solid ${
        isCorrect ? 'var(--ok)' :
        isWrong   ? 'var(--err)' :
        isSel     ? 'var(--text-2)' :
                    'var(--border)'
      }`,
      borderRadius: 8,
      background: 'transparent',
      color: isCorrect ? 'var(--ok)' : isWrong ? 'var(--err)' : 'var(--text-1)',
      fontWeight: isCorrect || isSel ? 700 : 400,
      fontSize: isMobile ? 15 : 14,
      cursor: submitted ? 'default' : 'pointer',
      transition: 'all .12s',
      textAlign: 'center' as const,
      touchAction: 'manipulation',
    };
  }

  return (
    <div>
      {/* Quantity boxes — minimal borders, white bg */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 14, marginBottom: 18,
      }}>
        <div style={{
          flex: 1,
          border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '.1em', marginBottom: 7, textTransform: 'uppercase' }}>
            Quantity A
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-1)', fontFamily: 'Georgia, serif', lineHeight: 1.5 }}>
            <MarkdownRenderer text={q.quantityA ?? ''} />
          </div>
        </div>
        <div style={{
          flex: 1,
          border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '.1em', marginBottom: 7, textTransform: 'uppercase' }}>
            Quantity B
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-1)', fontFamily: 'Georgia, serif', lineHeight: 1.5 }}>
            <MarkdownRenderer text={q.quantityB ?? ''} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 10, fontStyle: 'italic' }}>
        A = Qty A greater · B = Qty B greater · C = Equal · D = Cannot determine
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['A', 'B', 'C', 'D'].map(letter => (
          <button key={letter} style={optStyle(letter)} onClick={() => { if (!submitted) onSelect(letter); }}>
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MC Renderer ───────────────────────────────────────────────────────────────
export function MCRenderer({
  q, selectedIdx, submitted, onSelect,
}: {
  q: UnifiedQuestion;
  selectedIdx: number | null;
  submitted: boolean;
  onSelect: (i: number) => void;
}) {
  const isMobile  = useIsMobile();
  const correctKey = q.answer as string;
  const correctIdx = (q.optionKeys ?? ALPHA).indexOf(correctKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 10 }}>
      {(q.options ?? []).map((opt, i) => {
        const isSel     = selectedIdx === i;
        const isCorrect = submitted && i === correctIdx;
        const isWrong   = submitted && isSel && i !== correctIdx;
        const key       = (q.optionKeys ?? ALPHA)[i];

        return (
          <div
            key={i}
            onClick={() => { if (!submitted) onSelect(i); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11,
              cursor: submitted ? 'default' : 'pointer', userSelect: 'none',
              padding: isMobile ? '4px 0' : 0,
              touchAction: 'manipulation',
            }}
          >
            {/* Radio dot — border only, no fill */}
            <div style={{
              width: isMobile ? 20 : 18,
              height: isMobile ? 20 : 18,
              borderRadius: '50%', flexShrink: 0,
              marginTop: isMobile ? 3 : 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${
                isCorrect ? 'var(--ok)' :
                isWrong   ? 'var(--err)' :
                isSel     ? 'var(--text-1)' :
                            'var(--border)'
              }`,
              background: 'transparent',
              transition: 'border .1s',
            }}>
              {(isSel || isCorrect) && (
                <div style={{
                  width: isMobile ? 9 : 8,
                  height: isMobile ? 9 : 8,
                  borderRadius: '50%',
                  background: isCorrect ? 'var(--ok)' : isWrong ? 'var(--err)' : 'var(--text-1)',
                }} />
              )}
            </div>

            {/* Option text */}
            <span style={{
              fontSize: isMobile ? 14.5 : 13.5,
              lineHeight: 1.65,
              color: isCorrect ? 'var(--ok)' : isWrong ? 'var(--err)' : 'var(--text-1)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: isCorrect ? 600 : 400,
            }}>
              <span style={{
                color: 'var(--text-4)', marginRight: 5, fontSize: isMobile ? 13 : 12,
                fontFamily: '-apple-system, sans-serif',
              }}>
                ({key})
              </span>
              <span style={{ display: 'inline' }}>
                <MarkdownRenderer text={opt} inline />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Numeric Renderer ──────────────────────────────────────────────────────────
export function NumericRenderer({
  value, submitted, isCorrect, correctAnswer, onChange, onSubmit,
}: {
  value: string;
  submitted: boolean;
  isCorrect: boolean | null;
  correctAnswer: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const isMobile = useIsMobile();
  const borderColor = !submitted
    ? 'var(--border)'
    : isCorrect ? 'var(--ok)' : 'var(--err)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Enter your answer:
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={submitted}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !submitted) onSubmit(); }}
          placeholder="Type answer…"
          style={{
            width: isMobile ? '100%' : 200,
            padding: isMobile ? '12px 13px' : '9px 13px',
            fontSize: isMobile ? 16 : 15,
            border: `1.5px solid ${borderColor}`,
            borderRadius: 7,
            background: 'transparent',
            color: 'var(--text-1)',
            outline: 'none',
            fontFamily: 'Georgia, serif',
            transition: 'border .15s',
            boxSizing: 'border-box',
          }}
        />
        {submitted && isCorrect !== null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: isCorrect ? 'var(--ok)' : 'var(--err)' }}>
            {isCorrect ? '✓' : '✗'}
          </span>
        )}
      </div>
      {submitted && !isCorrect && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          Correct: <strong style={{ color: 'var(--ok)', fontWeight: 600 }}>{correctAnswer}</strong>
        </p>
      )}
    </div>
  );
}

// ── Select All Renderer ───────────────────────────────────────────────────────
export function SelectAllRenderer({
  q, selectedSet, submitted, onToggle,
}: {
  q: UnifiedQuestion;
  selectedSet: Set<string>;
  submitted: boolean;
  onToggle: (opt: string) => void;
}) {
  const isMobile  = useIsMobile();
  const correctSet = new Set(q.answer as string[]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 11 : 9 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>
        Select all that apply.
      </p>
      {(q.options ?? []).map((opt, i) => {
        const isSel  = selectedSet.has(opt);
        const isCor  = submitted && correctSet.has(opt);
        const isWrng = submitted && isSel && !correctSet.has(opt);
        const missed = submitted && !isSel && correctSet.has(opt);

        const bdColor =
          isCor || missed ? 'var(--ok)'  :
          isWrng          ? 'var(--err)' :
          isSel           ? 'var(--text-2)' :
                            'var(--border)';

        return (
          <div
            key={i}
            onClick={() => { if (!submitted) onToggle(opt); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11,
              border: `1.5px solid ${bdColor}`,
              borderRadius: 8,
              padding: isMobile ? '12px 13px' : '10px 13px',
              cursor: submitted ? 'default' : 'pointer',
              background: 'transparent',
              transition: 'border .12s',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            {/* Checkbox — border only */}
            <div style={{
              width: isMobile ? 18 : 16,
              height: isMobile ? 18 : 16,
              borderRadius: 4, flexShrink: 0,
              marginTop: isMobile ? 3 : 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${bdColor}`,
              background: isSel || isCor || missed ? bdColor : 'transparent',
              transition: 'all .1s',
            }}>
              {(isSel || isCor || missed) && (
                <span style={{ color: 'white', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>
              )}
            </div>

            <span style={{
              fontSize: isMobile ? 14.5 : 13.5,
              lineHeight: 1.6,
              fontFamily: 'Georgia, serif',
              color: isCor || missed ? 'var(--ok)' : isWrng ? 'var(--err)' : 'var(--text-1)',
              fontWeight: isCor || missed ? 600 : 400,
            }}>
              <MarkdownRenderer text={opt} inline />
              {missed && (
                <span style={{ fontSize: 11, color: 'var(--ok)', marginLeft: 8, fontStyle: 'italic' }}>
                  (correct)
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}