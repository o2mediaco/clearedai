// feeds.ts — the data feeds the agent senses. Hybrid: FEED_MODE=mock (default)
// plays a deterministic 4-beat arc; FEED_MODE=real attempts live APIs
// (FlightAware for flights, Google Routes for traffic) and falls back to mock.
//
// The arc is designed to show the agent's *judgment*:
//   1. KE012 +95 min  → absorbed by the 15h Seoul layover → arrival UNCHANGED
//   2. KE863 +50 min  → directly slips arrival              → escalate
//   3. PEK immigration +20 → slips further                  → major
//   4. Beijing traffic clears (−30) → partial recovery

import type { FeedId, FeedReading, Overrides, Trip } from "../types";

export interface FeedDef {
  id: FeedId;
  label: string;
  description: string;
  pollMock: (tick: number, ov: Overrides) => FeedReading[];
  pollReal?: (trip: Trip, ov: Overrides) => Promise<FeedReading[]>;
}

function reading(
  feed: FeedId,
  scope: "flight" | "leg",
  target: string,
  value: number,
  previous: number,
  source: "real" | "mock",
  note: string
): FeedReading {
  return { feed, scope, target, value, previous, source, note };
}

export const FEEDS: FeedDef[] = [
  {
    id: "flight_status",
    label: "Flight status",
    description: "Departure delay (min) for KE012 (LAX→ICN) and OZ104 (ICN→NRT).",
    pollMock: (tick, ov) => {
      if (tick === 1 && (ov.flightDelay.KE012 || 0) !== 95)
        return [reading("flight_status", "flight", "KE012", 95, ov.flightDelay.KE012 || 0, "mock",
          "Korean Air KE012 (LAX→ICN) delayed 95 min — weather hold at LAX.")];
      if (tick === 2 && (ov.flightDelay.OZ104 || 0) !== 50)
        return [reading("flight_status", "flight", "OZ104", 50, ov.flightDelay.OZ104 || 0, "mock",
          "Asiana OZ104 (ICN→NRT) now departing 13:10 KST (+50 min).")];
      return [];
    },
    // FlightAware AeroAPI — https://www.flightaware.com/aeroapi/portal/documentation
    pollReal: async (trip, ov) => {
      const key =
        process.env.AERO_API_KEY ||
        process.env.AEROAPI_KEY ||
        process.env.FLIGHTAWARE_API_KEY ||
        process.env.aero_api_key;
      if (!key) throw new Error("no aeroapi key");
      const out: FeedReading[] = [];
      for (const f of trip.flights) {
        try {
          const res = await fetch(
            `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(f.code)}`,
            { headers: { "x-apikey": key, Accept: "application/json" }, cache: "no-store" }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const fl = data?.flights?.[0];
          if (!fl) continue;
          let delayMin = 0;
          if (typeof fl.departure_delay === "number") delayMin = Math.round(fl.departure_delay / 60);
          else if (fl.estimated_out && fl.scheduled_out)
            delayMin = Math.round((Date.parse(fl.estimated_out) - Date.parse(fl.scheduled_out)) / 60000);
          delayMin = Math.max(0, delayMin);
          if ((ov.flightDelay[f.id] || 0) !== delayMin)
            out.push(reading("flight_status", "flight", f.id, delayMin, ov.flightDelay[f.id] || 0, "real",
              `Live (AeroAPI): ${f.code} departure delay ${delayMin} min.`));
        } catch {
          /* skip this flight */
        }
      }
      if (out.length === 0) throw new Error("no flight change");
      return out;
    },
  },
  {
    id: "security_wait",
    label: "LAX security",
    description: "TSA TBIT wait delta (min) for the 'security' leg.",
    pollMock: () => [],
  },
  {
    id: "immigration_wait",
    label: "NRT immigration",
    description: "Narita foreign-passport hall wait delta (min) for the 'immigration' leg.",
    pollMock: (tick, ov) =>
      tick === 3 && (ov.dur.immigration || 0) !== 20
        ? [reading("immigration_wait", "leg", "immigration", 20, ov.dur.immigration || 0, "mock",
            "NRT foreign-passport hall now ~45 min (+20). Two desks just closed.")]
        : [],
  },
  {
    id: "baggage_estimate",
    label: "Baggage belt",
    description: "PEK carousel first-bag estimate delta (min) for the 'baggage' leg.",
    pollMock: () => [],
  },
  {
    id: "traffic",
    label: "Tokyo traffic",
    description: "Drive + rideshare to central Tokyo (writes legs 'drive' and 'uber').",
    pollMock: (tick, ov) =>
      tick === 4 && (ov.dur.drive || 0) !== -25
        ? [
            reading("traffic", "leg", "drive", -25, ov.dur.drive || 0, "mock",
              "Higashi-Kantō Expwy clears — drive to Shibuya −25 min."),
            reading("traffic", "leg", "uber", -5, ov.dur.uber || 0, "mock",
              "Uber already at the rideshare bay — pickup −5 min."),
          ]
        : [],
    // Google Routes API — traffic-aware drive time for legs with coordinates.
    pollReal: async (trip, ov) => {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) throw new Error("no maps key");
      const driveLegs = [...trip.pre, ...trip.post].filter((l) => l.feed === "traffic" && l.from && l.to);
      const out: FeedReading[] = [];
      for (const l of driveLegs) {
        try {
          const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": key,
              "X-Goog-FieldMask": "routes.duration",
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: l.from!.lat, longitude: l.from!.lng } } },
              destination: { location: { latLng: { latitude: l.to!.lat, longitude: l.to!.lng } } },
              travelMode: "DRIVE",
              routingPreference: "TRAFFIC_AWARE",
            }),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const dur: string | undefined = data?.routes?.[0]?.duration; // "1234s"
          if (!dur) continue;
          const mins = Math.round(parseInt(dur, 10) / 60);
          const delta = mins - l.dur;
          if ((ov.dur[l.id] || 0) !== delta)
            out.push(reading("traffic", "leg", l.id, delta, ov.dur[l.id] || 0, "real",
              `Live (Google Routes): ${l.title} ~${mins} min.`));
        } catch {
          /* skip this leg */
        }
      }
      if (out.length === 0) throw new Error("no traffic change");
      return out;
    },
  },
];

export function cloneOverrides(ov: Overrides): Overrides {
  return { flightDelay: { ...ov.flightDelay }, dur: { ...ov.dur } };
}

export function applyReadings(ov: Overrides, readings: FeedReading[]): Overrides {
  const next = cloneOverrides(ov);
  for (const r of readings) {
    if (r.scope === "flight") next.flightDelay[r.target] = r.value;
    else next.dur[r.target] = r.value;
  }
  return next;
}

/** Sense the world: poll every feed once. `real` selects live APIs vs the mock arc. */
export async function senseFeeds(trip: Trip, ov: Overrides, tick: number, real: boolean): Promise<FeedReading[]> {
  const out: FeedReading[] = [];
  for (const f of FEEDS) {
    let got: FeedReading[] = [];
    if (real) {
      // Live mode is real-only: a feed emits data ONLY from its live source.
      // No mock fallback — if there's no live source, or the live call errors or
      // returns nothing, the feed stays silent (no scripted/fake data).
      if (f.pollReal) {
        try {
          got = await f.pollReal(trip, ov);
        } catch {
          got = [];
        }
      }
    } else {
      got = f.pollMock(tick, ov);
    }
    out.push(...got);
  }
  return out;
}
