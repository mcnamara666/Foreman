"use client";

import { useState } from "react";

/** Drag the handle to wipe between the before and after photo. */
export default function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);

  return (
    <div className="photo" style={{ aspectRatio: "4 / 3" }}>
      {/* base = after */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="after" loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")} />
      {/* overlay = before, clipped to the left `pos`% */}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="before" loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <span className="label" style={{ position: "absolute", bottom: 9, left: 9, padding: "3px 8px", borderRadius: 2, background: "var(--ink)", color: "var(--paper)", fontSize: 9 }}>BEFORE</span>
      <span className="label" style={{ position: "absolute", bottom: 9, right: 9, padding: "3px 8px", borderRadius: 2, background: "var(--acc)", color: "var(--ink)", fontSize: 9 }}>AFTER</span>

      {/* handle — chalk-line divider with a grab knob */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, background: "var(--ink)", transform: "translateX(-50%)", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28, borderRadius: 2, background: "var(--acc)", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", fontSize: 12, fontWeight: 700, boxShadow: "2px 2px 0 0 rgba(27,25,22,0.4)" }}>⇆</div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(+e.target.value)}
        aria-label="Wipe before / after"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "ew-resize", touchAction: "pan-y" }}
      />
    </div>
  );
}
