"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { makeTheme, Sym, StatusDot, type Theme } from "@/components/ui";
import Today from "@/components/screens/Today";
import Timeline from "@/components/screens/Timeline";
import Live, { type AlertEntry } from "@/components/screens/Live";
import { computeSchedule, freshOverrides, fmtTime } from "@/lib/schedule";
import { SEED_TRIP } from "@/lib/trip";
import type { Overrides, Tab, PipelineTrace, AgentTickResponse, Schedule } from "@/lib/types";

const ACCENT = "#4f8cff";
const MAX_TICKS = 4;
const DESKTOP_BP = 1024;
type FeedMode = "mock" | "real";

const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: "today", icon: "home", label: "Today" },
  { id: "timeline", icon: "checklist", label: "Timeline" },
  { id: "live", icon: "smart_toy", label: "Agent" },
];

/** Viewport hook with SSR-safe mounting (avoids hydration mismatch). */
function useViewport() {
  const [w, setW] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    setMounted(true);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return { w, mounted, isDesktop: w >= DESKTOP_BP };
}

function useNow(startUtc: number) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  return startUtc + Math.floor(sec / 30);
}

function Brand({ t, compact = false }: { t: Theme; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Sym name="bolt" size={20} color="#06140d" fill={1} />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontFamily: t.display, fontWeight: 700, fontSize: 16, color: t.text }}>Cleared</div>
        {!compact && <div style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, letterSpacing: 1 }}>TRAVEL AI</div>}
      </div>
    </div>
  );
}

function TripChip({ t, trip }: { t: Theme; trip: typeof SEED_TRIP }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 600, color: t.text }}>{trip.origin.code}</span>
      <Sym name="trending_flat" size={14} color={t.faint} />
      {trip.connections.map((c) => (
        <React.Fragment key={c.id}>
          <span style={{ fontFamily: t.mono, fontSize: 11.5, color: t.dim }}>{c.airportCode}</span>
          <Sym name="trending_flat" size={14} color={t.faint} />
        </React.Fragment>
      ))}
      <span style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 600, color: t.text }}>{trip.destination.code}</span>
    </div>
  );
}

function Sidebar({ t, tab, go, alert, trip }: { t: Theme; tab: Tab; go: (x: Tab) => void; alert: number; trip: typeof SEED_TRIP }) {
  return (
    <aside style={{ width: 264, flexShrink: 0, height: "100dvh", position: "sticky", top: 0, display: "flex", flexDirection: "column", padding: "24px 16px", borderRight: `1px solid ${t.line}`, background: t.bgTop, gap: 22 }}>
      <Brand t={t} />
      <div style={{ padding: "12px 12px", borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.line}` }}>
        <div style={{ fontFamily: t.mono, fontSize: 9.5, letterSpacing: 1.2, color: t.faint, marginBottom: 7 }}>ITINERARY</div>
        <TripChip t={t} trip={trip} />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((it) => {
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => go(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: t.radiusSm, border: "none", cursor: "pointer", background: active ? t.accent + "1f" : "transparent", color: active ? t.text : t.dim, textAlign: "left", width: "100%", transition: "background .15s" }}>
              <Sym name={it.icon} size={21} color={active ? t.accent : t.dim} fill={active ? 1 : 0} />
              <span style={{ fontFamily: t.body, fontWeight: active ? 700 : 600, fontSize: 14 }}>{it.label}</span>
              {it.id === "live" && alert > 0 && (
                <span style={{ marginLeft: "auto", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: t.red, color: "#fff", fontFamily: t.mono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{alert}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileHeader({ t, s, trip }: { t: Theme; s: Schedule; trip: typeof SEED_TRIP }) {
  return (
    <header style={{ flexShrink: 0, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${t.line}`, background: t.bgTop }}>
      <Brand t={t} compact />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 99, background: s.status.soft, color: s.status.color, fontFamily: t.body, fontWeight: 700, fontSize: 12 }}>
        <StatusDot color={s.status.color} pulse /> {fmtTime(s.arriveUtc, trip.destination.tz)}
      </span>
    </header>
  );
}

function BottomNav({ t, tab, go, alert }: { t: Theme; tab: Tab; go: (x: Tab) => void; alert: number }) {
  return (
    <nav style={{ flexShrink: 0, display: "flex", padding: "6px 8px", paddingBottom: "max(6px, env(safe-area-inset-bottom))", borderTop: `1px solid ${t.line}`, background: t.bgTop }}>
      {NAV.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => go(it.id)} style={{ flex: 1, border: "none", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0" }}>
            <span style={{ position: "relative", display: "inline-flex", padding: "4px 18px", borderRadius: 99, background: active ? t.accent + "24" : "transparent", transition: "background .2s" }}>
              <Sym name={it.icon} size={23} color={active ? t.accent : t.dim} fill={active ? 1 : 0} />
              {it.id === "live" && alert > 0 && (
                <span style={{ position: "absolute", top: 1, right: 12, width: 15, height: 15, borderRadius: 99, background: t.red, color: "#fff", fontFamily: t.mono, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{alert}</span>
              )}
            </span>
            <span style={{ fontFamily: t.body, fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? t.text : t.faint }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function Page() {
  const t = makeTheme({ accent: ACCENT, vibe: "calm" });
  const { mounted, isDesktop } = useViewport();
  const [tab, setTab] = useState<Tab>("today");
  const [overrides, setOverrides] = useState<Overrides>(freshOverrides());
  const [tick, setTick] = useState(0);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineTrace | null>(null);
  const [engine, setEngine] = useState<"gemma" | "mock" | null>(null);
  const [model, setModel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveRideMin, setLiveRideMin] = useState<number | null>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>("mock");

  // Pull live Google Routes traffic for the "Uber to LAX" pre-flight leg once on mount.
  useEffect(() => {
    fetch("/api/traffic")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.ride === "number") setLiveRideMin(d.ride);
      })
      .catch(() => {});
  }, []);

  // Display trip: bake the live ride minutes into the TRIP'S BASE duration.
  // The ride is a pre-flight leg, so this only shifts "Leave by" — never the
  // arrival ETA or slip. The agent server keeps its own SEED_TRIP (unaffected).
  const trip = useMemo(
    () =>
      liveRideMin == null
        ? SEED_TRIP
        : {
            ...SEED_TRIP,
            pre: SEED_TRIP.pre.map((l) =>
              l.id === "ride"
                ? { ...l, dur: liveRideMin, detail: `Live traffic · ~${liveRideMin} min to LAX` }
                : l
            ),
          },
    [liveRideMin]
  );

  const schedule = computeSchedule(trip, overrides);
  const nowUtc = useNow(schedule.leaveByUtc - 75);

  const go = (x: Tab) => setTab(x);

  const onTick = useCallback(async () => {
    setLoading(true);
    setError(null);
    const next = tick + 1;
    try {
      const res = await fetch("/api/agent/tick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overrides, tick: next, feedMode }) });
      const data: AgentTickResponse & { error?: string } = await res.json();
      if (data.error) { setError(data.error); return; }
      setOverrides(data.overrides);
      setTick(next);
      setEngine(data.engine);
      setModel(data.model ?? "");
      setPipeline(data.pipeline);
      if (data.alert) {
        setAlerts((prev) => [...prev, { id: next, title: data.alert!.title, body: data.alert!.body, severity: data.alert!.severity, time: fmtTime(nowUtc + next * 30, trip.origin.tz), slipBefore: data.slipBefore, slipAfter: data.slipAfter, color: data.status.color }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  }, [overrides, tick, nowUtc, trip, feedMode]);

  const onReset = useCallback(() => {
    setOverrides(freshOverrides());
    setTick(0);
    setAlerts([]);
    setPipeline(null);
    setEngine(null);
    setModel("");
    setError(null);
  }, []);

  // Switching data source restarts the run so mock/live don't get interleaved.
  const changeFeedMode = useCallback((m: FeedMode) => { setFeedMode(m); onReset(); }, [onReset]);

  const wide = mounted && isDesktop;

  let screen: React.ReactNode;
  if (tab === "today") screen = <Today s={schedule} t={t} nowUtc={nowUtc} go={go} trip={trip} wide={wide} />;
  else if (tab === "timeline") screen = <Timeline s={schedule} t={t} changedSet={changedSetOf(overrides)} trip={trip} wide={wide} />;
  else screen = <Live s={schedule} t={t} trip={trip} tick={tick} loading={loading} engine={engine} model={model} pipeline={pipeline} alerts={alerts} onTick={onTick} onReset={onReset} maxTicks={MAX_TICKS} wide={wide} feedMode={feedMode} setFeedMode={changeFeedMode} />;

  const maxWidth = tab === "timeline" ? 660 : 1000;
  const errBanner = error && (
    <div style={{ margin: wide ? "0 0 16px" : `8px ${t.pad}px`, padding: 12, borderRadius: 12, background: t.red + "1e", border: `1px solid ${t.red}55`, fontFamily: t.body, fontSize: 12.5, color: t.red }}>
      Agent error: {error}
    </div>
  );

  // First paint (pre-mount): neutral container to avoid hydration mismatch.
  const baseRoot: React.CSSProperties = { minHeight: "100dvh", background: `radial-gradient(120% 60% at 50% 0%, ${t.bgTop}, ${t.bg} 55%)`, color: t.text };

  if (!mounted) return <div style={baseRoot} />;

  if (wide) {
    return (
      <div style={{ ...baseRoot, height: "100dvh", display: "flex", flexDirection: "row" }}>
        <Sidebar t={t} tab={tab} go={go} alert={alerts.length} trip={trip} />
        <main className="scrollarea" style={{ flex: 1, overflowY: "auto", height: "100dvh" }}>
          <div style={{ maxWidth, margin: "0 auto", width: "100%", padding: "32px 28px 64px" }}>
            {errBanner}
            {screen}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ ...baseRoot, height: "100dvh", display: "flex", flexDirection: "column" }}>
      <MobileHeader t={t} s={schedule} trip={trip} />
      <main className="scrollarea" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {errBanner}
        {screen}
      </main>
      <BottomNav t={t} tab={tab} go={go} alert={alerts.length} />
    </div>
  );
}

function changedSetOf(overrides: Overrides): Set<string> {
  const set = new Set<string>();
  for (const [k, v] of Object.entries(overrides.flightDelay)) if (v !== 0) set.add(k);
  for (const [k, v] of Object.entries(overrides.dur)) if (v !== 0) set.add(k);
  return set;
}
