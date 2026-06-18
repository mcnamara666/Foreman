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
      {/* job id + status header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px 10px" }}>
        <span className="num" style={{ fontSize: 11.5, color: "var(--muted)", letterSpacing: "0.02em" }}>
          JOB_ID&nbsp;·&nbsp;#{String(job.id).padStart(3, "0")}
        </span>
        {job.verified ? (
          <span className="chip chip--lime"><span className="dot live" style={{ background: "var(--acc)" }} />COMPLETED</span>
        ) : (
          <span className="chip chip--ink"><span className="dot" style={{ background: "var(--warn)" }} />PENDING</span>
        )}
      </div>

      <div style={{ padding: "0 10px" }}>
        <BeforeAfter before={job.beforeUri} after={job.afterUri} />
      </div>

      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {job.kind && <span className="chip chip--ink">{job.kind}</span>}
          {job.verified ? (
            <span className="chip chip--lime">SIGNED-OFF · ${fmtUsdc(job.bounty)}</span>
          ) : (
            <span className="chip chip--ink" style={{ opacity: 0.8 }}>AWAITING FOREMAN</span>
          )}
          {job.isPrivate && <span className="chip chip--ink">PRIVATE</span>}
        </div>

        <div style={{ flex: 1 }}>
          <div className="head" style={{ fontSize: 17, color: "var(--text)", lineHeight: 1.2 }}>{job.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
            <a href={`${ARCSCAN}/address/${job.builder}`} target="_blank" rel="noopener noreferrer" className="num" style={{ color: "var(--text-soft)", textDecoration: "none", fontSize: 11.5 }}>
              {mine ? "BY_YOU" : shortAddr(job.builder)}
            </a>
            {job.location && <span>· {job.location}</span>}
            <span>· {timeAgo(job.loggedAt)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
          <span className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {job.endorsements > 0 ? `★ ${job.endorsements} · $${fmtUsdc(job.endorsedTotal)}` : "NO ENDORSEMENTS"}
          </span>
          {mine ? (
            <span className="chip chip--ink">YOUR JOB</span>
          ) : (
            <button onClick={() => onEndorse(job.id)} disabled={busy} className="btn btn--ink btn--sm">
              {busy ? "…" : "Endorse · $0.10"}
            </button>
          )}
        </div>
        {msg && (
          <div className="num" style={{ fontSize: 11.5, color: msg.startsWith("✓") ? "var(--acc)" : msg.startsWith("✗") ? "var(--coral)" : "var(--muted)" }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
