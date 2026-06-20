"use client";
// Today.tsx — home screen. The hero "On schedule" bubble now carries the
// destination, the arrival ETA, and the leave-by/layover stats in one elevated
// card. Responsive: single column on mobile, 2-column-aware grid on desktop.

import React from "react";
import { Sym, StatusDot, Card, SectionLabel, type Theme } from "../ui";
import { fmtTime, fmtDate, fmtDur } from "@/lib/schedule";
import type { Schedule, Trip, Tab, Tz } from "@/lib/types";

function Ribbon({ s, t, trip }: { s: Schedule; t: Theme; trip: Trip }) {
  const last = s.flights[s.flights.length - 1];
  const nodes: { label: string; utc: number; tz: Tz }[] = [
    { label: "Leave", utc: s.leaveByUtc, tz: trip.origin.tz },
    { label: `Dep ${trip.flights[0].fromCode}`, utc: s.flights[0].actualDepartUtc, tz: trip.flights[0].fromTz },
    ...s.connections.map((c) => ({ label: c.airportCode, utc: c.arriveUtc, tz: c.tz })),
    { label: `Land ${trip.destination.code}`, utc: last.actualArriveUtc, tz: last.toTz },
    { label: "Arrive", utc: s.arriveUtc, tz: trip.destination.tz },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, padding: "2px 2px 0" }}>
      {nodes.map((n, i) => (
        <div key={n.label} style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {i < nodes.length - 1 && <div style={{ position: "absolute", top: 5, left: "50%", right: "-50%", height: 2, background: t.line }} />}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: i === 0 ? t.accent : t.surface2, border: `2px solid ${i === 0 ? t.accent : t.line}`, boxShadow: i === 0 ? `0 0 0 4px ${t.accent}22` : "none" }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 9, padding: "0 1px" }}>
            <div style={{ fontFamily: t.mono, fontSize: 11.5, fontWeight: 600, color: t.text, whiteSpace: "nowrap" }}>{fmtTime(n.utc, n.tz)}</div>
            <div style={{ fontFamily: t.body, fontSize: 10, color: t.faint, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ t, label, value, sub }: { t: Theme; label: string; value: string; sub: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.faint, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: t.display, fontSize: 21, fontWeight: 600, color: t.text, marginTop: 4, whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontFamily: t.body, fontSize: 12, color: t.dim, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
    </div>
  );
}

// The merged hero "bubble": status + destination + arrival ETA + stats.
function Hero({ s, t, trip, big }: { s: Schedule; t: Theme; trip: Trip; big: boolean }) {
  const tz = trip.destination.tz;
  const conn = s.connections[0];
  const via = trip.connections.map((c) => c.city.replace(" Incheon", "")).join(", ");
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: t.radius + 6,
        padding: big ? 30 : t.pad + 4,
        background: `linear-gradient(155deg, ${t.surface2} 0%, ${t.surface} 70%)`,
        border: `1px solid ${t.line}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px -28px rgba(0,0,0,0.7)`,
      }}
    >
      {/* accent glow */}
      <div style={{ position: "absolute", top: -90, right: -70, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${t.accent}26, transparent 68%)`, pointerEvents: "none" }} />
      {/* status color wash keyed to on-track state */}
      <div style={{ position: "absolute", bottom: -120, left: -60, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${s.status.color}12, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        {/* top row: status + live indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: s.status.soft, color: s.status.color, fontFamily: t.body, fontWeight: 700, fontSize: 13 }}>
            <StatusDot color={s.status.color} pulse /> {s.status.label}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: t.mono, fontSize: 10, color: t.faint, letterSpacing: 0.5 }}>
            <StatusDot color={t.accent} size={6} pulse /> auto-updating
          </span>
        </div>

        {/* destination — the contextual headline, merged into the bubble */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: big ? 22 : 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: t.accent + "1c", border: `1px solid ${t.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sym name="location_on" size={18} color={t.accent} fill={1} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 16.5, color: t.text, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{trip.destination.place}</div>
            <div style={{ fontFamily: t.body, fontSize: 12, color: t.dim, marginTop: 2 }}>{trip.destination.city} · via {via}</div>
          </div>
        </div>

        {/* arrival ETA — the hero number */}
        <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: t.faint, marginTop: big ? 24 : 20 }}>Arriving</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: big ? 66 : 50, lineHeight: 0.92, color: t.text, letterSpacing: -1.5 }}>{fmtTime(s.arriveUtc, tz)}</span>
          <span style={{ fontFamily: t.body, fontSize: 14, color: t.dim }}>{fmtDate(s.arriveUtc, tz)} · {tz.label}</span>
        </div>

        {/* hairline */}
        <div style={{ height: 1, background: t.line, margin: big ? "24px 0 18px" : "20px 0 16px" }} />

        {/* stats: leave by + layover (folds in the connection) */}
        <div style={{ display: "flex", gap: big ? 40 : 28 }}>
          <Stat t={t} label="Leave by" value={fmtTime(s.leaveByUtc, trip.origin.tz)} sub={`${fmtDate(s.leaveByUtc, trip.origin.tz)} · ${trip.origin.tz.label}`} />
          {conn && (
            <>
              <div style={{ width: 1, background: t.line }} />
              <Stat t={t} label={`Layover · ${conn.airportCode}`} value={fmtDur(conn.layoverMin)} sub={`${conn.city.replace(" Incheon", "")} connection`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Today({ s, t, nowUtc, go, trip, wide }: { s: Schedule; t: Theme; nowUtc: number; go: (tab: Tab) => void; trip: Trip; wide: boolean }) {
  const header = wide ? (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <h1 style={{ fontFamily: t.display, fontWeight: 600, fontSize: 26, color: t.text, margin: 0 }}>Today</h1>
      <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>{fmtTime(nowUtc, trip.origin.tz)} {trip.origin.tz.label}</span>
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>{trip.origin.code}</span>
        <Sym name="trending_flat" size={16} color={t.faint} />
        {trip.connections.map((c) => (
          <React.Fragment key={c.id}>
            <span style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 600, color: t.dim }}>{c.airportCode}</span>
            <Sym name="trending_flat" size={16} color={t.faint} />
          </React.Fragment>
        ))}
        <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>{trip.destination.code}</span>
      </div>
      <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>{fmtTime(nowUtc, trip.origin.tz)}</span>
    </div>
  );

  const hero = <Hero s={s} t={t} trip={trip} big={wide} />;

  const journeyCard = (
    <Card t={t} pad={t.pad}>
      <SectionLabel t={t} right={`${trip.flights.length} flights`}>Journey</SectionLabel>
      <Ribbon s={s} t={t} trip={trip} />
    </Card>
  );

  const actionRow = (
    <div style={{ display: "flex", gap: t.gap }}>
      <button onClick={() => go("live")} style={{ flex: 1, textAlign: "left", cursor: "pointer", background: t.accent, border: "none", borderRadius: t.radius, padding: t.pad, display: "flex", alignItems: "center", gap: 12 }}>
        <Sym name="bolt" size={26} color="#06140d" fill={1} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: t.body, fontWeight: 800, fontSize: 15, color: "#06140d" }}>Live tracking</div>
          <div style={{ fontFamily: t.body, fontSize: 12, color: "#0a2c1c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Gemma watching {trip.flights.map((f) => f.code).join(" + ")}</div>
        </div>
        <Sym name="arrow_forward" size={20} color="#06140d" />
      </button>
      <button onClick={() => go("timeline")} style={{ width: 56, cursor: "pointer", background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radius, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sym name="checklist" size={24} color={t.dim} />
      </button>
    </div>
  );

  if (wide) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.gap, alignItems: "start" }}>
        <div style={{ gridColumn: "1 / -1" }}>{header}</div>
        <div style={{ gridColumn: "1 / -1" }}>{hero}</div>
        <div style={{ gridColumn: "1 / -1" }}>{journeyCard}</div>
        <div style={{ gridColumn: "1 / -1" }}>{actionRow}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: `8px ${t.pad}px 28px`, display: "flex", flexDirection: "column", gap: t.gap }}>
      {header}
      {hero}
      {journeyCard}
      {actionRow}
    </div>
  );
}
