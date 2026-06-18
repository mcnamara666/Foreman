"use client";

import BeforeAfter from "./BeforeAfter";
import { Job, fmtUsdc, shortAddr, timeAgo } from "@/lib/foreman";
import { ARCSCAN } from "@/lib/arcNetwork";

export default function JobCard({
  job,
  me,
  busy,
  msg,
  onEndorse,
}: {
  job: Job;
  me: string;
  busy: boolean;
  msg?: string;
  onEndorse: (id: number) => void;
}) {
  const mine = me && job.builder.toLowerCase() === me.toLowerCase();

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      {/* docket no. + status strip */}
      <div className="docket-strip">
        <span className="label">
          Docket&nbsp;no.&nbsp;{String(job.id).padStart(3, "0")}
        </span>
        {job.verified ? (
          <span className="chip chip--lime" style={{ borderColor: "var(--acc-soft)", color: "var(--acc-soft)", background: "transparent" }}>
            <span className="dot" style={{ background: "var(--acc)" }} />SIGNED OFF
          </span>
        ) : (
          <span className="chip chip--ink" style={{ borderColor: "rgba(246,242,232,0.4)", color: "rgba(246,242,232,0.8)", background: "transparent" }}>
            <span className="dot" style={{ background: "var(--warn)" }} />ON THE BOARD
          </span>
        )}
      </div>

      <div style={{ padding: "10px 10px 0", position: "relative" }}>
        <BeforeAfter before={job.beforeUri} after={job.afterUri} />
        {/* PAID rubber stamp thumps onto a signed-off job */}
        {job.verified && (
          <div className="stamp stamp-in" style={{ position: "absolute", top: 18, right: 20, zIndex: 2 }}>
            PAID
            <span className="stamp-sub">${fmtUsdc(job.bounty)} USDC</span>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {job.kind && <span className="chip chip--ink">{job.kind}</span>}
          {job.verified ? (
            <span className="chip chip--lime">Bounty · ${fmtUsdc(job.bounty)}</span>
          ) : (
            <span className="chip chip--ink" style={{ opacity: 0.8 }}>Awaiting sign-off</span>
          )}
          {job.isPrivate && <span className="chip chip--ink">Private</span>}
        </div>

        <div style={{ flex: 1 }}>
          <div className="head" style={{ fontSize: 21, color: "var(--ink)", lineHeight: 1.05 }}>{job.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
            <a href={`${ARCSCAN}/address/${job.builder}`} target="_blank" rel="noopener noreferrer" className="num" style={{ color: "var(--text-soft)", textDecoration: "none", fontSize: 11.5 }}>
              {mine ? "your work" : shortAddr(job.builder)}
            </a>
            {job.location && <span>· {job.location}</span>}
            <span>· {timeAgo(job.loggedAt)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1.5px dashed var(--rule)", paddingTop: 12 }}>
          <span className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {job.endorsements > 0 ? `★ ${job.endorsements} mate${job.endorsements > 1 ? "s" : ""} · $${fmtUsdc(job.endorsedTotal)}` : "No tips yet"}
          </span>
          {mine ? (
            <span className="chip chip--ink">Your job</span>
          ) : (
            <button onClick={() => onEndorse(job.id)} disabled={busy} className="btn btn--ink btn--sm">
              {busy ? "…" : "Tip the builder · $0.10"}
            </button>
          )}
        </div>
        {msg && (
          <div className="num" style={{ fontSize: 11.5, color: msg.startsWith("✓") ? "var(--stamp)" : msg.startsWith("✗") ? "var(--coral)" : "var(--muted)" }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
