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
        background: "rgba(7, 9, 12, 0.62)",
        backdropFilter: "blur(18px) saturate(130%)",
        WebkitBackdropFilter: "blur(18px) saturate(130%)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "13px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Logo size={28} />
          <span className="display" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>Foreman</span>
          <span className="label hdr-nav" style={{ fontSize: 9, marginLeft: 4, paddingLeft: 11, borderLeft: "1px solid var(--hairline)" }}>SYSTEM&nbsp;OPS</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="hdr-nav">
          <a href="#board" className="num" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 12.5, letterSpacing: "0.02em" }}>JOB_LOG</a>
          <a href="#log" className="num" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 12.5, letterSpacing: "0.02em" }}>NEW_JOB</a>
          <a href="#foreman" className="num" style={{ textDecoration: "none", color: "var(--text-soft)", fontSize: 12.5, letterSpacing: "0.02em" }}>AGENT_NODE</a>
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
                <span className="dot" style={{ background: chainOk ? "var(--lime)" : "var(--coral)" }} />
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{pillAddr}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", opacity: 0.7 }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <>
                  <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                  <div className="panel" style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, zIndex: 61, minWidth: 248, overflow: "hidden", borderRadius: 18, boxShadow: "0 22px 50px -16px rgba(0,0,0,0.6)" }}>
                    <div style={{ padding: "15px 16px" }}>
                      <div className="label" style={{ marginBottom: 6 }}>Wallet</div>
                      <div className="num" style={{ fontSize: 14 }}>{fullAddr}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{balance || "0"} USDC</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Network</span>
                      {chainOk ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                          <span className="dot" style={{ background: "var(--lime)" }} /> ARC Testnet
                        </span>
                      ) : (
                        <button onClick={() => switchToArc().catch(() => {})} style={{ background: "none", border: "none", color: "var(--coral)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                          Wrong — switch ↗
                        </button>
                      )}
                    </div>
                    <button className="menu-item" onClick={handleCopy}>{copied ? "Copied ✓" : "Copy address"}</button>
                    <a className="menu-item" href={`${ARCSCAN}/address/${account}`} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>View on ArcScan ↗</a>
                    <button className="menu-item danger" onClick={() => { closeMenu(); onDisconnect(); }}>Disconnect</button>
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
              {connecting ? "Linking up…" : "Link wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
