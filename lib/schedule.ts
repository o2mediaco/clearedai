// schedule.ts — absolute-time, multi-flight door-to-door engine.
// All instants are UTC minutes; display converts to a segment's local tz.
// Single source of truth shared by the UI and the agent.

import type {
  Trip,
  Overrides,
  Schedule,
  StatusInfo,
  Tz,
  ComputedLeg,
  ComputedFlight,
  ComputedConnection,
  Leg,
} from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed-offset zones for our routes (June 2026 — no DST surprises). */
export const TZ: Record<string, Tz> = {
  PDT: { label: "PDT", offsetMin: -7 * 60 },
  KST: { label: "KST", offsetMin: 9 * 60 },
  JST: { label: "JST", offsetMin: 9 * 60 }, // Japan Standard Time
  CST: { label: "CST", offsetMin: 8 * 60 }, // China Standard Time
};

/** ISO-with-offset → UTC minutes. */
export function isoToUtcMin(iso: string): number {
  return Math.round(Date.parse(iso) / 60000);
}

export function fmtTime(utcMin: number, tz: Tz): string {
  const local = utcMin + tz.offsetMin;
  const m = (((local % 1440) + 1440) % 1440) | 0;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h < 12 ? "AM" : "PM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
}

export function fmtDate(utcMin: number, tz: Tz): string {
  const d = new Date((utcMin + tz.offsetMin) * 60000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function fmtDur(min: number): string {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Local day index, for "+1d" badges relative to a reference instant. */
export function dayOffset(utcMin: number, tz: Tz, refUtc: number, refTz: Tz): number {
  return Math.floor((utcMin + tz.offsetMin) / 1440) - Math.floor((refUtc + refTz.offsetMin) / 1440);
}

export const STATUS: Record<StatusInfo["id"], StatusInfo> = {
  ontime: { id: "ontime", label: "On schedule", color: "#3ddc84", soft: "rgba(61,220,132,0.14)" },
  minor: { id: "minor", label: "Slight delay", color: "#f6c454", soft: "rgba(246,196,84,0.15)" },
  delayed: { id: "delayed", label: "Delayed", color: "#ff9f43", soft: "rgba(255,159,67,0.16)" },
  major: { id: "major", label: "Major delay", color: "#ff6f61", soft: "rgba(255,111,97,0.15)" },
};

/** ETA status from minutes slipped vs the original plan. */
export function etaStatus(slip: number): StatusInfo {
  if (slip <= 5) return STATUS.ontime;
  if (slip <= 20) return STATUS.minor;
  if (slip <= 60) return STATUS.delayed;
  return STATUS.major;
}

export function freshOverrides(): Overrides {
  return { flightDelay: {}, dur: {} };
}

interface BuildResult {
  leaveByUtc: number;
  preLegs: ComputedLeg[];
  flights: ComputedFlight[];
  connections: ComputedConnection[];
  postLegs: ComputedLeg[];
  arriveUtc: number;
}

function build(trip: Trip, ov: Overrides): BuildResult {
  const flightDelay = (id: string) => ov.flightDelay[id] || 0;
  const durOf = (l: Leg) => l.dur + (ov.dur[l.id] || 0);
  const chain = (legs: Leg[], from: number): ComputedLeg[] => {
    let t = from;
    return legs.map((l) => {
      const d = durOf(l);
      const row: ComputedLeg = { ...l, dur: d, startUtc: t, endUtc: t + d };
      t += d;
      return row;
    });
  };

  // leaveBy: backward from the first flight's boarding
  const f0 = trip.flights[0];
  const actualDepart0 = f0.departUtc + flightDelay(f0.id);
  const board0 = actualDepart0 - trip.boardLeadMin;
  const atGateTarget = board0 - trip.gateCushionMin;
  const preSum = trip.pre.reduce((a, l) => a + durOf(l), 0);
  const leaveByUtc = atGateTarget - preSum;

  const preLegs = chain(trip.pre, leaveByUtc);

  // flights + connections forward
  const flights: ComputedFlight[] = [];
  const connections: ComputedConnection[] = [];
  let prevArrive = 0;

  trip.flights.forEach((f, i) => {
    const blockMin = f.arriveUtc - f.departUtc;
    const schedDepart = f.departUtc + flightDelay(f.id);
    let actualDepart = schedDepart;

    if (i > 0) {
      const conn = trip.connections[i - 1];
      const connLegsSum = conn.legs.reduce((a, l) => a + durOf(l), 0);
      // must be able to finish transfer and board: actualDepart − boardLead ≥ prevArrive + transfer
      const earliest = prevArrive + connLegsSum + trip.boardLeadMin;
      actualDepart = Math.max(schedDepart, earliest);
    }

    const boardUtc = actualDepart - trip.boardLeadMin;
    const actualArrive = actualDepart + blockMin;

    flights.push({
      ...f,
      boardUtc,
      actualDepartUtc: actualDepart,
      actualArriveUtc: actualArrive,
      blockMin,
      delay: actualArrive - f.arriveUtc,
    });

    if (i > 0) {
      const conn = trip.connections[i - 1];
      const clegs = chain(conn.legs, prevArrive);
      connections.push({
        ...conn,
        arriveUtc: prevArrive,
        departUtc: actualDepart,
        layoverMin: actualDepart - prevArrive,
        legs: clegs,
        tight: actualDepart - prevArrive < trip.minConnectionMin,
      });
    }

    prevArrive = actualArrive;
  });

  const postLegs = chain(trip.post, prevArrive);
  const arriveUtc = postLegs.length ? postLegs[postLegs.length - 1].endUtc : prevArrive;

  return { leaveByUtc, preLegs, flights, connections, postLegs, arriveUtc };
}

export function computeSchedule(trip: Trip, overrides?: Overrides): Schedule {
  const ov = overrides ?? freshOverrides();
  const full = build(trip, ov);
  const baselineArriveUtc = build(trip, freshOverrides()).arriveUtc;
  const slip = full.arriveUtc - baselineArriveUtc;

  return {
    ...full,
    baselineArriveUtc,
    slip,
    status: etaStatus(slip),
    deadlineUtc: trip.deadlineUtc,
    buffer: trip.deadlineUtc != null ? trip.deadlineUtc - full.arriveUtc : null,
  };
}
