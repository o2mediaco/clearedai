// trip.ts — the seed itinerary: LAX → ICN (KE012) → NRT Tokyo (OZ104), with a
// 7h20m Seoul layover. ETA-only (no hard deadline). Flight anchors are real
// scheduled times for Jun 20–22, 2026, expressed as ISO-with-offset and
// converted to UTC minutes so the multi-day / multi-timezone math is correct.

import type { Trip } from "./types";
import { TZ, isoToUtcMin } from "./schedule";

export const SEED_TRIP: Trip = {
  origin: { code: "LAX", city: "Los Angeles", tz: TZ.PDT },
  destination: { code: "NRT", city: "Tokyo", place: "Shibuya · central Tokyo", tz: TZ.JST },

  // ── departure side (LAX, international, checked bag, TSA PreCheck) ──
  pre: [
    { id: "ride", phase: "depart", icon: "local_taxi", title: "Uber to LAX",
      sub: "Newport Beach → LAX", dur: 70, mode: "ride", tz: TZ.PDT,
      source: "Google Routes", detail: "Live traffic · 2807 Villa Way → LAX", live: true, feed: "traffic",
      from: { lat: 33.6080, lng: -117.9290 }, to: { lat: 33.9416, lng: -118.4085 } },
    { id: "curb", phase: "depart", icon: "directions_walk", title: "Curb → check-in",
      sub: "Tom Bradley Intl (Terminal B)", dur: 8, mode: "walk", tz: TZ.PDT,
      source: "LAX map", detail: "Departures level → Korean Air row" },
    { id: "checkin", phase: "depart", icon: "badge", title: "Check-in & bag drop",
      sub: "Korean Air · Prestige", dur: 22, mode: "queue", tz: TZ.PDT,
      source: "Intl bag-drop cutoff", detail: "Intl counters close 60 min before departure" },
    { id: "security", phase: "depart", icon: "security", title: "Security",
      sub: "TSA PreCheck — TBIT", dur: 17, mode: "queue", tz: TZ.PDT,
      source: "TSA wait feed", detail: "TBIT checkpoint · 17 min", live: true, feed: "security_wait" },
    { id: "gateLAX", phase: "depart", icon: "directions_walk", title: "Walk to gate",
      sub: "TBIT boarding area", dur: 12, mode: "walk", tz: TZ.PDT,
      source: "LAX map", detail: "Concourse walk to KE012 gate" },
  ],

  flights: [
    { id: "KE012", code: "KE012", carrier: "Korean Air", aircraft: "A380-800",
      fromCode: "LAX", fromCity: "Los Angeles", fromTerm: "Terminal B", fromTz: TZ.PDT,
      toCode: "ICN", toCity: "Seoul Incheon", toTerm: "T2", toTz: TZ.KST,
      departUtc: isoToUtcMin("2026-06-20T23:50:00-07:00"),
      arriveUtc: isoToUtcMin("2026-06-22T05:00:00+09:00"),
      seat: "15A", feed: "flight_status" },
    { id: "OZ104", code: "OZ104", carrier: "Asiana Airlines", aircraft: "A321-neo",
      fromCode: "ICN", fromCity: "Seoul Incheon", fromTerm: "T2", fromTz: TZ.KST,
      toCode: "NRT", toCity: "Tokyo Narita", toTerm: "T1", toTz: TZ.JST,
      departUtc: isoToUtcMin("2026-06-22T12:20:00+09:00"),
      arriveUtc: isoToUtcMin("2026-06-22T14:55:00+09:00"),
      seat: "2A", feed: "flight_status" },
  ],

  // ── connection at Seoul Incheon (stay airside; the 7h20m is the implicit gap) ──
  connections: [
    { id: "icn", airportCode: "ICN", city: "Seoul Incheon", term: "T2", tz: TZ.KST,
      legs: [
        { id: "deplaneICN", phase: "connection", icon: "airline_seat_recline_normal",
          title: "Deplane KE012", sub: "ICN Terminal 2", dur: 10, mode: "walk", tz: TZ.KST,
          source: "Avg wide-body", detail: "Door open → concourse" },
        { id: "transferICN", phase: "connection", icon: "transfer_within_a_station",
          title: "Transfer to OZ104 gate", sub: "Same terminal (T2)", dur: 15, mode: "walk", tz: TZ.KST,
          source: "ICN map", detail: "Airside transfer · no re-entry" },
      ] },
  ],

  // ── arrival side (Tokyo Narita, international → city) ──
  post: [
    { id: "deplaneNRT", phase: "arrive", icon: "airline_seat_recline_normal", title: "Deplane & taxi to gate",
      sub: "NRT Terminal 1", dur: 9, mode: "walk", tz: TZ.JST,
      source: "Avg narrow-body", detail: "Door open → jet bridge" },
    { id: "immigration", phase: "arrive", icon: "fingerprint", title: "Immigration",
      sub: "Foreign passports", dur: 25, mode: "queue", tz: TZ.JST,
      source: "NRT queue feed", detail: "Foreign-passport hall · 25 min", live: true, feed: "immigration_wait" },
    { id: "baggage", phase: "arrive", icon: "luggage", title: "Baggage claim",
      sub: "Carousel — OZ104", dur: 16, mode: "queue", tz: TZ.JST,
      source: "Belt estimate", detail: "First bags ~16 min after land", live: true, feed: "baggage_estimate" },
    { id: "customs", phase: "arrive", icon: "inventory_2", title: "Customs",
      sub: "Nothing to declare", dur: 6, mode: "queue", tz: TZ.JST,
      source: "Green channel", detail: "Usually walk-through" },
    { id: "uber", phase: "arrive", icon: "local_taxi", title: "Uber pickup",
      sub: "Arrivals · rideshare bay", dur: 8, mode: "ride", tz: TZ.JST,
      source: "Uber", detail: "8 min wait · Uber", live: true, feed: "traffic" },
    { id: "drive", phase: "arrive", icon: "directions_car", title: "Drive to Shibuya",
      sub: "Higashi-Kantō Expwy → Shibuya", dur: 75, mode: "ride", tz: TZ.JST,
      source: "Maps traffic", detail: "~70 km · moderate flow", live: true, feed: "traffic",
      from: { lat: 35.7647, lng: 140.3863 }, to: { lat: 35.6595, lng: 139.7004 } },
    { id: "walkNRT", phase: "arrive", icon: "directions_walk", title: "Walk to destination",
      sub: "Shibuya · central Tokyo", dur: 6, mode: "walk", tz: TZ.JST,
      source: "Building map", detail: "Drop-off → entrance" },
  ],

  boardLeadMin: 45, // international boarding starts ~45 min before departure
  gateCushionMin: 30, // target buffer at the gate before boarding
  minConnectionMin: 90, // minimum viable international connection
  deadlineUtc: null, // ETA-only: no hard deadline
};
