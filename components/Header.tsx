"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";

interface HeaderProps {
  account: string;
  balance: string;
  chainOk: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ account, balance, chainOk, connecting, onConnect, onDisconnect }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Short forms of the active address — one for the pill, one for the panel.
  const pillAddr = account ? `${account.slice(0, 5)}…${account.slice(-4)}` : "";
  const fullAddr = account ? `${account.slice(0, 13)}…${account.slice(-6)}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const toggleMenu = () => setOpen((prev) => !prev);
  const closeMenu = () => setOpen(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--paper)",
        borderBottom: "2px solid var(--ink)",
        boxShadow: "0 3px 0 0 rgba(27,25,22,0.12)",
      }}
    >
      {/* hazard-tape strip across the very top — site signage */}
      <div className="hazard hazard--thin" aria-hidden="true" />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Logo size={30} />
          <span className="display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.02em" }}>Foreman</span>
          <span className="label hdr-nav" style={{ fontSize: 9, marginLeft: 4, paddingLeft: 11, borderLeft: "1.5px solid var(--ink)", color: "var(--acc-deep)" }}>SITE&nbsp;OFFICE</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 26 }} className="hdr-nav">
          <a href="#board" className="head" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 15, letterSpacing: "0.04em" }}>Site&nbsp;log</a>
          <a href="#log" className="head" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 15, letterSpacing: "0.04em" }}>Log&nbsp;a&nbsp;job</a>
          <a href="#foreman" className="head" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 15, letterSpacing: "0.04em" }}>The&nbsp;Foreman</a>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          {account ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={toggleMenu}
                className="btn btn--ghost btn--sm"
                style={{ paddingLeft: 13 }}
              >
                <span className="dot" style={{ background: chainOk ? "var(--stamp)" : "var(--coral)" }} />
                <span className="num" style={{ fontVariantNumeric: "tabular-nums", textTransform: "none", letterSpacing: 0 }}>{pillAddr}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", opacity: 0.7 }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <>
                  <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                  <div className="panel" style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, zIndex: 61, minWidth: 250, overflow: "hidden" }}>
                    <div className="docket-strip">
                      <span className="label">Your toolbox</span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div className="num" style={{ fontSize: 14 }}>{fullAddr}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{balance || "0"} USDC on hand</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1.5px solid var(--hairline)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Site</span>
                      {chainOk ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                          <span className="dot" style={{ background: "var(--stamp)" }} /> ARC Testnet
                        </span>
                      ) : (
                        <button onClick={() => switchToArc().catch(() => {})} style={{ background: "none", border: "none", color: "var(--coral)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                          Wrong site — switch ↗
                        </button>
                      )}
                    </div>
                    <button className="docket-line" onClick={handleCopy}>{copied ? "Copied ✓" : "Copy address"}</button>
                    <a className="docket-line" href={`${ARCSCAN}/address/${account}`} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>View on ArcScan ↗</a>
                    <button className="docket-line danger" onClick={() => { closeMenu(); onDisconnect(); }}>Clock off (disconnect)</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="btn btn--lime btn--sm"
            >
              {connecting ? "Clocking in…" : "Clock in"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
