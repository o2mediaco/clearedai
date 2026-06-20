"use client";

import React, { useCallback, useEffect, useState } from "react";
import { makeTheme, Sym, type Theme } from "@/components/ui";
import Today from "@/components/screens/Today";
import Timeline from "@/components/screens/Timeline";
import Live, { type AlertEntry } from "@/components/screens/Live";
import { computeSchedule, freshOverrides, fmtTime } from "@/lib/schedule";
import { SEED_TRIP } from "@/lib/trip";
import type { Overrides, Tab, PipelineTrace, AgentTickResponse } from "@/lib/types";

const ACCENT = "#4f8cff";
const MAX_TICKS = 3;

function useNow(startMin: number) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  return startMin + Math.floor(sec / 30);
}

function useFit(w: number, h: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 24) / h, (window.innerWidth - 24) / w));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [w, h]);
  return scale;
}

function StatusBar({ t, now }: { t: Theme; now: number }) {
  return (
    <div
      style={{
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: t.text }}>{fmtTime(now)}</span>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 9,
          transform: "translateX(-50%)",
          width: 11,
          height: 11,
          borderRadius: 99,
          background: "#05080700",
          boxShadow: "inset 0 0 0 2px #000",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Sym name="signal_cellular_alt" size={16} color={t.text} fill={1} />
        <Sym name="wifi" size={16} color={t.text} fill={1} />
        <Sym name="battery_5_bar" size={17} color={t.text} fill={1} style={{ transform: "rotate(90deg)" }} />
      </div>
    </div>
  );
}

function BottomNav({ t, tab, go, alert }: { t: Theme; tab: Tab; go: (x: Tab) => void; alert: number }) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "today", icon: "home", label: "Today" },
    { id: "timeline", icon: "checklist", label: "Timeline" },
    { id: "live", icon: "notifications", label: "Live" },
  ];
  return (
    <div style={{ flexShrink: 0, display: "flex", padding: "6px 8px 4px", borderTop: `1px solid ${t.line}`, background: t.bgTop }}>
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => go(it.id)}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 0",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                padding: "4px 18px",
                borderRadius: 99,
                background: active ? t.accent + "24" : "transparent",
                transition: "background .2s",
              }}
            >
              <Sym name={it.icon} size={23} color={active ? t.accent : t.dim} fill={active ? 1 : 0} />
              {it.id === "live" && alert > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    right: 12,
                    width: 15,
                    height: 15,
                    borderRadius: 99,
                    background: t.red,
                    color: "#fff",
                    fontFamily: t.mono,
                    fontSize: 9.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {alert}
                </span>
              )}
            </span>
            <span style={{ fontFamily: t.body, fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? t.text : t.faint }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Page() {
  const t = makeTheme({ accent: ACCENT, vibe: "calm" });
  const [tab, setTab] = useState<Tab>("today");
  const [overrides, setOverrides] = useState<Overrides>(freshOverrides());
  const [tick, setTick] = useState(0);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineTrace | null>(null);
  const [engine, setEngine] = useState<"gemma" | "mock" | null>(null);
  const [model, setModel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useNow(SEED_TRIP.base.now);
  const scale = useFit(412, 892);
  const schedule = computeSchedule(SEED_TRIP, overrides);

  const changedSet = new Set<string>();
  if (overrides.flightDelay !== 0) changedSet.add("flight");
  for (const [k, v] of Object.entries(overrides.dur)) if (v !== 0) changedSet.add(k);

  const go = (x: Tab) => setTab(x);

  const onTick = useCallback(async () => {
    setLoading(true);
    setError(null);
    const next = tick + 1;
    try {
      const res = await fetch("/api/agent/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides, tick: next }),
      });
      const data: AgentTickResponse & { error?: string } = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setOverrides(data.overrides);
      setTick(next);
      setEngine(data.engine);
      setModel(data.model ?? "");
      setPipeline(data.pipeline);
      if (data.alert) {
        setAlerts((prev) => [
          ...prev,
          {
            id: next,
            title: data.alert!.title,
            body: data.alert!.body,
            severity: data.alert!.severity,
            time: fmtTime(now),
            bufferBefore: data.bufferBefore,
            bufferAfter: data.bufferAfter,
            color: data.status.color,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  }, [overrides, tick, now]);

  const onReset = useCallback(() => {
    setOverrides(freshOverrides());
    setTick(0);
    setAlerts([]);
    setPipeline(null);
    setEngine(null);
    setModel("");
    setError(null);
  }, []);

  let screen: React.ReactNode;
  if (tab === "today") screen = <Today s={schedule} t={t} now={now} go={go} trip={SEED_TRIP} />;
  else if (tab === "timeline") screen = <Timeline s={schedule} t={t} changedSet={changedSet} trip={SEED_TRIP} />;
  else
    screen = (
      <Live
        s={schedule}
        t={t}
        trip={SEED_TRIP}
        tick={tick}
        loading={loading}
        engine={engine}
        model={model}
        pipeline={pipeline}
        alerts={alerts}
        onTick={onTick}
        onReset={onReset}
        maxTicks={MAX_TICKS}
      />
    );

  return (
    <div id="stage">
      <div
        style={{
          width: 412,
          height: 892,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          borderRadius: 46,
          padding: 9,
          background: "linear-gradient(160deg,#23312a,#0d1411)",
          boxShadow: "0 40px 110px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 38,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: `radial-gradient(120% 60% at 50% 0%, ${t.bgTop}, ${t.bg} 60%)`,
          }}
        >
          <StatusBar t={t} now={now} />
          <div className="scrollarea" key={tab} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {error && (
              <div
                style={{
                  margin: `8px ${t.pad}px`,
                  padding: 12,
                  borderRadius: 12,
                  background: t.red + "1e",
                  border: `1px solid ${t.red}55`,
                  fontFamily: t.body,
                  fontSize: 12.5,
                  color: t.red,
                }}
              >
                Agent error: {error}
              </div>
            )}
            {screen}
          </div>
          <BottomNav t={t} tab={tab} go={go} alert={alerts.length} />
          <div style={{ height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: t.bgTop }}>
            <div style={{ width: 130, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.22)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
