// feeds.ts — the data feeds the agent senses. Hybrid by design:
// FEED_MODE=mock (default) plays a deterministic disruption arc so the demo is
// reliable; FEED_MODE=real attempts a live API (flight status wired) and falls
// back to mock per-feed when a key or datapoint is missing.

import type { FeedId, FeedReading, Overrides, Trip } from "../types";

export interface FeedDef {
  id: FeedId;
  label: string;
  /** what the agent should understand this feed measures */
  description: string;
  /** deterministic mock arc: returns readings only on the tick it has news */
  pollMock: (tick: number, ov: Overrides) => FeedReading[];
  /** optional live implementation; throws to signal "fall back to mock" */
  pollReal?: (trip: Trip, ov: Overrides) => Promise<FeedReading[]>;
}

function reading(
  feed: FeedId,
  target: string,
  value: number,
  previous: number,
  source: "real" | "mock",
  note: string
): FeedReading {
  return { feed, target, value, previous, source, note };
}

// ── deterministic disruption arc (buffer: 39 → 14 → 0 → 14) ─────────────
export const FEEDS: FeedDef[] = [
  {
    id: "flight_status",
    label: "UA857 status",
    description: "Departure delay in minutes for flight UA857 (writes flightDelay).",
    pollMock: (tick, ov) =>
      tick === 1 && ov.flightDelay !== 25
        ? [reading("flight_status", "flightDelay", 25, ov.flightDelay, "mock",
            "United pushed UA857 to 10:35 AM departure (+25 min). Gate G98 unchanged.")]
        : [],
    // FlightAware AeroAPI — https://www.flightaware.com/aeroapi/portal/documentation
    pollReal: async (trip, ov) => {
      const key =
        process.env.AERO_API_KEY ||
        process.env.AEROAPI_KEY ||
        process.env.FLIGHTAWARE_API_KEY ||
        process.env.aero_api_key;
      if (!key) throw new Error("no aeroapi key");
      const ident = trip.flight.code; // e.g. UA857
      const res = await fetch(
        `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(ident)}`,
        { headers: { "x-apikey": key, Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`aeroapi ${res.status}`);
      const data = await res.json();
      const f = data?.flights?.[0];
      if (!f) throw new Error("aeroapi: no flight found");
      // AeroAPI returns departure_delay in seconds; fall back to estimated−scheduled.
      let delayMin = 0;
      if (typeof f.departure_delay === "number") {
        delayMin = Math.round(f.departure_delay / 60);
      } else if (f.estimated_out && f.scheduled_out) {
        delayMin = Math.round((Date.parse(f.estimated_out) - Date.parse(f.scheduled_out)) / 60000);
      }
      delayMin = Math.max(0, delayMin);
      return delayMin !== ov.flightDelay
        ? [reading("flight_status", "flightDelay", delayMin, ov.flightDelay, "real",
            `Live (AeroAPI): ${ident} departure delay ${delayMin} min.`)]
        : [];
    },
  },
  {
    id: "security_wait",
    label: "SFO security",
    description: "TSA checkpoint G wait time delta in minutes (writes leg 'security').",
    pollMock: () => [],
  },
  {
    id: "immigration_wait",
    label: "PVG immigration",
    description: "Foreign-passport hall wait delta in minutes (writes leg 'immigration').",
    pollMock: (tick, ov) =>
      tick === 2 && (ov.dur.immigration || 0) !== 14
        ? [reading("immigration_wait", "immigration", 14, ov.dur.immigration || 0, "mock",
            "PVG foreign-passport hall now ~41 min (+14). Two desks just closed.")]
        : [],
  },
  {
    id: "baggage_estimate",
    label: "Baggage belt",
    description: "Carousel 14 first-bag estimate delta in minutes (writes leg 'baggage').",
    pollMock: () => [],
  },
  {
    id: "traffic",
    label: "Shanghai traffic",
    description: "Drive + rideshare conditions to Lujiazui (writes legs 'drive' and 'didi').",
    pollMock: (tick, ov) =>
      tick === 3 && (ov.dur.drive || 0) !== -9
        ? [
            reading("traffic", "drive", -9, ov.dur.drive || 0, "mock",
              "Yan’an E. Tunnel accident cleared — drive −9 min."),
            reading("traffic", "didi", -5, ov.dur.didi || 0, "mock",
              "Express Didi already waiting at curb P7 — pickup −5 min."),
          ]
        : [],
  },
];

export const FEED_BY_ID: Record<FeedId, FeedDef> = Object.fromEntries(
  FEEDS.map((f) => [f.id, f])
) as Record<FeedId, FeedDef>;

export function cloneOverrides(ov: Overrides): Overrides {
  return { flightDelay: ov.flightDelay, dur: { ...ov.dur } };
}

export function applyReadings(ov: Overrides, readings: FeedReading[]): Overrides {
  const next = cloneOverrides(ov);
  for (const r of readings) {
    if (r.target === "flightDelay") next.flightDelay = r.value;
    else next.dur[r.target] = r.value;
  }
  return next;
}

/** Sense the world: poll every live feed once. */
export async function senseFeeds(trip: Trip, ov: Overrides, tick: number): Promise<FeedReading[]> {
  const real = process.env.FEED_MODE === "real";
  const out: FeedReading[] = [];
  for (const f of FEEDS) {
    let got: FeedReading[] = [];
    if (real && f.pollReal) {
      try {
        got = await f.pollReal(trip, ov);
      } catch {
        got = f.pollMock(tick, ov);
      }
    } else {
      got = f.pollMock(tick, ov);
    }
    out.push(...got);
  }
  return out;
}
