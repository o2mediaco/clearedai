"use client";
// Today.tsx — the home screen: verdict hero, door-to-door ribbon, next action.

import React from "react";
import { Sym, StatusDot, Card, SectionLabel, type Theme } from "../ui";
import { fmtTime, fmtDur } from "@/lib/schedule";
import type { Schedule, Trip, Tab } from "@/lib/types";

function DoorRibbon({ s, t }: { s: Schedule; t: Theme }) {
  const nodes = [
    { label: "Leave", time: fmtTime(s.leaveBy) },
    { label: "Wheels up", time: fmtTime(s.depart) },
    { label: "Land", time: fmtTime(s.land), day: "+1" },
    { label: "Meeting", time: fmtTime(s.meeting), day: "+1" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, padding: "2px 2px 0" }}>
      {nodes.map((n, i) => (
        <div key={n.label} style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {i < nodes.length - 1 && (
            <div style={{ position: "absolute", top: 5, left: "50%", right: "-50%", height: 2, background: t.line }} />
          )}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 99,
                background: i === 0 ? t.accent : t.surface2,
                border: `2px solid ${i === 0 ? t.accent : t.line}`,
                boxShadow: i === 0 ? `0 0 0 4px ${t.accent}22` : "none",
              }}
            />
          </div>
          <div style={{ textAlign: "center", marginTop: 9, padding: "0 2px" }}>
            <div style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 600, color: t.text, whiteSpace: "nowrap" }}>
              {n.time}
            </div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint, marginTop: 2 }}>
              {n.label}
              {n.day ? ` ·${n.day}d` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroVerdict({ s, t }: { s: Schedule; t: Theme }) {
  const made = s.buffer >= 0;
  return (
    <div>
      <div style={{ display: "inline-flex" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 12px",
            borderRadius: 99,
            background: s.status.soft,
            color: s.status.color,
            fontFamily: t.body,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <StatusDot color={s.status.color} pulse /> {s.status.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: t.display,
          fontWeight: 600,
          color: t.text,
          fontSize: t.dense ? 30 : 34,
          lineHeight: 1.08,
          letterSpacing: -0.5,
          marginTop: 16,
        }}
      >
        {made ? "You’ll make your" : "You may miss your"}
        <br />
        <span style={{ color: s.status.color }}>2:00 PM meeting.</span>
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: "uppercase" }}>
            Arrive
          </div>
          <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 600, color: t.text, marginTop: 3 }}>
            {fmtTime(s.arrive)}
          </div>
        </div>
        <div style={{ width: 1, background: t.line }} />
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: "uppercase" }}>
            Buffer
          </div>
          <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 600, color: s.status.color, marginTop: 3 }}>
            {s.buffer < 0 ? `−${fmtDur(-s.buffer)}` : fmtDur(s.buffer)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Today({
  s,
  t,
  now,
  go,
  trip,
}: {
  s: Schedule;
  t: Theme;
  now: number;
  go: (tab: Tab) => void;
  trip: Trip;
}) {
  return (
    <div style={{ padding: `8px ${t.pad}px 28px`, display: "flex", flexDirection: "column", gap: t.gap }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>{trip.flight.from}</span>
          <Sym name="trending_flat" size={18} color={t.faint} />
          <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>{trip.flight.to}</span>
          <span style={{ fontFamily: t.body, fontSize: 12.5, color: t.faint, marginLeft: 4 }}>· Today</span>
        </div>
        <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>{fmtTime(now)}</span>
      </div>

      <div
        style={{
          background: `linear-gradient(160deg, ${t.surface2}, ${t.surface})`,
          border: `1px solid ${t.line}`,
          borderRadius: t.radius + 4,
          padding: t.pad + 4,
        }}
      >
        <HeroVerdict s={s} t={t} />
      </div>

      <Card t={t} pad={t.pad}>
        <SectionLabel t={t} right="door to door">
          Journey
        </SectionLabel>
        <DoorRibbon s={s} t={t} />
      </Card>

      <div style={{ display: "flex", gap: t.gap }}>
        <button
          onClick={() => go("live")}
          style={{
            flex: 1,
            textAlign: "left",
            cursor: "pointer",
            background: t.accent,
            border: "none",
            borderRadius: t.radius,
            padding: t.pad,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Sym name="bolt" size={26} color="#06140d" fill={1} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.body, fontWeight: 800, fontSize: 15, color: "#06140d" }}>Live tracking</div>
            <div style={{ fontFamily: t.body, fontSize: 12, color: "#0a2c1c" }}>Gemma agent watching {trip.flight.code}</div>
          </div>
          <Sym name="arrow_forward" size={20} color="#06140d" />
        </button>
        <button
          onClick={() => go("timeline")}
          style={{
            width: 56,
            cursor: "pointer",
            background: t.surface,
            border: `1px solid ${t.line}`,
            borderRadius: t.radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sym name="checklist" size={24} color={t.dim} />
        </button>
      </div>

      <Card t={t}>
        <SectionLabel t={t} right="destination">
          Why this matters
        </SectionLabel>
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: t.surface2,
              border: `1px solid ${t.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sym name="event" size={22} color={t.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 15, color: t.text }}>{trip.meeting.title}</div>
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 2 }}>
              {trip.meeting.org} · {trip.meeting.place}
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 12.5, color: t.text, marginTop: 8 }}>
              2:00 PM CST <span style={{ color: t.faint }}>· tomorrow</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
