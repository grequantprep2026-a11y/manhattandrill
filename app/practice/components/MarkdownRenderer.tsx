'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  text:       string;
  className?: string;
  style?:     React.CSSProperties;
  inline?:    boolean;
}

let _katexPromise: Promise<any> | null = null;
function loadKaTeX(): Promise<any> {
  if (_katexPromise) return _katexPromise;
  _katexPromise = new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') { reject('ssr'); return; }
    if ((window as any).katex) { resolve((window as any).katex); return; }
    if (!document.getElementById('_kx_css')) {
      const link  = document.createElement('link');
      link.id     = '_kx_css';
      link.rel    = 'stylesheet';
      link.href   = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      document.head.appendChild(link);
    }
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    s.onload  = () => resolve((window as any).katex);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _katexPromise;
}

function MathNode({ expr, display }: { expr: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    loadKaTeX()
      .then(katex => {
        if (!alive || !ref.current) return;
        ref.current.innerHTML = katex.renderToString(expr.trim(), {
          displayMode: display, throwOnError: false, strict: false,
        });
      })
      .catch(() => {
        if (ref.current) ref.current.textContent = display ? `$$${expr}$$` : `$${expr}$`;
      });
    return () => { alive = false; };
  }, [expr, display]);

  return display ? (
    <span ref={ref} style={{ display: 'block', textAlign: 'center', margin: '6px 0', overflowX: 'auto', maxWidth: '100%', lineHeight: 1.2 }}>
      {expr}
    </span>
  ) : (
    <span ref={ref} style={{ display: 'inline', verticalAlign: 'baseline' }}>{expr}</span>
  );
}

type Seg = { t: 'tx'; v: string } | { t: 'mi'; v: string } | { t: 'md'; v: string };
function splitMath(raw: string): Seg[] {
  const out: Seg[] = [];
  const re = /(\$\$[\s\S]*?\$\$|\$(?:[^$\n\\]|\\.)+?\$)/g;
  let cur = 0, m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > cur) out.push({ t: 'tx', v: raw.slice(cur, m.index) });
    out.push(m[0].startsWith('$$') ? { t: 'md', v: m[0].slice(2, -2) } : { t: 'mi', v: m[0].slice(1, -1) });
    cur = m.index + m[0].length;
  }
  if (cur < raw.length) out.push({ t: 'tx', v: raw.slice(cur) });
  return out;
}

const IC: React.CSSProperties = {
  fontFamily: '"JetBrains Mono","Fira Mono","Courier New",monospace',
  fontSize: '0.86em', color: 'var(--text-1)', background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 3, padding: '0 4px',
  letterSpacing: 0, verticalAlign: 'baseline',
};

function fmtText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`\n]+)`)/gs;
  let last = 0, k = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if      (m[2] != null) nodes.push(<strong key={k++} style={{ fontWeight: 600, color: 'var(--text-1)' }}>{m[2]}</strong>);
    else if (m[3] != null) nodes.push(<em key={k++} style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>{m[3]}</em>);
    else if (m[4] != null) nodes.push(<code key={k++} style={IC}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {splitMath(text).flatMap((seg, i) => {
        if (seg.t === 'mi') return [<MathNode key={i} expr={seg.v} display={false} />];
        if (seg.t === 'md') return [<MathNode key={i} expr={seg.v} display={true} />];
        return fmtText(seg.v).map((n, j) => <React.Fragment key={`${i}-${j}`}>{n}</React.Fragment>);
      })}
    </>
  );
}

type Block =
  | { k: 'p';   text: string }
  | { k: 'h';   level: 1|2|3; text: string }
  | { k: 'pre'; lang: string; body: string }
  | { k: 'bq';  lines: string[] }
  | { k: 'ul';  items: string[] }
  | { k: 'ol';  items: string[] }
  | { k: 'hr' };

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n');
  const out:  Block[]  = [];
  const pBuf: string[] = [];
  let i = 0;

  const flushP = () => {
    if (pBuf.length) {
      out.push({ k: 'p', text: pBuf.join(' ') });
      pBuf.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const tr   = line.trim();

    if (tr.startsWith('```')) {
      flushP();
      const lang = tr.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { body.push(lines[i]); i++; }
      i++;
      out.push({ k: 'pre', lang, body: body.join('\n') });
      continue;
    }

    if (/^[-*_]{3,}$/.test(tr)) {
      flushP();
      out.push({ k: 'hr' });
      i++; continue;
    }

    const hm = tr.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      flushP();
      out.push({ k: 'h', level: hm[1].length as 1|2|3, text: hm[2] });
      i++; continue;
    }

    if (tr.startsWith('>')) {
      flushP();
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        bqLines.push(lines[i].trim().replace(/^>\s?/, '')); i++;
      }
      out.push({ k: 'bq', lines: bqLines }); continue;
    }

    if (/^[-*]\s/.test(tr)) {
      flushP();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2)); i++;
      }
      out.push({ k: 'ul', items }); continue;
    }

    if (/^\d+\.\s/.test(tr)) {
      flushP();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++;
      }
      out.push({ k: 'ol', items }); continue;
    }

    if (tr === '') {
      flushP();
      i++; continue;
    }

    pBuf.push(tr);
    i++;
  }

  flushP();
  return out;
}

const BODY_FONT = 'Georgia, "Times New Roman", serif';
const UI_FONT   = '-apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT = '"JetBrains Mono","Fira Mono","Courier New",monospace';
const BODY_SIZE = '13.5px';
const BODY_LH   = 1.75;

function RB({ b, last, inline }: { b: Block; last: boolean; inline: boolean }) {
  const mb = (n: number) => last ? 0 : n;

  switch (b.k) {

    case 'p':
      return inline ? (
        <span style={{
          fontSize: BODY_SIZE,
          lineHeight: BODY_LH,
          color: 'var(--text-1)',
          fontFamily: BODY_FONT,
        }}>
          <Inline text={b.text} />
        </span>
      ) : (
        <p style={{
          margin: `0 0 ${mb(6)}px 0`,
          padding: 0,
          fontSize: BODY_SIZE, lineHeight: BODY_LH,
          color: 'var(--text-1)', fontFamily: BODY_FONT,
        }}>
          <Inline text={b.text} />
        </p>
      );

    case 'h': {
      const cfg = [
        { fs: '15px',   fw: 700, mt: 10, mb: 6, bb: '1px solid var(--border)', pb: 5 },
        { fs: '13.5px', fw: 650, mt: 8,  mb: 4, bb: 'none', pb: 0 },
        { fs: '13px',   fw: 600, mt: 6,  mb: 3, bb: 'none', pb: 0 },
      ][b.level - 1];
      return (
        <div style={{
          fontSize: cfg.fs, fontWeight: cfg.fw,
          color: 'var(--text-1)', fontFamily: UI_FONT,
          margin: `${cfg.mt}px 0 ${mb(cfg.mb)}px 0`,
          lineHeight: 1.3, letterSpacing: b.level === 1 ? '-.01em' : 'normal',
          borderBottom: cfg.bb, paddingBottom: cfg.pb,
        }}>
          <Inline text={b.text} />
        </div>
      );
    }

    case 'bq':
      return (
        <div style={{
          borderLeft: '2px solid var(--text-4)', paddingLeft: 11,
          margin: `0 0 ${mb(6)}px 0`,
          color: 'var(--text-3)', fontSize: '13px',
          lineHeight: 1.7, fontStyle: 'italic', fontFamily: BODY_FONT,
        }}>
          {b.lines.map((l, idx) => <div key={idx}><Inline text={l} /></div>)}
        </div>
      );

    case 'pre':
      return (
        <pre style={{
          margin: `0 0 ${mb(6)}px 0`,
          padding: '9px 13px',
          fontSize: '11.5px', lineHeight: 1.6, overflowX: 'auto',
          color: 'var(--text-1)', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 5,
          fontFamily: MONO_FONT,
        }}>
          <code style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
            {b.body}
          </code>
        </pre>
      );

    case 'ul':
      return (
        <ul style={{
          margin: `0 0 ${mb(6)}px 0`,
          padding: 0, paddingLeft: 17,
          fontSize: BODY_SIZE, lineHeight: BODY_LH,
          color: 'var(--text-1)', fontFamily: BODY_FONT,
        }}>
          {b.items.map((item, j) => (
            <li key={j} style={{ marginBottom: j === b.items.length - 1 ? 0 : 2, padding: 0 }}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol style={{
          margin: `0 0 ${mb(6)}px 0`,
          padding: 0, paddingLeft: 17,
          fontSize: BODY_SIZE, lineHeight: BODY_LH,
          color: 'var(--text-1)', fontFamily: BODY_FONT,
        }}>
          {b.items.map((item, j) => (
            <li key={j} style={{ marginBottom: j === b.items.length - 1 ? 0 : 2, padding: 0 }}>
              <Inline text={item} />
            </li>
          ))}
        </ol>
      );

    case 'hr':
      return (
        <hr style={{
          border: 'none', borderTop: '1px solid var(--border)',
          margin: last ? '6px 0 0' : '6px 0',
        }} />
      );

    default:
      return null;
  }
}

export function MarkdownRenderer({ text, className, style, inline = false }: Props) {
  if (!text?.trim()) return null;
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;

  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper
      className={className}
      style={{ margin: 0, padding: 0, overflow: 'visible', ...style }}
    >
      {blocks.map((b, i) => (
        <RB key={i} b={b} last={i === blocks.length - 1} inline={inline} />
      ))}
    </Wrapper>
  );
}