"use client";
// Live.tsx — real-time tracking driven by the Gemma multi-agent pipeline.
// Responsive: single column on mobile; on desktop, feeds + updates on the left
// and the Router → Analyst → Comm pipeline on the right.

import React from "react";
import { Sym, StatusDot, Card, SectionLabel, type Theme } from "../ui";
import { fmtTime, fmtDur } from "@/lib/schedule";
import type { Schedule, Trip, PipelineTrace, AgentAction } from "@/lib/types";

export interface AlertEntry {
  id: number;
  title: string;
  body: string;
  severity: string;
  time: string;
  slipBefore: number;
  slipAfter: number;
  color: string;
}

const WATCHING = [
  { icon: "flight", label: "KE012 LAX→ICN", src: "Korean Air / AeroAPI" },
  { icon: "connecting_airports", label: "OZ104 ICN→NRT", src: "Asiana / AeroAPI" },
  { icon: "fingerprint", label: "NRT immigration", src: "Airport queue" },
  { icon: "directions_car", label: "Tokyo traffic", src: "Google Routes" },
];

function PipeStep({ t, n, color, title, agent, last = false, degraded = false, children }: { t: Theme; n: number; color: string; title: string; agent: string; last?: boolean; degraded?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 26, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: color + "22", border: `1.5px solid ${color}`, color, fontFamily: t.mono, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
        {!last && <div style={{ flex: 1, width: 2, background: t.line, marginTop: 4, minHeight: 12 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 18 }}>
        <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14, color: t.text }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
          <span style={{ fontFamily: t.mono, fontSize: 9.5, color: t.faint, letterSpacing: 0.4 }}>{agent}</span>
          {degraded && (
            <span title="Gemma's reply didn't parse — used the deterministic worker for this step" style={{ fontFamily: t.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.4, color: t.amber, background: t.amber + "1e", padding: "1px 5px", borderRadius: 5 }}>DETERMINISTIC</span>
          )}
        </div>
        <div style={{ marginTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

const SEV: Record<string, { word: string; tone: "good" | "warn" | "bad" }> = {
  none: { word: "No impact", tone: "good" },
  low: { word: "Low impact", tone: "good" },
  med: { word: "Moderate impact", tone: "warn" },
  high: { word: "High impact", tone: "bad" },
  critical: { word: "Critical", tone: "bad" },
};

function PipelineCard({ p, t, engine, model }: { p: PipelineTrace; t: Theme; engine: string; model: string }) {
  const sevInfo = SEV[p.router.severity] ?? { word: p.router.severity, tone: "warn" as const };
  const sevColor = sevInfo.tone === "bad" ? t.red : sevInfo.tone === "warn" ? t.amber : t.green;
  const label = engine === "gemma" ? `Gemma · ${model.replace("google/", "")}` : "offline fallback";
  return (
    <Card t={t}>
      <SectionLabel t={t} right={label}>How Gemma handled it</SectionLabel>

      <PipeStep t={t} n={1} color={t.accent} title="What I noticed" agent="Lead Router" degraded={engine === "gemma" && p.via.router === "mock"}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 11px", borderRadius: 99, background: sevColor + "1e", marginBottom: 9 }}>
          <StatusDot color={sevColor} />
          <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 12, color: sevColor }}>{sevInfo.word}</span>
          <span style={{ fontFamily: t.body, fontSize: 11.5, color: t.dim }}>· {p.router.engage ? "taking action" : "just monitoring"}</span>
        </div>
        <div style={{ fontFamily: t.body, fontSize: 13.5, color: t.text, lineHeight: 1.5 }}>{p.router.strategy}</div>
      </PipeStep>

      {p.analyst && (
        <PipeStep t={t} n={2} color="#b794f6" title="What it means for your trip" agent="Logistics Analyst" degraded={engine === "gemma" && p.via.analyst === "mock"}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10, background: t.surface2, border: `1px solid ${t.lineSoft}`, marginBottom: 9 }}>
            <Sym name="schedule" size={16} color={t.accent} />
            <span style={{ fontFamily: t.body, fontSize: 12.5, fontWeight: 600, color: t.text }}>{p.analyst.etaSummary}</span>
          </div>
          <div style={{ fontFamily: t.body, fontSize: 13.5, color: t.text, lineHeight: 1.5 }}>{p.analyst.narrative}</div>
          {p.analyst.risks.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {p.analyst.risks.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Sym name="arrow_right" size={17} color={t.faint} style={{ marginTop: -1 }} />
                  <span style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45 }}>{r}</span>
                </div>
              ))}
            </div>
          )}
        </PipeStep>
      )}

      {p.comm && (
        <PipeStep t={t} n={3} color={t.green} title="What I did about it" agent="Comm & Action Ops" last degraded={engine === "gemma" && p.via.comm === "mock"}>
          {p.comm.alert ? (
            <div style={{ fontFamily: t.body, fontSize: 13.5, color: t.text, lineHeight: 1.5 }}>
              Sent you an alert — <span style={{ fontWeight: 700 }}>“{p.comm.alert.title}”</span>
            </div>
          ) : (
            <div style={{ fontFamily: t.body, fontSize: 13.5, color: t.dim, lineHeight: 1.5 }}>Nothing you need to do — you’re all set.</div>
          )}
          {p.comm.actions.length > 0 && (
            <>
              <div style={{ fontFamily: t.mono, fontSize: 9.5, letterSpacing: 1, color: t.faint, textTransform: "uppercase", margin: "12px 0 7px" }}>Ready for you</div>
              {p.comm.actions.map((a: AgentAction, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7, padding: "10px 12px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.lineSoft}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: t.accent + "1c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Sym name={a.type === "rideshare" ? "local_taxi" : a.type === "message" ? "sms" : "event_available"} size={17} color={t.accent} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 13, color: t.text }}>{a.label}</div>
                    <div style={{ fontFamily: t.body, fontSize: 11.5, color: t.dim, lineHeight: 1.4 }}>{a.detail}</div>
                  </div>
                  <Sym name="chevron_right" size={18} color={t.faint} />
                </div>
              ))}
            </>
          )}
        </PipeStep>
      )}
    </Card>
  );
}

export default function Live({
  s, t, trip, tick, loading, engine, model, pipeline, alerts, onTick, onReset, maxTicks, wide, feedMode, setFeedMode,
}: {
  s: Schedule;
  t: Theme;
  trip: Trip;
  tick: number;
  loading: boolean;
  engine: "gemma" | "mock" | null;
  model: string;
  pipeline: PipelineTrace | null;
  alerts: AlertEntry[];
  onTick: () => void;
  onReset: () => void;
  maxTicks: number;
  wide: boolean;
  feedMode: "mock" | "real";
  setFeedMode: (m: "mock" | "real") => void;
}) {
  const done = tick >= maxTicks;
  const tz = trip.destination.tz;

  const banner = (
    <div style={{ background: `linear-gradient(150deg, ${t.surface2}, ${t.surface})`, border: `1px solid ${s.status.color}44`, borderRadius: t.radius, padding: t.pad }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: t.body, fontWeight: 700, fontSize: 13, color: s.status.color }}>
          <StatusDot color={s.status.color} pulse /> {s.status.label}
        </span>
        <span style={{ fontFamily: t.mono, fontSize: 10, color: engine === "gemma" ? t.accent : t.faint, padding: "3px 8px", borderRadius: 6, border: `1px solid ${engine === "gemma" ? t.accent + "55" : t.line}` }}>
          {engine === "gemma" ? "● Gemma live" : engine === "mock" ? "○ mock agent" : "idle"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 38, color: t.text, letterSpacing: -1 }}>{fmtTime(s.arriveUtc, tz)}</span>
        <span style={{ fontFamily: t.body, fontSize: 13, color: t.dim }}>ETA {trip.destination.code} · {s.slip <= 0 ? "on schedule" : `+${fmtDur(s.slip)} vs plan`}</span>
      </div>
    </div>
  );

  const feedsCard = (
    <Card t={t}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 10px", gap: 10 }}>
        <span style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: t.faint, fontWeight: 600 }}>Watching for you</span>
        <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 99, background: t.surface2, border: `1px solid ${t.line}`, flexShrink: 0 }}>
          {(["mock", "real"] as const).map((m) => {
            const active = feedMode === m;
            return (
              <button key={m} onClick={() => setFeedMode(m)} title={m === "real" ? "Live FlightAware + Google data" : "Scripted demo arc"} style={{ border: "none", cursor: "pointer", borderRadius: 99, padding: "4px 11px", fontFamily: t.body, fontSize: 11, fontWeight: 700, background: active ? t.accent : "transparent", color: active ? "#06140d" : t.dim, transition: "all .15s" }}>
                {m === "mock" ? "Mock" : "Live data"}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {WATCHING.map((w) => (
          <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.lineSoft}` }}>
            <Sym name={w.icon} size={18} color={t.accent} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 11.5, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.label}</div>
              <div style={{ fontFamily: t.mono, fontSize: 9, color: t.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.src}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const controls = (
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
      <button onClick={done ? onReset : onTick} disabled={loading} style={{ flex: 1, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, background: t.accent, border: "none", borderRadius: 99, padding: "13px", fontFamily: t.body, fontWeight: 800, fontSize: 14, color: "#06140d", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading ? <><Sym name="autorenew" size={20} color="#06140d" fill={1} /> Gemma thinking…</> : done ? <><Sym name="restart_alt" size={20} color="#06140d" fill={1} /> Replay from start</> : <><Sym name="play_arrow" size={20} color="#06140d" fill={1} /> Run agent tick</>}
      </button>
      {tick > 0 && !done && (
        <button onClick={onReset} disabled={loading} style={{ width: 52, cursor: "pointer", background: t.surface, border: `1px solid ${t.line}`, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sym name="restart_alt" size={20} color={t.dim} />
        </button>
      )}
    </div>
  );

  const updates = (
    <div>
      <SectionLabel t={t} right={alerts.length > 0 ? `${alerts.length} alert${alerts.length > 1 ? "s" : ""}` : "all quiet"}>Updates</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.length === 0 && (
          <div style={{ padding: 22, textAlign: "center", borderRadius: t.radius, border: `1px dashed ${t.line}`, background: t.surface }}>
            <Sym name="notifications_active" size={26} color={t.faint} />
            <div style={{ fontFamily: t.body, fontSize: 13, color: t.dim, marginTop: 8 }}>Agent armed. Run a tick to let Gemma sweep the feeds and decide what affects your arrival.</div>
          </div>
        )}
        {alerts.map((e) => {
          const worse = e.slipAfter > e.slipBefore;
          const same = e.slipAfter === e.slipBefore;
          return (
            <div key={e.id} style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sym name="bolt" size={15} color="#06140d" fill={1} />
                </div>
                <span style={{ fontFamily: t.body, fontWeight: 800, fontSize: 11.5, color: t.text }}>Cleared</span>
                <span style={{ fontFamily: t.mono, fontSize: 10.5, color: t.faint, marginLeft: "auto" }}>{e.time}</span>
              </div>
              <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>{e.title}</div>
              <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 3, lineHeight: 1.45 }}>{e.body}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, paddingTop: 11, borderTop: `1px solid ${t.lineSoft}` }}>
                <Sym name={same ? "trending_flat" : worse ? "north_east" : "south_east"} size={16} color={same ? t.faint : worse ? t.red : t.green} />
                <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>Slip</span>
                <span style={{ fontFamily: t.mono, fontSize: 12.5, color: t.faint, textDecoration: same ? "none" : "line-through" }}>+{Math.max(0, e.slipBefore)}m</span>
                <Sym name="arrow_forward" size={13} color={t.faint} />
                <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: e.color }}>+{Math.max(0, e.slipAfter)}m</span>
                {same && <span style={{ fontFamily: t.body, fontSize: 11, color: t.green, marginLeft: 4 }}>absorbed</span>}
              </div>
            </div>
          );
        })}
      </div>
      {controls}
    </div>
  );

  const pipelinePane = pipeline ? (
    <PipelineCard p={pipeline} t={t} engine={engine ?? "mock"} model={model} />
  ) : (
    <div style={{ padding: 22, textAlign: "center", borderRadius: t.radius, border: `1px dashed ${t.line}`, background: t.surface }}>
      <Sym name="account_tree" size={26} color={t.faint} />
      <div style={{ fontFamily: t.body, fontSize: 13, color: t.dim, marginTop: 8 }}>Run a tick to see the Router → Analyst → Comm pipeline.</div>
    </div>
  );

  if (wide) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: t.gap }}>
        {banner}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.gap, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: t.gap }}>{feedsCard}{updates}</div>
          <div>{pipelinePane}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: `12px ${t.pad}px 30px`, display: "flex", flexDirection: "column", gap: t.gap }}>
      {banner}
      {feedsCard}
      {pipeline && <PipelineCard p={pipeline} t={t} engine={engine ?? "mock"} model={model} />}
      {updates}
    </div>
  );
}
