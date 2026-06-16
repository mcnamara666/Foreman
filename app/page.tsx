"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import { useWallet } from "@/lib/useWallet";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";
import { pickProvider } from "@/lib/wallet";
import {
  CONTRACT_ADDRESS,
  FOREMAN_ABI,
  hasContract,
  readContract,
  fetchStats,
  fetchLatest,
  fetchJobsOf,
  fetchEarned,
  fmtUsdc,
  shortAddr,
  looksLikeUrl,
  EMPTY_STATS,
  type Job,
  type Stats,
} from "@/lib/foreman";

interface Agent {
  configured: boolean;
  address?: string;
  balance?: string;
  bounty?: string;
}

const ENDORSE = ethers.parseEther("0.1");

export default function Home() {
  const { account, balance, chainOk, connecting, connect, disconnect, refreshBalance } = useWallet();

  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [earned, setEarned] = useState<bigint>(0n);
  const [tab, setTab] = useState<"all" | "mine">("all");

  const [agent, setAgent] = useState<Agent>({ configured: false });
  const [agentMsg, setAgentMsg] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);

  // log form
  const [beforeUri, setBeforeUri] = useState("");
  const [afterUri, setAfterUri] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("");
  const [location, setLocation] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [logMsg, setLogMsg] = useState("");
  const [upBefore, setUpBefore] = useState(false);
  const [upAfter, setUpAfter] = useState(false);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const loadEpoch = useRef(0);
  const accountRef = useRef(account);
  const inFlight = useRef(false);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const load = useCallback(async () => {
    if (!hasContract()) return;
    const epoch = ++loadEpoch.current;
    try {
      const c = readContract();
      const [s, latest] = await Promise.all([fetchStats(c), fetchLatest(c)]);
      if (epoch !== loadEpoch.current) return;
      setStats(s);
      setJobs(latest);
      if (account) {
        const [mn, ea] = await Promise.all([fetchJobsOf(account, c), fetchEarned(account, c)]);
        if (epoch !== loadEpoch.current) return;
        setMine(mn);
        setEarned(ea);
      } else {
        setMine([]);
        setEarned(0n);
      }
    } catch {
      /* keep last good state */
    }
  }, [account]);

  const loadAgent = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/info");
      const j = (await r.json()) as Agent;
      setAgent(j);
    } catch {
      setAgent({ configured: false });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  async function writeContract() {
    const inj = pickProvider();
    if (!inj) throw new Error("No wallet found");
    await switchToArc(inj);
    const provider = new ethers.BrowserProvider(inj);
    const signer = await provider.getSigner(account);
    return new ethers.Contract(CONTRACT_ADDRESS, FOREMAN_ABI, signer);
  }

  function reason(e: unknown): string {
    const err = e as { code?: string | number; reason?: string; shortMessage?: string; message?: string };
    if (err?.code === "ACTION_REJECTED" || err?.code === 4001) return "Cancelled";
    return (err?.reason || err?.shortMessage || err?.message || "Failed").slice(0, 80);
  }

  async function run(key: string, setMsg: (t: string) => void, fn: (c: ethers.Contract) => Promise<ethers.ContractTransactionResponse>, done: string): Promise<boolean> {
    if (!account) {
      if (!pickProvider()) { setMsg("✗ No wallet — install Rabby or MetaMask"); return false; }
      connect();
      return false;
    }
    if (inFlight.current) return false;
    inFlight.current = true;
    const captured = account;
    setActiveKey(key);
    setMsg("Confirm in your wallet…");
    let ok = false;
    try {
      const c = await writeContract();
      const tx = await fn(c);
      setMsg("Settling on ARC…");
      await tx.wait();
      if (accountRef.current !== captured) return false;
      setMsg(done);
      await load();
      await refreshBalance(captured);
      ok = true;
    } catch (e) {
      setMsg("✗ " + reason(e));
    } finally {
      inFlight.current = false;
      setActiveKey(null);
    }
    return ok;
  }

  function flash(key: string, text: string, hold = false) {
    setNote((n) => ({ ...n, [key]: text }));
    if (!hold) setTimeout(() => setNote((n) => { const m = { ...n }; delete m[key]; return m; }), 3500);
  }

  // ── actions ──
  async function logWork() {
    if (!looksLikeUrl(beforeUri) || beforeUri.length > 400) return setLogMsg("✗ Add a 'before' photo");
    if (!looksLikeUrl(afterUri) || afterUri.length > 400) return setLogMsg("✗ Add an 'after' photo");
    if (!title.trim() || title.length > 120) return setLogMsg("✗ Give the job a title");
    if (kind.length > 40) return setLogMsg("✗ Trade name too long");
    if (location.length > 80) return setLogMsg("✗ Location too long");
    const ok = await run("log", setLogMsg, (c) => c.logJob(beforeUri.trim(), afterUri.trim(), title.trim(), kind.trim(), location.trim(), isPrivate), "✓ Logged — waking the Foreman…");
    if (ok) {
      setBeforeUri(""); setAfterUri(""); setTitle(""); setKind(""); setLocation(""); setIsPrivate(false);
      wakeForeman();
    }
  }

  function endorse(id: number) {
    run("e" + id, (t) => flash("e" + id, t, t.startsWith("Confirm") || t.startsWith("Settling")), (c) => c.endorse(id, { value: ENDORSE }), "✓ Endorsed — paid the builder");
  }

  async function wakeForeman() {
    if (agentBusy) return;
    setAgentBusy(true);
    setAgentMsg("The Foreman is reviewing the board…");
    try {
      const r = await fetch("/api/agent/run", { method: "POST" });
      const j = (await r.json()) as { signed?: number[]; balance?: string; bounty?: string; needsFunds?: boolean; error?: string; message?: string; failures?: { id: number }[] };
      if (j.needsFunds) setAgentMsg("⛽ The Foreman is out of USDC — top up its wallet to pay bounties.");
      else if (j.error) setAgentMsg("✗ " + j.error);
      else if (j.signed && j.signed.length) setAgentMsg(`✓ Signed off ${j.signed.map((n) => "#" + n).join(", ")} — paid ${j.signed.length} bount${j.signed.length > 1 ? "ies" : "y"} in USDC`);
      else if (j.message) setAgentMsg(j.message);
      else if (j.failures && j.failures.length) setAgentMsg("✗ A job couldn't be signed off — check the logs.");
      else setAgentMsg("Nothing to sign off right now — the board is clear.");
      await Promise.all([loadAgent(), load()]);
    } catch {
      setAgentMsg("✗ Couldn't reach the Foreman");
    } finally {
      setAgentBusy(false);
    }
  }

  async function onPick(which: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setLogMsg("✗ Choose an image file");
    if (f.size > 4 * 1024 * 1024) return setLogMsg("✗ Image too large — max 4 MB");
    const setUp = which === "before" ? setUpBefore : setUpAfter;
    const setUri = which === "before" ? setBeforeUri : setAfterUri;
    setUp(true);
    setLogMsg(`Uploading ${which} photo…`);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error || "failed");
      setUri(j.url);
      setLogMsg(`✓ ${which === "before" ? "Before" : "After"} photo ready`);
    } catch {
      setLogMsg("✗ Upload failed — paste a URL instead");
    } finally {
      setUp(false);
    }
  }

  const wrap: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "0 24px" };
  const publicJobs = jobs.filter((j) => !j.isPrivate || (account && j.builder.toLowerCase() === account.toLowerCase()));
  const list = tab === "all" ? publicJobs : mine;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80 }}>
      <Header account={account} balance={balance} chainOk={chainOk} connecting={connecting} onConnect={connect} onDisconnect={disconnect} />

      {!hasContract() && (
        <div style={{ ...wrap, marginTop: 16 }}>
          <div className="panel" style={{ padding: "12px 18px", color: "var(--coral)", fontSize: 13.5 }}>
            Contract not wired in yet — deploy it from <a href="/deploy" style={{ color: "var(--lime)", fontWeight: 700 }}>/deploy</a> and the crew clocks in.
          </div>
        </div>
      )}

      {/* hero */}
      <section style={{ ...wrap, paddingTop: "clamp(28px, 4vw, 48px)" }}>
        <div className="grid-main rise">
          <div className="blob blob--hero" style={{ padding: "clamp(28px, 4vw, 46px)" }}>
            <span className="chip chip--ink" style={{ marginBottom: 20 }}>
              <span className="dot live" style={{ background: "var(--ink)" }} /> Agentic payments · ARC Testnet
            </span>
            <h1 className="display" style={{ fontSize: "clamp(40px, 6vw, 76px)", color: "var(--ink)" }}>
              Your work,<br />signed off<br />and paid.
            </h1>
            <p style={{ fontSize: 17.5, color: "rgba(12,44,32,0.78)", maxWidth: 440, lineHeight: 1.5, marginTop: 22, fontWeight: 500 }}>
              Log a finished job with before/after photos. An autonomous Foreman on Arc reviews it, signs it
              off, and pays you a USDC bounty — no human, no invoice, no waiting.
            </p>
            <div style={{ display: "flex", gap: 11, marginTop: 28, flexWrap: "wrap" }}>
              <a href="#log" className="btn btn--ink btn--lg">Log a job</a>
              <a href="#foreman" className="btn btn--lg" style={{ borderColor: "rgba(12,44,32,0.28)", color: "var(--ink)" }}>Meet the Foreman</a>
            </div>
          </div>

          {/* the Foreman live card */}
          <div id="foreman" className="panel" style={{ padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
              <div className="float" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><rect x="7" y="11" width="18" height="13" rx="3" stroke="var(--ink)" strokeWidth="2.2" /><circle cx="12" cy="17.5" r="1.6" fill="var(--ink)" /><circle cx="20" cy="17.5" r="1.6" fill="var(--ink)" /><path d="M16 11V7M11 7h10" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="head" style={{ fontSize: 19 }}>The Foreman</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="dot live" style={{ background: "var(--lime)" }} /> autonomous agent · its own wallet on Arc
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Mini k="In its wallet" v={`$${agent.balance ? fmtUsdc(ethers.parseEther(Number(agent.balance).toFixed(6))) : "—"}`} />
              <Mini k="Bounty / job" v={`$${agent.bounty || "0.05"}`} />
              <Mini k="Jobs signed off" v={String(stats.verified)} />
              <Mini k="Paid to builders" v={`$${fmtUsdc(stats.bounties)}`} />
            </div>

            {agent.configured && agent.address && (
              <a href={`${ARCSCAN}/address/${agent.address}`} target="_blank" rel="noopener noreferrer" className="num" style={{ display: "block", fontSize: 12, color: "var(--muted)", textDecoration: "none", marginBottom: 14 }}>
                {shortAddr(agent.address, 10, 8)} ↗
              </a>
            )}

            <button onClick={wakeForeman} disabled={agentBusy} className="btn btn--lime btn--block">
              {agentBusy ? <><span className="spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--ink)", borderTopColor: "transparent", borderRadius: 99 }} /> Working…</> : "Wake the Foreman"}
            </button>
            {agentMsg && (
              <div className="num" style={{ marginTop: 12, fontSize: 12.5, color: agentMsg.startsWith("✓") ? "var(--lime)" : agentMsg.startsWith("✗") || agentMsg.startsWith("⛽") ? "var(--coral)" : "var(--muted)" }}>{agentMsg}</div>
            )}
            {agent.configured === false && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>Agent key not set yet — it goes live once configured.</div>
            )}
          </div>
        </div>
      </section>

      {/* log work — photo-forward, right under the hero */}
      <section id="log" style={{ ...wrap, marginTop: 26 }}>
        <div className="panel" style={{ padding: "clamp(22px, 3vw, 32px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            <h2 className="display" style={{ fontSize: "clamp(26px, 3.4vw, 38px)" }}>Log a job</h2>
            {account && <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>You&apos;ve earned ${fmtUsdc(earned)} so far</span>}
          </div>

          {!account ? (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 16 }}>Connect your wallet to log your finished work.</p>
              <button onClick={connect} className="btn btn--lime">Connect wallet</button>
            </div>
          ) : (
            <>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <PhotoTile label="Before" uri={beforeUri} setUri={setBeforeUri} uploading={upBefore} inputRef={beforeRef} onPick={(e) => onPick("before", e)} />
                <PhotoTile label="After" uri={afterUri} setUri={setAfterUri} uploading={upAfter} inputRef={afterRef} onPick={(e) => onPick("after", e)} />
              </div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <Field label="What did you do?">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="input" placeholder="Re-tiled the bathroom" />
                </Field>
                <Field label="Trade">
                  <input value={kind} onChange={(e) => setKind(e.target.value)} maxLength={40} className="input" placeholder="Tiling" />
                </Field>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <Field label="Location (optional)">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} className="input" placeholder="Paris 11e" />
                </Field>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="button" onClick={() => setIsPrivate((p) => !p)} className="btn btn--ghost" style={{ height: 49 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid currentColor", background: isPrivate ? "var(--lime)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", fontSize: 11 }}>{isPrivate ? "✓" : ""}</span>
                    Keep private (unlisted)
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button onClick={logWork} disabled={activeKey === "log"} className="btn btn--lime btn--lg">{activeKey === "log" ? "Logging…" : "Log it on-chain"}</button>
                {logMsg && <span className="num" style={{ fontSize: 13, color: logMsg.startsWith("✓") ? "var(--lime)" : logMsg.startsWith("✗") ? "var(--coral)" : "var(--muted)" }}>{logMsg}</span>}
              </div>
            </>
          )}
        </div>
      </section>

      {/* stats */}
      <section style={{ ...wrap, marginTop: 30 }}>
        <div className="grid-stats">
          {[
            { k: "Jobs logged", v: String(stats.jobs) },
            { k: "Signed off", v: String(stats.verified) },
            { k: "Bounties paid", v: "$" + fmtUsdc(stats.bounties) },
            { k: "Endorsed", v: "$" + fmtUsdc(stats.endorsed) },
          ].map((s) => (
            <div key={s.k} className="panel" style={{ padding: "18px 20px", minWidth: 0 }}>
              <div className="num" style={{ fontSize: "clamp(22px, 4.5vw, 30px)", overflowWrap: "anywhere" }}>{s.v}</div>
              <div className="label" style={{ marginTop: 6 }}>{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* board */}
      <section id="board" style={{ ...wrap, marginTop: 44 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: "clamp(28px, 3.6vw, 42px)" }}>The board</h2>
          <div className="seg">
            <button data-on={tab === "all"} onClick={() => setTab("all")}>All jobs {publicJobs.length || ""}</button>
            <button data-on={tab === "mine"} onClick={() => setTab("mine")}>Yours {account ? (mine.length || "") : ""}</button>
          </div>
        </div>

        {tab === "mine" && !account ? (
          <Empty>Connect your wallet to see your jobs.</Empty>
        ) : list.length === 0 ? (
          <Empty>{tab === "all" ? "No jobs on the board yet — log the first one ↑" : "You haven't logged a job yet."}</Empty>
        ) : (
          <div className="grid-jobs">
            {list.map((j) => (
              <JobCard key={j.id} job={j} me={account} busy={activeKey === "e" + j.id} msg={note["e" + j.id]} onEndorse={endorse} />
            ))}
          </div>
        )}
      </section>

      {/* why arc — bento */}
      <section style={{ ...wrap, marginTop: "clamp(56px, 7vw, 88px)" }}>
        <h2 className="display" style={{ fontSize: "clamp(26px, 3.8vw, 44px)", maxWidth: 760, marginBottom: 26 }}>
          Why a machine<br />can pay you here
        </h2>
        <div className="bento">
          <div className="b-hero blob" style={{ padding: "clamp(24px, 3vw, 34px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 22, color: "var(--ink)" }}>
            <div className="num" style={{ fontSize: "clamp(40px, 6.5vw, 70px)", lineHeight: 1 }}>
              ≈ $0.001
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, opacity: 0.7, letterSpacing: "0.04em", marginTop: 8 }}>PER TRANSACTION, IN USDC</span>
            </div>
            <div>
              <div className="head" style={{ fontSize: 23, marginBottom: 8 }}>USDC is the gas</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "rgba(12,44,32,0.82)", maxWidth: 380 }}>
                Fees are plain dollars on Arc — so an agent can hold its own wallet, pay sub-cent bounties and
                never juggle a separate gas token.
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 22, color: "var(--ink)" }}>
            <div className="head" style={{ fontSize: 18, marginBottom: 7 }}>Paid the instant it&apos;s done</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#5a6b60" }}>Sub-second finality — the bounty lands before you&apos;ve packed the drill away.</div>
          </div>

          <div className="card" style={{ padding: 22, color: "var(--ink)" }}>
            <div className="head" style={{ fontSize: 18, marginBottom: 7 }}>The agent acts alone</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#5a6b60" }}>It holds its own keys and decides on its own — the next payer is software, not a person.</div>
          </div>

          <div className="b-wide panel" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(202,249,79,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="var(--lime)" strokeWidth="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="var(--lime)" strokeWidth="2" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="head" style={{ fontSize: 18, marginBottom: 4 }}>Yours to keep private</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)" }}>Mark a job unlisted — a nod to Arc&apos;s opt-in privacy. Your proof of work, shown on your terms.</div>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer style={{ ...wrap, marginTop: "clamp(48px, 6vw, 72px)" }}>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <span className="display" style={{ fontSize: 22 }}>Foreman</span>
          {hasContract() && (
            <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="num" style={{ fontSize: 12.5, color: "var(--muted)", textDecoration: "none" }}>
              Contract {shortAddr(CONTRACT_ADDRESS, 8, 6)} ↗
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: "var(--green-deep)", borderRadius: 14, padding: "12px 14px", minWidth: 0 }}>
      <div className="num" style={{ fontSize: 19, overflowWrap: "anywhere" }}>{v}</div>
      <div className="label" style={{ marginTop: 4, fontSize: 9.5 }}>{k}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 50, textAlign: "center" }}>
      <span style={{ color: "var(--muted)", fontSize: 15 }}>{children}</span>
    </div>
  );
}

function PhotoTile({
  label,
  uri,
  setUri,
  uploading,
  inputRef,
  onPick,
}: {
  label: string;
  uri: string;
  setUri: (s: string) => void;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const has = looksLikeUrl(uri);
  return (
    <div>
      <button type="button" onClick={() => inputRef.current?.click()} className="tile" aria-label={`Upload ${label} photo`}>
        {has ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={uri} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")} />
        ) : (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, color: "var(--muted)", pointerEvents: "none" }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(202,249,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lime)", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{uploading ? "Uploading…" : `Add ${label.toLowerCase()} photo`}</span>
          </span>
        )}
        <span style={{ position: "absolute", top: 10, left: 10, padding: "3px 10px", borderRadius: 999, background: has ? "rgba(12,44,32,0.66)" : "transparent", color: "var(--cream)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em" }}>{label.toUpperCase()}</span>
        {has && <span style={{ position: "absolute", bottom: 10, right: 10, padding: "4px 11px", borderRadius: 999, background: "rgba(12,44,32,0.7)", color: "var(--cream)", fontSize: 11, fontWeight: 600 }}>Change</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
      <input value={uri} onChange={(e) => setUri(e.target.value)} maxLength={400} className="input" placeholder="…or paste an image URL" style={{ marginTop: 9, fontSize: 13, padding: "10px 13px" }} />
    </div>
  );
}
