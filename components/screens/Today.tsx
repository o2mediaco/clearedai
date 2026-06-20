"use client";
// Today.tsx — home screen: live arrival-ETA hero, door-to-door ribbon, next action.

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
          {i < nodes.length - 1 && (
            <div style={{ position: "absolute", top: 5, left: "50%", right: "-50%", height: 2, background: t.line }} />
          )}
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

function HeroEta({ s, t, trip }: { s: Schedule; t: Theme; trip: Trip }) {
  const tz = trip.destination.tz;
  return (
    <div>
      <div style={{ display: "inline-flex" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: s.status.soft, color: s.status.color, fontFamily: t.body, fontWeight: 700, fontSize: 13 }}>
          <StatusDot color={s.status.color} pulse /> {s.status.label}
        </span>
      </div>
      <div style={{ fontFamily: t.mono, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: t.faint, marginTop: 16 }}>
        Arriving {trip.destination.city}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
        <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 46, lineHeight: 0.95, color: t.text, letterSpacing: -1 }}>
          {fmtTime(s.arriveUtc, tz)}
        </span>
        <span style={{ fontFamily: t.body, fontSize: 14, color: t.dim }}>{fmtDate(s.arriveUtc, tz)} · {tz.label}</span>
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: "uppercase" }}>Vs plan</div>
          <div style={{ fontFamily: t.display, fontSize: 22, fontWeight: 600, color: s.status.color, marginTop: 3 }}>
            {s.slip <= 0 ? "On schedule" : `+${fmtDur(s.slip)}`}
          </div>
        </div>
        <div style={{ width: 1, background: t.line }} />
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: "uppercase" }}>Leave by</div>
          <div style={{ fontFamily: t.display, fontSize: 22, fontWeight: 600, color: t.text, marginTop: 3 }}>
            {fmtTime(s.leaveByUtc, trip.origin.tz)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Today({ s, t, nowUtc, go, trip }: { s: Schedule; t: Theme; nowUtc: number; go: (tab: Tab) => void; trip: Trip }) {
  return (
    <div style={{ padding: `8px ${t.pad}px 28px`, display: "flex", flexDirection: "column", gap: t.gap }}>
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

      <div style={{ background: `linear-gradient(160deg, ${t.surface2}, ${t.surface})`, border: `1px solid ${t.line}`, borderRadius: t.radius + 4, padding: t.pad + 4 }}>
        <HeroEta s={s} t={t} trip={trip} />
      </div>

      <Card t={t} pad={t.pad}>
        <SectionLabel t={t} right={`${trip.flights.length} flights`}>Journey</SectionLabel>
        <Ribbon s={s} t={t} trip={trip} />
      </Card>

      <div style={{ display: "flex", gap: t.gap }}>
        <button onClick={() => go("live")} style={{ flex: 1, textAlign: "left", cursor: "pointer", background: t.accent, border: "none", borderRadius: t.radius, padding: t.pad, display: "flex", alignItems: "center", gap: 12 }}>
          <Sym name="bolt" size={26} color="#06140d" fill={1} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: t.body, fontWeight: 800, fontSize: 15, color: "#06140d" }}>Live tracking</div>
            <div style={{ fontFamily: t.body, fontSize: 12, color: "#0a2c1c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Gemma watching {trip.flights.map((f) => f.code).join(" + ")}
            </div>
          </div>
          <Sym name="arrow_forward" size={20} color="#06140d" />
        </button>
        <button onClick={() => go("timeline")} style={{ width: 56, cursor: "pointer", background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radius, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sym name="checklist" size={24} color={t.dim} />
        </button>
      </div>

      <Card t={t}>
        <SectionLabel t={t} right="destination">Where you’re headed</SectionLabel>
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: t.surface2, border: `1px solid ${t.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sym name="location_on" size={22} color={t.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 15, color: t.text }}>{trip.destination.place}</div>
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 2 }}>{trip.destination.city} · via {trip.connections.map((c) => c.city).join(", ")}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12.5, color: t.text, marginTop: 8 }}>
              ETA {fmtTime(s.arriveUtc, trip.destination.tz)} <span style={{ color: t.faint }}>· {fmtDate(s.arriveUtc, trip.destination.tz)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
