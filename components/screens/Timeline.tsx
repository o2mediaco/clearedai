"use client";
// Timeline.tsx — leg-by-leg door-to-door schedule, with changed legs highlighted.

import React from "react";
import { Sym, StatusDot, Pill, type Theme } from "../ui";
import { fmtTime, fmtDur } from "@/lib/schedule";
import type { Schedule, Trip, ComputedLeg, ComputedFlight } from "@/lib/types";

function LegRow({
  leg,
  t,
  color,
  changed,
  expanded,
  onToggle,
}: {
  leg: ComputedLeg;
  t: Theme;
  color: string;
  changed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ width: 28, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: t.surface2,
            border: `1px solid ${changed ? t.amber : t.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sym name={leg.icon} size={17} color={changed ? t.amber : color} />
        </div>
        <div style={{ flex: 1, width: 2, background: t.line, marginTop: 2, minHeight: 14 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: t.dense ? 12 : 16 }}>
        <div onClick={onToggle} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>{leg.title}</span>
              {leg.live && <StatusDot color={changed ? t.amber : t.green} size={6} pulse />}
            </div>
            <div
              style={{
                fontFamily: t.body,
                fontSize: 12,
                color: t.dim,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {leg.sub}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.text, fontWeight: 600 }}>{fmtDur(leg.dur)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 2 }}>{fmtTime(leg.start)}</div>
          </div>
        </div>
        {expanded && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: t.bg, border: `1px solid ${t.lineSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <Sym name="cell_tower" size={14} color={t.accent} />
              <span style={{ fontFamily: t.mono, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: t.faint }}>
                Source · {leg.source}
              </span>
            </div>
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45 }}>{leg.detail}</div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 8 }}>
              {fmtTime(leg.start)} → {fmtTime(leg.end)}
              {leg.day ? " · +1 day" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseHeader({ icon, city, tz, sub, t, color }: { icon: string; city: string; tz: string; sub: string; t: Theme; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "4px 0 14px" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: color + "1c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sym name={icon} size={19} color={color} fill={1} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 17, color: t.text }}>{city}</div>
        <div style={{ fontFamily: t.body, fontSize: 11.5, color: t.faint }}>{sub}</div>
      </div>
      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, padding: "4px 8px", border: `1px solid ${t.line}`, borderRadius: 7 }}>
        {tz}
      </span>
    </div>
  );
}

function FlightBlock({ f, t, changed }: { f: ComputedFlight; t: Theme; changed: boolean }) {
  return (
    <div style={{ margin: "2px 0 18px", marginLeft: 42 }}>
      <div
        style={{
          background: `linear-gradient(150deg, ${t.raised}, ${t.surface})`,
          border: `1px solid ${changed ? t.amber + "55" : t.line}`,
          borderRadius: 16,
          padding: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sym name="flight" size={18} color={t.accent} fill={1} style={{ transform: "rotate(45deg)" }} />
            <span style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: t.text }}>
              {f.carrier} {f.code}
            </span>
          </div>
          {changed ? (
            <Pill t={t} color={t.amber} soft={t.amber + "22"}>
              Delayed {f.delay}m
            </Pill>
          ) : (
            <Pill t={t} color={t.green} soft={t.green + "1e"}>
              On time
            </Pill>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 22, color: t.text, whiteSpace: "nowrap" }}>{fmtTime(f.start)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.dim, marginTop: 2 }}>
              {f.from} · {f.termFrom}
            </div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint }}>San Francisco · PDT</div>
          </div>
          <div style={{ flex: 1, padding: "0 12px", textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.faint }}>{fmtDur(f.dur)}</div>
            <div style={{ position: "relative", height: 2, background: t.line, margin: "6px 0" }}>
              <span style={{ position: "absolute", right: -2, top: -3, width: 8, height: 8, borderRadius: 99, background: t.accent }} />
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>seat {f.seat}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 22, color: t.text, whiteSpace: "nowrap" }}>{fmtTime(f.end)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.dim, marginTop: 2 }}>
              {f.to} · {f.termTo}
            </div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint }}>Shanghai · CST · +1 day</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Timeline({ s, t, changedSet, trip }: { s: Schedule; t: Theme; changedSet: Set<string>; trip: Trip }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const toggle = (id: string) => setOpen(open === id ? null : id);
  return (
    <div style={{ padding: `12px ${t.pad}px 30px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 21, color: t.text }}>Door to door</div>
          <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim }}>
            Leave {fmtTime(s.leaveBy)} → arrive {fmtTime(s.arrive)} ·{" "}
            {s.buffer < 0 ? `${fmtDur(-s.buffer)} late` : `${fmtDur(s.buffer)} buffer`}
          </div>
        </div>
        <Pill t={t} color={s.status.color} soft={s.status.soft}>
          <StatusDot color={s.status.color} /> {fmtDur(Math.abs(s.buffer))}
        </Pill>
      </div>

      <PhaseHeader icon="flight_takeoff" city="San Francisco" tz="PDT" sub="Today · depart side" t={t} color={t.accent} />
      {s.preLegs.map((leg) => (
        <LegRow key={leg.id} leg={leg} t={t} color={t.accent} changed={changedSet.has(leg.id)} expanded={open === leg.id} onToggle={() => toggle(leg.id)} />
      ))}

      <FlightBlock f={s.flightLeg} t={t} changed={changedSet.has("flight")} />

      <PhaseHeader icon="flight_land" city="Shanghai" tz="CST · +1" sub="Tomorrow · arrival side" t={t} color="#b794f6" />
      {s.postLegs.map((leg) => (
        <LegRow key={leg.id} leg={leg} t={t} color="#b794f6" changed={changedSet.has(leg.id)} expanded={open === leg.id} onToggle={() => toggle(leg.id)} />
      ))}

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: s.status.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sym name="flag" size={17} color="#06140d" fill={1} />
          </div>
        </div>
        <div style={{ flex: 1, background: s.status.soft, border: `1px solid ${s.status.color}44`, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>Arrive at meeting</span>
            <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 20, color: s.status.color }}>{fmtTime(s.arrive)}</span>
          </div>
          <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 4 }}>
            {trip.meeting.title} · 2:00 PM · {s.buffer < 0 ? `${fmtDur(-s.buffer)} late` : `${fmtDur(s.buffer)} to spare`}
          </div>
        </div>
      </div>
    </div>
  );
}
