export const LIGHT = `
:root {
  --bg:           #f0f2f5;
  --bg-card:      #ffffff;
  --bg-sidebar:   white;
  --border:       #e2e6ee;
  --border-s:     #eaecf0;
  --text-1:       #0f172a;
  --text-2:       #334155;
  --text-3:       #64748b;
  --text-4:       #94a3b8;
  --ok:           #16a34a;
  --ok-bg:        #f0fdf4;
  --ok-bd:        #bbf7d0;
  --err:          #dc2626;
  --err-bg:       #fef2f2;
  --err-bd:       #fecaca;
  --warn-bg:      #fffbeb;
  --warn-bd:      #fde68a;
  --warn-txt:     #92400e;
  --qc-a-bg:      #eff6ff;
  --qc-a-bd:      #bfdbfe;
  --qc-b-bg:      #fdf4ff;
  --qc-b-bd:      #e9d5ff;
  --submit-bg:    #0f172a;
  --submit-txt:   #ffffff;
  --btn-bg:       #ffffff;
  --btn-bd:       #e2e8f0;
  --btn-txt:      #475569;
  --timer-bg:     #f1f5f9;
  --ctx-bg:       #f8fafc;
  --ctx-bd:       #e2e8f0;
  --inp-bg:       #ffffff;
  --inp-bd:       #cbd5e1;
  --inp-focus:    #0f172a;
  --check-bg:     #f8fafc;
  --check-act:    #eff6ff;
  --check-act-bd: #3b82f6;
  --sidebar-act:  #f0f4ff;
  --topic-hover:  #f5f7fa;
  --locked-bg:    #f8f9fa;
  --locked-bd:    #e2e8f0;
  --locked-txt:   #94a3b8;
  --acc:          #f59e0b;
  --acc-bg:       #fffbeb;
  --acc-bd:       #fde68a;
  --md-code-bg:   #f1f5f9;
  --md-code-bd:   #e2e8f0;
  --md-code-txt:  #0f172a;
  --md-blockquote:#64748b;
  --md-blockquote-bd: #3b82f6;
}`;

export const DARK = `
:root {
  --bg:           #0e0d0c;
  --bg-card:      #171614;
  --bg-sidebar:   #131211;
  --border:       #2a2826;
  --border-s:     #222120;
  --text-1:       #ede9e3;
  --text-2:       #a8a5a0;
  --text-3:       #7a7773;
  --text-4:       #4e4c49;
  --ok:           #22c55e;
  --ok-bg:        #052e16;
  --ok-bd:        #166534;
  --err:          #ef4444;
  --err-bg:       #2d0b0b;
  --err-bd:       #991b1b;
  --warn-bg:      #2a1f07;
  --warn-bd:      #78350f;
  --warn-txt:     #fcd34d;
  --qc-a-bg:      #0f1e35;
  --qc-a-bd:      #1e3a5f;
  --qc-b-bg:      #1a0d2e;
  --qc-b-bd:      #3b1f5e;
  --submit-bg:    #ede9e3;
  --submit-txt:   #0e0d0c;
  --btn-bg:       #1f1e1c;
  --btn-bd:       #363432;
  --btn-txt:      #c0bdb8;
  --timer-bg:     #1f1e1c;
  --ctx-bg:       #171614;
  --ctx-bd:       #2a2826;
  --inp-bg:       #171614;
  --inp-bd:       #363432;
  --inp-focus:    #ede9e3;
  --check-bg:     #171614;
  --check-act:    #0f1e35;
  --check-act-bd: #3b82f6;
  --sidebar-act:  #1c1b19;
  --topic-hover:  #1c1b19;
  --locked-bg:    #141312;
  --locked-bd:    #2a2826;
  --locked-txt:   #4e4c49;
  --acc:          #f59e0b;
  --acc-bg:       #2a1f07;
  --acc-bd:       #78350f;
  --md-code-bg:   #1a1918;
  --md-code-bd:   #2a2826;
  --md-code-txt:  #ede9e3;
  --md-blockquote:#7a7773;
  --md-blockquote-bd: #3b82f6;
}`;

export const GLOBAL_STYLES = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;background:var(--bg);color:var(--text-1);font-family:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,sans-serif;}
  button{font-family:inherit;}
  input{font-family:inherit;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

  /* ── Markdown styles ── */
  .md-content { font-family: 'Georgia', 'Times New Roman', serif; font-size: 14px; line-height: 1.75; color: var(--text-2); }
  .md-content p { margin-bottom: 10px; }
  .md-content p:last-child { margin-bottom: 0; }
  .md-content strong { font-weight: 700; color: var(--text-1); }
  .md-content em { font-style: italic; }
  .md-content code {
    font-family: 'IBM Plex Mono', 'SF Mono', 'Courier New', monospace;
    font-size: 12.5px;
    background: var(--md-code-bg);
    border: 1px solid var(--md-code-bd);
    color: var(--md-code-txt);
    padding: 1px 5px;
    border-radius: 4px;
    white-space: pre-wrap;
  }
  .md-content pre {
    background: var(--md-code-bg);
    border: 1px solid var(--md-code-bd);
    border-radius: 8px;
    padding: 14px 16px;
    margin: 10px 0;
    overflow-x: auto;
  }
  .md-content pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    line-height: 1.6;
  }
  .md-content blockquote {
    border-left: 3px solid var(--md-blockquote-bd);
    padding: 6px 14px;
    margin: 10px 0;
    color: var(--md-blockquote);
    font-style: italic;
  }
  .md-content ul, .md-content ol { padding-left: 20px; margin: 8px 0; }
  .md-content li { margin-bottom: 4px; }
  .md-content h1,.md-content h2,.md-content h3 {
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    font-weight: 700;
    color: var(--text-1);
    margin: 14px 0 6px;
  }
  .md-content h1 { font-size: 17px; }
  .md-content h2 { font-size: 15px; }
  .md-content h3 { font-size: 14px; }

  /* Math / formula blocks */
  .md-math-block {
    font-family: 'IBM Plex Mono', 'SF Mono', monospace;
    font-size: 13.5px;
    background: var(--qc-a-bg);
    border: 1px solid var(--qc-a-bd);
    border-radius: 8px;
    padding: 12px 16px;
    margin: 10px 0;
    color: var(--text-1);
    text-align: center;
    letter-spacing: .02em;
    overflow-x: auto;
  }
  .md-math-inline {
    font-family: 'IBM Plex Mono', 'SF Mono', monospace;
    font-size: 13px;
    background: var(--md-code-bg);
    border: 1px solid var(--md-code-bd);
    color: var(--text-1);
    padding: 1px 5px;
    border-radius: 4px;
  }
`;