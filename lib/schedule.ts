// schedule.ts — the deterministic door-to-door schedule engine.
// Ported from the prototype's data.jsx. Given a Trip and a set of Overrides
// (live deltas), it produces an absolute-timed schedule and a buffer/status.
// This is the single source of truth shared by the UI and the agent.

import type {
  Trip,
  Overrides,
  Schedule,
  StatusInfo,
  ComputedLeg,
  ComputedFlight,
} from "./types";

export function fmtTime(min: number): string {
  const m = (((min % 1440) + 1440) % 1440) | 0;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h < 12 ? "AM" : "PM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
}

export function fmtDur(min: number): string {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export const STATUS: Record<StatusInfo["id"], StatusInfo> = {
  ontrack: { id: "ontrack", label: "On track", color: "#3ddc84", soft: "rgba(61,220,132,0.14)" },
  tight: { id: "tight", label: "Tight", color: "#f6c454", soft: "rgba(246,196,84,0.15)" },
  risk: { id: "risk", label: "At risk", color: "#ff6f61", soft: "rgba(255,111,97,0.15)" },
  missed: { id: "missed", label: "Won’t make it", color: "#ff6f61", soft: "rgba(255,111,97,0.15)" },
};

export function statusFor(buffer: number): StatusInfo {
  if (buffer < 0) return STATUS.missed;
  if (buffer < 10) return STATUS.risk;
  if (buffer < 30) return STATUS.tight;
  return STATUS.ontrack;
}

export function freshOverrides(): Overrides {
  return { flightDelay: 0, dur: {} };
}

export function computeSchedule(trip: Trip, overrides?: Overrides): Schedule {
  const state: Overrides = overrides ?? freshOverrides();
  const durOf = (legId: string, base: number) => base + (state.dur[legId] || 0);

  const { base, pre, flight, post, meeting } = trip;

  const preSum = pre.reduce((a, l) => a + durOf(l.id, l.dur), 0);
  const atGateTarget = base.board - base.gateCushion;
  const leaveBy = atGateTarget - preSum;

  let t = leaveBy;
  const preLegs: ComputedLeg[] = pre.map((l) => {
    const d = durOf(l.id, l.dur);
    const row: ComputedLeg = { ...l, dur: d, start: t, end: t + d };
    t += d;
    return row;
  });
  const atGate = t;
  const gateWait = base.board - atGate;

  const depart = base.depart + state.flightDelay;
  const land = base.land + state.flightDelay;
  const flightLeg: ComputedFlight = {
    ...flight,
    dur: base.blockMin,
    start: depart,
    end: land,
    board: base.board + state.flightDelay,
    delay: state.flightDelay,
  };

  t = land;
  const postLegs: ComputedLeg[] = post.map((l) => {
    const d = durOf(l.id, l.dur);
    const row: ComputedLeg = { ...l, dur: d, start: t, end: t + d, day: 1 };
    t += d;
    return row;
  });

  const arrive = t;
  const buffer = meeting.time - arrive;
  const status = statusFor(buffer);

  return {
    leaveBy,
    atGate,
    gateWait,
    preLegs,
    flightLeg,
    postLegs,
    depart,
    land,
    arrive,
    buffer,
    status,
    now: base.now,
    board: flightLeg.board,
    meeting: meeting.time,
  };
}
