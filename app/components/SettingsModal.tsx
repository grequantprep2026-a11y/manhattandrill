"use client";

import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { updateUserProfile } from "../lib/firestore";
import { Toggle } from "../practice/components/ui";
import { FeedbackModal } from "../components/FeedbackModel";
import { BillingModal } from "../components/BillingModal";

interface Props {
  open: boolean;
  onClose: () => void;
  timerMinutes: number;
  onTimerChange: (m: number) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    metadata?: { creationTime?: string };
  } | null;
  onLogout: () => void;
  onNameSave: (name: string) => void;
  isPro?: boolean;
}

type Tab = "account" | "study" | "plan" | "help";

export function SettingsModal({
  open,
  onClose,
  timerMinutes,
  onTimerChange,
  darkMode,
  onDarkModeChange,
  user,
  onLogout,
  onNameSave,
  isPro = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("account");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.displayName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [sessionTarget, setSessionTarget] = useState(10);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [billingOpen, setBillingOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";
  const initial = displayName.charAt(0).toUpperCase();
  const joinDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const checkoutUrl =
    user?.email && user?.uid
      ? `https://checkout.dodopayments.com/buy/pdt_0NcbbD8tiMjvLAGeiI4p4?quantity=1&email=${encodeURIComponent(user.email)}&external_id=${user.uid}&disableEmail=true`
      : "https://checkout.dodopayments.com/buy/pdt_0NcbbD8tiMjvLAGeiI4p4?quantity=1";

  useEffect(() => {
    if (editingName) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editingName]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close mobile nav when tab changes
  const handleTabChange = (t: Tab) => {
    setTab(t);
    setMobileNavOpen(false);
  };

  if (!open) return null;

  async function handleNameSave() {
    const trimmed = nameVal.trim();
    if (!trimmed) return;
    if (trimmed === displayName) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameError("");
    try {
      if (auth.currentUser)
        await updateProfile(auth.currentUser, { displayName: trimmed });
      if (user?.uid)
        await updateUserProfile(user.uid, { displayName: trimmed });
      onNameSave(trimmed);
      setEditingName(false);
    } catch (err: any) {
      setNameError(err?.message ?? "Failed to save. Try again.");
    } finally {
      setNameSaving(false);
    }
  }

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "account", icon: "◯", label: "Account" },
    { id: "study", icon: "◈", label: "Study" },
    { id: "plan", icon: "★", label: "Plan" },
    { id: "help", icon: "◇", label: "Help" },
  ];

  const currentTabLabel = TABS.find((t) => t.id === tab)?.label ?? "Settings";

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: darkMode ? "rgba(0,0,0,.65)" : "rgba(0,0,0,.35)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          animation: "smFadeIn .15s ease",
        }}
      >
        <style>{`
          @keyframes smFadeIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
          @keyframes smSlideIn { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:none } }
          @keyframes smShimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
          @keyframes smDropDown { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
          .sm-tab-btn:hover     { background: var(--sm-hover) !important; }
          .sm-link-row:hover    { background: var(--sm-hover) !important; }
          .sm-name-input:focus  { outline: none; border-color: var(--text-1) !important; }
          .sm-close-btn:hover   { background: var(--sm-hover) !important; }
          .sm-logout-btn:hover  { opacity: 0.8; }
          .sm-timer-btn:hover   { opacity: 0.75; }
          .sm-save-btn:hover    { opacity: 0.85; }
          .sm-upgrade-btn:hover { opacity:.88; transform:translateY(-1px); box-shadow:0 6px 24px rgba(180,83,9,.35) !important; }
          .sm-upgrade-btn       { transition: opacity .15s, transform .15s, box-shadow .15s !important; }
          .sm-mob-dropdown-btn:hover { background: var(--sm-hover) !important; }

          /* ── RESPONSIVE LAYOUT ── */

          /* Desktop: side-by-side rail + content */
          .sm-shell {
            display: flex;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            width: 100%;
            max-width: 580px;
            max-height: 88vh;
            box-shadow: ${darkMode
              ? "0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)"
              : "0 32px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)"};
          }
          .sm-left-rail {
            width: 168px;
            flex-shrink: 0;
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: ${darkMode ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.015)"};
          }
          .sm-right-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-height: 88vh;
          }

          /* Mobile top tab bar (hidden on desktop) */
          .sm-mob-header {
            display: none;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            position: relative;
          }
          .sm-mob-tab-label {
            font-size: 14px;
            font-weight: 800;
            color: var(--text-1);
            letter-spacing: -.02em;
          }
          .sm-mob-dropdown-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 7px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-3);
            transition: background .1s;
          }
          .sm-mob-nav-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            right: 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,.12);
            z-index: 10;
            min-width: 140px;
            animation: smDropDown .15s ease;
          }
          .sm-mob-nav-dropdown.open { display: block; }
          .sm-mob-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border: none;
            background: transparent;
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-1);
            transition: background .1s;
          }
          .sm-mob-nav-item:hover { background: var(--sm-hover); }
          .sm-mob-nav-item.active { font-weight: 700; }

          /* Desktop header inside right panel */
          .sm-desk-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 22px 16px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
          }

          /* Tablet: shrink rail */
          @media (min-width: 480px) and (max-width: 640px) {
            .sm-shell { max-width: 100%; border-radius: 12px; }
            .sm-left-rail { width: 130px; }
          }

          /* Mobile: hide left rail, show top dropdown nav */
          @media (max-width: 479px) {
            .sm-shell {
              flex-direction: column;
              max-width: 100%;
              border-radius: 14px;
              max-height: 92vh;
            }
            .sm-left-rail { display: none !important; }
            .sm-right-content { max-height: 92vh; }
            .sm-mob-header { display: flex !important; }
            .sm-desk-header { display: none !important; }
          }
        `}</style>

        <div
          className="sm-shell"
          onClick={(e) => e.stopPropagation()}
          style={{ ["--sm-hover" as any]: darkMode ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)" }}
        >
          {/* ── Left rail (desktop/tablet) ── */}
          <div className="sm-left-rail">
            <div style={{ padding: "20px 16px 14px" }}>
              <div
                style={{
                  fontFamily: '"JetBrains Mono","Courier New",monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-4)",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                GRE Quant
              </div>
              <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                Settings
              </div>
            </div>

            <nav style={{ flex: 1, padding: "0 8px" }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className="sm-tab-btn"
                  onClick={() => setTab(t.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 10px",
                    marginBottom: 2,
                    background:
                      tab === t.id
                        ? darkMode ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.07)"
                        : "transparent",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background .1s",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono",monospace',
                      fontSize: t.id === "plan" ? 11 : 12,
                      color:
                        t.id === "plan"
                          ? isPro ? "#f59e0b" : tab === "plan" ? "#b45309" : "var(--text-4)"
                          : tab === t.id ? "var(--text-1)" : "var(--text-4)",
                    }}
                  >
                    {t.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: tab === t.id ? 700 : 500,
                      color: tab === t.id ? "var(--text-1)" : "var(--text-3)",
                      transition: "color .1s",
                    }}
                  >
                    {t.label}
                  </span>
                  {t.id === "plan" && isPro && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 8,
                        fontWeight: 800,
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        borderRadius: 4,
                        padding: "1px 5px",
                        letterSpacing: ".05em",
                        textTransform: "uppercase",
                      }}
                    >
                      PRO
                    </span>
                  )}
                  {t.id === "plan" && !isPro && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>

            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
              <div
                style={{
                  fontFamily: '"JetBrains Mono",monospace',
                  fontSize: 9.5,
                  color: "var(--text-4)",
                  letterSpacing: ".06em",
                }}
              >
                v1.0.0 · Manhattan 5lb
              </div>
            </div>
          </div>

          {/* ── Right content ── */}
          <div className="sm-right-content">

            {/* Mobile header with dropdown tab switcher */}
            <div className="sm-mob-header">
              <div className="sm-mob-tab-label">{currentTabLabel}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Tab switcher dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    className="sm-mob-dropdown-btn"
                    onClick={() => setMobileNavOpen(o => !o)}
                  >
                    <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10 }}>
                      {TABS.find(t => t.id === tab)?.icon}
                    </span>
                    <span>Switch</span>
                    <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace' }}>▾</span>
                  </button>
                  <div className={`sm-mob-nav-dropdown${mobileNavOpen ? ' open' : ''}`}>
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        className={`sm-mob-nav-item${tab === t.id ? ' active' : ''}`}
                        onClick={() => handleTabChange(t.id)}
                      >
                        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: "var(--text-4)" }}>{t.icon}</span>
                        <span>{t.label}</span>
                        {t.id === "plan" && !isPro && (
                          <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                        )}
                        {t.id === "plan" && isPro && (
                          <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 800, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 4, padding: "1px 5px", letterSpacing: ".05em", textTransform: "uppercase" as const }}>PRO</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Close button */}
                <button
                  className="sm-close-btn"
                  onClick={onClose}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-3)",
                    transition: "background .1s",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Desktop header */}
            <div className="sm-desk-header">
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text-1)",
                  letterSpacing: "-.02em",
                }}
              >
                {currentTabLabel}
              </div>
              <button
                className="sm-close-btn"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-3)",
                  transition: "background .1s",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "22px",
                animation: "smSlideIn .18s ease",
              }}
              key={tab}
              onClick={() => setMobileNavOpen(false)}
            >
              {/* ── ACCOUNT ── */}
              {tab === "account" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* Avatar row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "var(--submit-bg)",
                        color: "var(--submit-txt)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: '"JetBrains Mono",monospace',
                        flexShrink: 0,
                        border: "2px solid var(--border)",
                        position: "relative",
                      }}
                    >
                      {initial}
                      {isPro && (
                        <span
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -6,
                            fontSize: 14,
                            lineHeight: 1,
                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,.2))",
                          }}
                        >
                          ★
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                          {displayName}
                        </div>
                        {isPro ? (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              background: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              borderRadius: 4,
                              padding: "2px 7px",
                              letterSpacing: ".08em",
                              textTransform: "uppercase",
                            }}
                          >
                            PRO
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              background: darkMode ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)",
                              color: "var(--text-4)",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "2px 7px",
                              letterSpacing: ".08em",
                              textTransform: "uppercase",
                            }}
                          >
                            FREE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-4)", marginTop: 2 }}>
                        {user?.email ?? "—"}
                      </div>
                      {joinDate && (
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--text-4)",
                            marginTop: 3,
                            fontFamily: '"JetBrains Mono",monospace',
                            letterSpacing: ".04em",
                          }}
                        >
                          Member since {joinDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Display name */}
                  <FieldLabel>Display Name</FieldLabel>
                  {editingName ? (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          ref={inputRef}
                          className="sm-name-input"
                          value={nameVal}
                          onChange={(e) => setNameVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleNameSave();
                            if (e.key === "Escape") setEditingName(false);
                          }}
                          placeholder="Your display name"
                          maxLength={40}
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "9px 12px",
                            fontSize: 13,
                            color: "var(--text-1)",
                            fontFamily: "inherit",
                            transition: "border-color .15s",
                          }}
                        />
                        <button
                          className="sm-save-btn"
                          onClick={handleNameSave}
                          disabled={nameSaving || !nameVal.trim()}
                          style={{
                            background: "var(--submit-bg)",
                            color: "var(--submit-txt)",
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 16px",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: nameSaving ? 0.6 : 1,
                            transition: "opacity .1s",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {nameSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditingName(false); setNameError(""); }}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "9px 12px",
                            fontSize: 12,
                            cursor: "pointer",
                            color: "var(--text-3)",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      {nameError && (
                        <div style={{ fontSize: 11, color: "var(--err)", marginTop: 6 }}>
                          {nameError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        marginBottom: 18,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-1)" }}>{displayName}</span>
                      <button
                        onClick={() => { setNameVal(displayName); setEditingName(true); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: 11.5,
                          color: "var(--text-4)",
                          cursor: "pointer",
                          padding: "2px 6px",
                          fontFamily: '"JetBrains Mono",monospace',
                        }}
                      >
                        edit →
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  <FieldLabel>Email</FieldLabel>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginBottom: 28,
                      background: darkMode ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.03)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-3)", wordBreak: "break-all" }}>
                      {user?.email ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-4)",
                        fontFamily: '"JetBrains Mono",monospace',
                        letterSpacing: ".06em",
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      locked
                    </span>
                  </div>

                  <Divider />

                  <div style={{ marginTop: 20 }}>
                    <FieldLabel>Session</FieldLabel>
                    <button
                      className="sm-logout-btn"
                      onClick={() => { onLogout(); onClose(); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        background: "transparent",
                        border: "1px solid var(--err-bd)",
                        borderRadius: 9,
                        padding: "11px 16px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--err)",
                        transition: "opacity .12s",
                      }}
                    >
                      <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 14 }}>→</span>
                      Sign out
                    </button>
                  </div>
                </div>
              )}

              {/* ── STUDY ── */}
              {tab === "study" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <FieldLabel>Appearance</FieldLabel>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: 9,
                      marginBottom: 22,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                        Dark Mode
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                        Easy on the eyes during long sessions
                      </div>
                    </div>
                    <Toggle value={darkMode} onChange={onDarkModeChange} />
                  </div>

                  <FieldLabel>Timer per Question</FieldLabel>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    {[1, 2, 3, 4].map((m) => (
                      <button
                        key={m}
                        className="sm-timer-btn"
                        onClick={() => onTimerChange(m)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono",monospace',
                          borderRadius: 8,
                          cursor: "pointer",
                          border: `1.5px solid ${timerMinutes === m ? "var(--text-1)" : "var(--border)"}`,
                          background:
                            timerMinutes === m
                              ? darkMode ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)"
                              : "transparent",
                          color: timerMinutes === m ? "var(--text-1)" : "var(--text-3)",
                          transition: "all .1s",
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 24 }}>
                    Timer resets automatically for each new question.
                  </div>

                  <Divider />

                  <FieldLabel style={{ marginTop: 20 }}>Daily Question Target</FieldLabel>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    {[5, 10, 15, 20, 25].map((n) => (
                      <button
                        key={n}
                        className="sm-timer-btn"
                        onClick={() => setSessionTarget(n)}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          fontSize: 11.5,
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono",monospace',
                          borderRadius: 8,
                          cursor: "pointer",
                          border: `1.5px solid ${sessionTarget === n ? "var(--text-1)" : "var(--border)"}`,
                          background:
                            sessionTarget === n
                              ? darkMode ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)"
                              : "transparent",
                          color: sessionTarget === n ? "var(--text-1)" : "var(--text-3)",
                          transition: "all .1s",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 24 }}>
                    A gentle daily nudge. No streak pressure — just a guide.
                  </div>
                </div>
              )}

              {/* ── PLAN ── */}
              {tab === "plan" && (
                <div>
                  {isPro ? (
                    <div>
                      <div
                        style={{
                          height: 3,
                          background: "linear-gradient(90deg,#b45309,#f59e0b,#fcd34d,#f59e0b,#b45309)",
                          borderRadius: 2,
                          marginBottom: 20,
                        }}
                      />
                      <div
                        style={{
                          border: "1.5px solid #fde68a",
                          borderRadius: 12,
                          padding: "18px 20px",
                          marginBottom: 22,
                          background: darkMode ? "rgba(251,191,36,.06)" : "#fffbeb",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            right: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 64,
                            opacity: 0.06,
                            fontFamily: '"JetBrains Mono",monospace',
                            userSelect: "none",
                            pointerEvents: "none",
                            lineHeight: 1,
                          }}
                        >
                          ★
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              background: "linear-gradient(135deg,#b45309,#f59e0b)",
                              color: "#fff",
                              borderRadius: 5,
                              padding: "3px 10px",
                              letterSpacing: ".1em",
                              textTransform: "uppercase",
                            }}
                          >
                            ★ Pro Plan Active
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                          You have full access
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                          All 23 GRE Quant topics, unlimited mock tests, similar questions, and priority features are unlocked.
                        </div>
                      </div>

                      <FieldLabel>What's included</FieldLabel>
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          overflow: "hidden",
                          marginBottom: 20,
                        }}
                      >
                        {[
                          "All 23 GRE Quant topics",
                          "Unlimited mock tests",
                          "Unlimited re-attempts",
                          "Full answer explanations",
                          "Progress tracking & stats",
                        ].map((feat, i, arr) => (
                          <div
                            key={feat}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 14px",
                              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <span style={{ color: "var(--ok)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 12.5, color: "var(--text-1)", fontWeight: 500 }}>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

                      <FieldLabel>Manage subscription</FieldLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          onClick={() => setBillingOpen(true)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            padding: "11px 16px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: 9,
                            cursor: "pointer",
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: "var(--text-1)",
                            transition: "opacity .12s",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Request refund or cancel plan</span>
                          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: "var(--text-4)" }}>
                            Open →
                          </span>
                        </button>
                        <div style={{ fontSize: 11, color: "var(--text-4)", lineHeight: 1.6 }}>
                          Processed within 24 hours. Questions?{" "}
                          <a href="mailto:manhattandrill@gmail.com" style={{ color: "var(--text-3)" }}>
                            manhattandrill@gmail.com
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: darkMode ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-4)",
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          marginBottom: 18,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-4)", flexShrink: 0 }} />
                        Free Plan
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "16px 18px",
                          marginBottom: 20,
                          background: darkMode ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.02)",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
                          Your current limits
                        </div>
                        {[
                          { label: "1 of 23 topics", note: "Arithmetic only" },
                          { label: "1 mock test", note: "No re-attempts after using it" },
                        ].map((row, i, arr) => (
                          <div
                            key={row.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 0",
                              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <span style={{ color: "var(--err)", fontSize: 11, flexShrink: 0 }}>✗</span>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>{row.label}</div>
                              <div style={{ fontSize: 11, color: "var(--text-4)" }}>{row.note}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          height: 2,
                          background: "linear-gradient(90deg,#b45309,#f59e0b,#b45309)",
                          borderRadius: 1,
                          marginBottom: 20,
                        }}
                      />

                      <div
                        style={{
                          border: "1.5px solid #fde68a",
                          borderRadius: 12,
                          padding: "18px 20px",
                          marginBottom: 20,
                          background: darkMode ? "rgba(251,191,36,.05)" : "#fffbeb",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "linear-gradient(135deg,#b45309,#f59e0b)",
                            borderRadius: 5,
                            padding: "3px 10px",
                            fontSize: 9,
                            fontWeight: 800,
                            color: "#fff",
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            marginBottom: 12,
                          }}
                        >
                          ★ Pro Plan
                        </div>

                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
                          <span
                            style={{
                              fontFamily: '"JetBrains Mono",monospace',
                              fontSize: 32,
                              fontWeight: 900,
                              color: "var(--text-1)",
                              letterSpacing: "-.03em",
                              lineHeight: 1,
                            }}
                          >
                            $6.99
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-4)" }}>/ month</span>
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              background: "#f0fdf4",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                              borderRadius: 4,
                              padding: "2px 8px",
                            }}
                          >
                            one-time payment
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 18 }}>
                          {[
                            { free: "1 topic", pro: "All 23 GRE Quant chapters" },
                            { free: "1 mock test", pro: "Unlimited mock tests" },
                            { free: "Limited reattempt", pro: "Unlimited re-attempts" },
                          ].map((row, i, arr) => (
                            <div
                              key={i}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 8,
                                padding: "7px 0",
                                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                              }}
                            >
                              <div style={{ fontSize: 11.5, color: "var(--text-4)", display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ color: "var(--err)", fontSize: 10 }}>✗</span>
                                {row.free}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--ok)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 10 }}>✓</span>
                                {row.pro}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          className="sm-upgrade-btn"
                          onClick={() => { window.location.href = checkoutUrl; }}
                          style={{
                            width: "100%",
                            padding: "13px 0",
                            fontSize: 14,
                            fontWeight: 700,
                            background: "linear-gradient(135deg,#b45309 0%,#f59e0b 50%,#b45309 100%)",
                            backgroundSize: "200% auto",
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            cursor: "pointer",
                            letterSpacing: ".01em",
                            boxShadow: "0 2px 12px rgba(180,83,9,.28)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          <span>★</span>
                          <span>Upgrade to Pro — $6.99</span>
                          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>→</span>
                        </button>
                      </div>

                      <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", lineHeight: 1.6 }}>
                        Secure checkout via Dodo Payments.
                        <br />
                        Questions?{" "}
                        <a href="mailto:manhattandrill@gmail.com" style={{ color: "var(--text-3)" }}>
                          manhattandrill@gmail.com
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── HELP ── */}
              {tab === "help" && (
                <div>
                  <FieldLabel>Contact & Community</FieldLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
                    <LinkRow
                      icon="T"
                      title="Telegram Message"
                      sub="Chat with us"
                      href="https://t.me/kelvinint"
                      cta="Join"
                    />
                    <LinkRow
                      icon="✉"
                      title="Contact us"
                      sub="manhattandrill@gmail.com"
                      href="mailto:manhattandrill@gmail.com"
                      cta="Write"
                    />
                    <div
                      onClick={() => setFeedbackOpen(true)}
                      className="sm-link-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        cursor: "pointer",
                        transition: "background .1s",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"JetBrains Mono",monospace',
                          fontSize: 15,
                          color: "var(--text-3)",
                          width: 20,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        ^
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>
                          Suggest a Feature
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-4)" }}>
                          Help us improve the product
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: '"JetBrains Mono",monospace',
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-4)",
                          flexShrink: 0,
                        }}
                      >
                        Open {"->"}
                      </div>
                    </div>
                  </div>
                  <Divider />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-4)",
                      textAlign: "center",
                      lineHeight: 1.7,
                      marginTop: 20,
                    }}
                  >
                    GRE Quant Practice · Built for serious test-takers
                    <br />
                    Questions From Manhattan Prep 5 lb. Book
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        darkMode={darkMode}
        user={user}
      />
      <BillingModal
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        darkMode={darkMode}
        user={user}
      />
    </>
  );
}

function FieldLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-4)",
        letterSpacing: ".1em",
        textTransform: "uppercase",
        marginBottom: 8,
        fontFamily: '"JetBrains Mono",monospace',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
}

function LinkRow({
  icon,
  title,
  sub,
  href,
  cta,
}: {
  icon: string;
  title: string;
  sub: string;
  href: string;
  cta: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div
        className="sm-link-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "11px 14px",
          border: "1px solid var(--border)",
          borderRadius: 9,
          cursor: "pointer",
          transition: "background .1s",
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono",monospace',
            fontSize: 15,
            color: "var(--text-3)",
            width: 20,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1, wordBreak: "break-all" }}>{sub}</div>
        </div>
        <div
          style={{
            fontFamily: '"JetBrains Mono",monospace',
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-4)",
            flexShrink: 0,
          }}
        >
          {cta} →
        </div>
      </div>
    </a>
  );
}