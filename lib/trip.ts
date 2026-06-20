// trip.ts — the seed trip (SFO → PVG, 2:00 PM Shanghai meeting).
// Local-first MVP: this is the default trip the app loads. Each live leg is
// tagged with the agent `feed` that can update it.

import type { Trip } from "./types";

export const SEED_TRIP: Trip = {
  base: {
    now: 7 * 60 + 24, // 7:24 AM PDT
    board: 9 * 60 + 40, // 9:40 AM PDT
    depart: 10 * 60 + 10, // 10:10 AM PDT
    blockMin: 760, // 12h40m airborne
    land: 11 * 60 + 50, // 11:50 AM CST (next day)
    meeting: 14 * 60, // 2:00 PM CST
    gateCushion: 45,
  },
  pre: [
    { id: "ride", phase: "us", icon: "local_taxi", title: "Uber to SFO",
      sub: "Marcus · Toyota Camry · 7GHK402", dur: 26, mode: "ride",
      source: "Uber", detail: "4 min pickup wait · no surge", live: true, feed: "traffic" },
    { id: "curb", phase: "us", icon: "directions_walk", title: "Curb → check-in",
      sub: "Intl departures, Level 3", dur: 7, mode: "walk",
      source: "SFO map", detail: "Door 3A to United counters" },
    { id: "checkin", phase: "us", icon: "badge", title: "Check-in & bag drop",
      sub: "United Premier Access", dur: 14, mode: "queue",
      source: "Bag-drop cutoff", detail: "Closes 8:40 AM · 15 min margin" },
    { id: "security", phase: "us", icon: "security", title: "Security",
      sub: "TSA PreCheck — Lane 2", dur: 19, mode: "queue",
      source: "TSA wait feed", detail: "Intl checkpoint G · 19 min", live: true, feed: "security_wait" },
    { id: "gateUS", phase: "us", icon: "directions_walk", title: "Walk to gate G98",
      sub: "Boarding area G", dur: 11, mode: "walk",
      source: "SFO map", detail: "0.4 mi · moving walkways" },
  ],
  flight: {
    id: "flight", phase: "air", icon: "flight", code: "UA857", carrier: "United",
    from: "SFO", to: "PVG", fromCity: "San Francisco", toCity: "Shanghai Pudong",
    termFrom: "Intl G", termTo: "T2", seat: "14K", gate: "G98",
  },
  post: [
    { id: "deplane", phase: "cn", icon: "airline_seat_recline_normal", title: "Deplane & taxi to gate",
      sub: "PVG Terminal 2", dur: 9, mode: "walk",
      source: "Avg wide-body", detail: "Door open → jet bridge" },
    { id: "immigration", phase: "cn", icon: "fingerprint", title: "Immigration",
      sub: "Foreign passports", dur: 27, mode: "queue",
      source: "PVG queue feed", detail: "e-Channel not eligible · 27 min", live: true, feed: "immigration_wait" },
    { id: "baggage", phase: "cn", icon: "luggage", title: "Baggage claim",
      sub: "Carousel 14", dur: 16, mode: "queue",
      source: "Belt estimate", detail: "First bags ~16 min after land", live: true, feed: "baggage_estimate" },
    { id: "customs", phase: "cn", icon: "inventory_2", title: "Customs",
      sub: "Nothing to declare", dur: 5, mode: "queue",
      source: "Green channel", detail: "Usually walk-through" },
    { id: "didi", phase: "cn", icon: "local_taxi", title: "Didi to city",
      sub: "Pickup zone P7", dur: 6, mode: "ride",
      source: "Didi", detail: "6 min wait · Express", live: true, feed: "traffic" },
    { id: "drive", phase: "cn", icon: "directions_car", title: "Drive to Lujiazui",
      sub: "S20 → Yan’an E. Tunnel", dur: 22, mode: "ride",
      source: "AMap traffic", detail: "38 km · moderate flow", live: true, feed: "traffic" },
    { id: "walkCN", phase: "cn", icon: "directions_walk", title: "Walk to meeting",
      sub: "Shanghai IFC · Tower 2, 8F", dur: 6, mode: "walk",
      source: "Building map", detail: "Lobby → client floor" },
  ],
  meeting: {
    title: "Q3 partnership review",
    org: "Lanson Group",
    place: "Shanghai IFC · Tower 2, 8F",
    time: 14 * 60,
    tz: "CST",
  },
};
