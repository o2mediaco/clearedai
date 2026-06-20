"use client";
// Live.tsx — real-time tracking driven by the Gemma multi-agent pipeline.
// Shows the Router → Analyst → Comm trace (matching the pitch deck) plus the
// running alert feed and staged machine actions.

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
  bufferBefore: number;
  bufferAfter: number;
  color: string;
}

const WATCHING = [
  { icon: "flight", label: "UA857 status", src: "United / FlightAware" },
  { icon: "security", label: "SFO security wait", src: "TSA feed" },
  { icon: "fingerprint", label: "PVG immigration", src: "Airport queue" },
  { icon: "directions_car", label: "Shanghai traffic", src: "AMap" },
];

function StepHeader({ n, title, model, t, color }: { n: number; title: string; model: string; t: Theme; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          background: color,
          color: "#06140d",
          fontFamily: t.mono,
          fontWeight: 700,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n}
      </div>
      <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 13, color: t.text }}>{title}</span>
      <span style={{ fontFamily: t.mono, fontSize: 9.5, color: t.faint, marginLeft: "auto" }}>{model}</span>
    </div>
  );
}

function PipelineCard({ p, t, engine, model }: { p: PipelineTrace; t: Theme; engine: string; model: string }) {
  const sevColor =
    p.router.severity === "critical" || p.router.severity === "high"
      ? t.red
      : p.router.severity === "med"
        ? t.amber
        : p.router.severity === "low"
          ? t.green
          : t.dim;
  const label = engine === "gemma" ? model.replace("google/", "") : "deterministic fallback";
  return (
    <Card t={t}>
      <SectionLabel t={t} right={label}>
        Agent pipeline
      </SectionLabel>

      {/* Router */}
      <div style={{ paddingBottom: 12, borderBottom: `1px solid ${t.lineSoft}` }}>
        <StepHeader n={1} title="Lead Router" model="triage" t={t} color={t.accent} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span
            style={{
              fontFamily: t.mono,
              fontSize: 11,
              fontWeight: 700,
              color: sevColor,
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 6,
              background: sevColor + "1e",
            }}
          >
            {p.router.severity}
          </span>
          <span style={{ fontFamily: t.body, fontSize: 11.5, color: t.faint }}>
            {p.router.engage ? "pipeline engaged" : "monitoring only"}
          </span>
        </div>
        <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45 }}>{p.router.strategy}</div>
      </div>

      {/* Analyst */}
      {p.analyst && (
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.lineSoft}` }}>
          <StepHeader n={2} title="Logistics Analyst" model="cascade" t={t} color="#b794f6" />
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.text, marginBottom: 4 }}>{p.analyst.etaSummary}</div>
          <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45, marginBottom: 6 }}>
            {p.analyst.narrative}
          </div>
          {p.analyst.risks.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 3 }}>
              <Sym name="chevron_right" size={14} color={t.faint} />
              <span style={{ fontFamily: t.body, fontSize: 12, color: t.dim }}>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comm */}
      {p.comm && (
        <div style={{ paddingTop: 12 }}>
          <StepHeader n={3} title="Comm & Action Ops" model="drafts" t={t} color={t.green} />
          {p.comm.alert ? (
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45 }}>
              Drafted alert: <span style={{ color: t.text, fontWeight: 600 }}>“{p.comm.alert.title}”</span>
            </div>
          ) : (
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.faint }}>No user action required.</div>
          )}
          {p.comm.actions.map((a: AgentAction, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 8,
                padding: "9px 11px",
                borderRadius: 12,
                background: t.surface2,
                border: `1px solid ${t.lineSoft}`,
              }}
            >
              <Sym
                name={a.type === "rideshare" ? "local_taxi" : a.type === "message" ? "sms" : "event_available"}
                size={18}
                color={t.accent}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 12.5, color: t.text }}>{a.label}</div>
                <div style={{ fontFamily: t.body, fontSize: 11, color: t.faint, lineHeight: 1.35 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Live({
  s,
  t,
  trip,
  tick,
  loading,
  engine,
  model,
  pipeline,
  alerts,
  onTick,
  onReset,
  maxTicks,
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
}) {
  const done = tick >= maxTicks;
  return (
    <div style={{ padding: `12px ${t.pad}px 30px`, display: "flex", flexDirection: "column", gap: t.gap }}>
      {/* verdict banner */}
      <div
        style={{
          background: `linear-gradient(150deg, ${t.surface2}, ${t.surface})`,
          border: `1px solid ${s.status.color}44`,
          borderRadius: t.radius,
          padding: t.pad,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: t.body, fontWeight: 700, fontSize: 13, color: s.status.color }}>
            <StatusDot color={s.status.color} pulse /> {s.status.label}
          </span>
          <span
            style={{
              fontFamily: t.mono,
              fontSize: 10,
              color: engine === "gemma" ? t.accent : t.faint,
              padding: "3px 8px",
              borderRadius: 6,
              border: `1px solid ${engine === "gemma" ? t.accent + "55" : t.line}`,
            }}
          >
            {engine === "gemma" ? "● Gemma live" : engine === "mock" ? "○ mock agent" : "idle"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
          <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 38, color: t.text, letterSpacing: -1 }}>
            {s.buffer < 0 ? `−${fmtDur(-s.buffer)}` : fmtDur(s.buffer)}
          </span>
          <span style={{ fontFamily: t.body, fontSize: 13, color: t.dim }}>buffer · arrive {fmtTime(s.arrive)}</span>
        </div>
      </div>

      {/* monitored feeds */}
      <Card t={t}>
        <SectionLabel t={t} right={`${WATCHING.length} feeds`}>
          Watching for you
        </SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          {WATCHING.map((w) => (
            <div
              key={w.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 10px",
                borderRadius: 12,
                background: t.surface2,
                border: `1px solid ${t.lineSoft}`,
              }}
            >
              <Sym name={w.icon} size={18} color={t.accent} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: t.body,
                    fontWeight: 700,
                    fontSize: 12,
                    color: t.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {w.label}
                </div>
                <div style={{ fontFamily: t.mono, fontSize: 9.5, color: t.faint }}>{w.src}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* agent pipeline trace */}
      {pipeline && <PipelineCard p={pipeline} t={t} engine={engine ?? "mock"} model={model} />}

      {/* alert feed */}
      <div>
        <SectionLabel t={t} right={alerts.length > 0 ? `${alerts.length} alert${alerts.length > 1 ? "s" : ""}` : "all quiet"}>
          Updates
        </SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", borderRadius: t.radius, border: `1px dashed ${t.line}`, background: t.surface }}>
              <Sym name="notifications_active" size={26} color={t.faint} />
              <div style={{ fontFamily: t.body, fontSize: 13, color: t.dim, marginTop: 8 }}>
                Agent armed. Run a tick to let Gemma sweep the feeds and decide what threatens your 2:00 PM.
              </div>
            </div>
          )}
          {alerts.map((e) => {
            const drop = e.bufferAfter < e.bufferBefore;
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
                  <Sym name={drop ? "south_east" : "north_east"} size={16} color={drop ? t.red : t.green} />
                  <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>Buffer</span>
                  <span style={{ fontFamily: t.mono, fontSize: 12.5, color: t.faint, textDecoration: "line-through" }}>
                    {e.bufferBefore < 0 ? `−${Math.abs(e.bufferBefore)}` : e.bufferBefore}m
                  </span>
                  <Sym name="arrow_forward" size={13} color={t.faint} />
                  <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: e.color }}>
                    {e.bufferAfter < 0 ? `−${Math.abs(e.bufferAfter)}` : e.bufferAfter}m
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* controls */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={done ? onReset : onTick}
            disabled={loading}
            style={{
              flex: 1,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              background: t.accent,
              border: "none",
              borderRadius: 99,
              padding: "13px",
              fontFamily: t.body,
              fontWeight: 800,
              fontSize: 14,
              color: "#06140d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <Sym name="autorenew" size={20} color="#06140d" fill={1} /> Gemma thinking…
              </>
            ) : done ? (
              <>
                <Sym name="restart_alt" size={20} color="#06140d" fill={1} /> Replay from start
              </>
            ) : (
              <>
                <Sym name="play_arrow" size={20} color="#06140d" fill={1} /> Run agent tick
              </>
            )}
          </button>
          {tick > 0 && !done && (
            <button
              onClick={onReset}
              disabled={loading}
              style={{
                width: 52,
                cursor: "pointer",
                background: t.surface,
                border: `1px solid ${t.line}`,
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sym name="restart_alt" size={20} color={t.dim} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
