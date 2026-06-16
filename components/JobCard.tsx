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
      <div style={{ padding: 10 }}>
        <BeforeAfter before={job.beforeUri} after={job.afterUri} />
      </div>

      <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {job.kind && <span className="chip chip--ink" style={{ fontSize: 11 }}>{job.kind}</span>}
          {job.verified ? (
            <span className="chip chip--lime" style={{ fontSize: 11 }}>✓ Signed off · ${fmtUsdc(job.bounty)}</span>
          ) : (
            <span className="chip chip--ink" style={{ fontSize: 11, opacity: 0.7 }}>Awaiting the Foreman…</span>
          )}
          {job.isPrivate && <span className="chip chip--ink" style={{ fontSize: 11 }}>Private</span>}
        </div>

        <div style={{ flex: 1 }}>
          <div className="head" style={{ fontSize: 18, color: "var(--ink)", lineHeight: 1.15 }}>{job.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 12.5, color: "#5a6b60", flexWrap: "wrap" }}>
            <a href={`${ARCSCAN}/address/${job.builder}`} target="_blank" rel="noopener noreferrer" style={{ color: "#5a6b60", textDecoration: "none", fontWeight: 600 }}>
              {mine ? "by you" : shortAddr(job.builder)}
            </a>
            {job.location && <span>· {job.location}</span>}
            <span>· {timeAgo(job.loggedAt)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--line-cream)", paddingTop: 11 }}>
          <span style={{ fontSize: 12.5, color: "#5a6b60", fontWeight: 600 }}>
            {job.endorsements > 0 ? `★ ${job.endorsements} · $${fmtUsdc(job.endorsedTotal)}` : "No endorsements yet"}
          </span>
          {mine ? (
            <span className="chip chip--ink" style={{ fontSize: 11 }}>Your job</span>
          ) : (
            <button onClick={() => onEndorse(job.id)} disabled={busy} className="btn btn--ink btn--sm">
              {busy ? "…" : "Endorse · $0.10"}
            </button>
          )}
        </div>
        {msg && (
          <div className="num" style={{ fontSize: 12, color: msg.startsWith("✓") ? "#2f7a2f" : msg.startsWith("✗") ? "#c0392b" : "#5a6b60" }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
