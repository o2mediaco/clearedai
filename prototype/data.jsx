// data.jsx — Cleared trip model: door-to-door schedule across two countries.
// Everything is derived from leg DURATIONS so the timeline is always self-consistent.
// Exports to window: TRIP, computeSchedule, fmtTime, fmtDur, STATUS, EVENTS

// ── time helpers (minutes-from-midnight) ───────────────────────────────
function fmtTime(min) {
  let m = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60), mm = m % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}
function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

// ── fixed anchors for the example trip (SFO → PVG, 2:00 PM Shanghai mtg) ─
const BASE = {
  now:     7 * 60 + 24,    // 7:24 AM PDT  (day 0)
  board:   9 * 60 + 40,    // 9:40 AM PDT
  depart: 10 * 60 + 10,    // 10:10 AM PDT
  blockMin: 760,           // 12 h 40 m in the air
  land:   11 * 60 + 50,    // 11:50 AM CST (day 1)
  meeting:14 * 60,         // 2:00 PM CST  (day 1)
  gateCushion: 45,         // min at gate before boarding (target)
};

// ── pre-flight legs (United States) ────────────────────────────────────
const PRE = [
  { id: 'ride',     phase: 'us', icon: 'local_taxi',      title: 'Uber to SFO',
    sub: 'Marcus · Toyota Camry · 7GHK402', dur: 26, mode: 'ride',
    source: 'Uber', detail: '4 min pickup wait · no surge', live: true },
  { id: 'curb',     phase: 'us', icon: 'directions_walk', title: 'Curb → check-in',
    sub: 'Intl departures, Level 3', dur: 7, mode: 'walk',
    source: 'SFO map', detail: 'Door 3A to United counters' },
  { id: 'checkin',  phase: 'us', icon: 'badge',           title: 'Check-in & bag drop',
    sub: 'United Premier Access', dur: 14, mode: 'queue',
    source: 'Bag-drop cutoff', detail: 'Closes 8:40 AM · 15 min margin', cutoff: 8 * 60 + 40 },
  { id: 'security', phase: 'us', icon: 'security',        title: 'Security',
    sub: 'TSA PreCheck — Lane 2', dur: 19, mode: 'queue',
    source: 'TSA wait feed', detail: 'Intl checkpoint G · 19 min', live: true },
  { id: 'gateUS',   phase: 'us', icon: 'directions_walk', title: 'Walk to gate G98',
    sub: 'Boarding area G', dur: 11, mode: 'walk',
    source: 'SFO map', detail: '0.4 mi · moving walkways' },
];

// ── post-flight legs (China) ───────────────────────────────────────────
const POST = [
  { id: 'deplane',     phase: 'cn', icon: 'airline_seat_recline_normal', title: 'Deplane & taxi to gate',
    sub: 'PVG Terminal 2', dur: 9, mode: 'walk',
    source: 'Avg wide-body', detail: 'Door open → jet bridge' },
  { id: 'immigration', phase: 'cn', icon: 'fingerprint',    title: 'Immigration',
    sub: 'Foreign passports', dur: 27, mode: 'queue',
    source: 'PVG queue feed', detail: 'e-Channel not eligible · 27 min', live: true },
  { id: 'baggage',     phase: 'cn', icon: 'luggage',        title: 'Baggage claim',
    sub: 'Carousel 14', dur: 16, mode: 'queue',
    source: 'Belt estimate', detail: 'First bags ~16 min after land', live: true },
  { id: 'customs',     phase: 'cn', icon: 'inventory_2',    title: 'Customs',
    sub: 'Nothing to declare', dur: 5, mode: 'queue',
    source: 'Green channel', detail: 'Usually walk-through' },
  { id: 'didi',        phase: 'cn', icon: 'local_taxi',     title: 'Didi to city',
    sub: 'Pickup zone P7', dur: 6, mode: 'ride',
    source: 'Didi', detail: '6 min wait · Express', live: true },
  { id: 'drive',       phase: 'cn', icon: 'directions_car', title: 'Drive to Lujiazui',
    sub: 'S20 → Yan’an E. Tunnel', dur: 22, mode: 'ride',
    source: 'AMap traffic', detail: '38 km · moderate flow', live: true },
  { id: 'walkCN',      phase: 'cn', icon: 'directions_walk', title: 'Walk to meeting',
    sub: 'Shanghai IFC · Tower 2, 8F', dur: 6, mode: 'walk',
    source: 'Building map', detail: 'Lobby → client floor' },
];

const FLIGHT = {
  id: 'flight', phase: 'air', icon: 'flight', code: 'UA857', carrier: 'United',
  from: 'SFO', to: 'PVG', fromCity: 'San Francisco', toCity: 'Shanghai Pudong',
  termFrom: 'Intl G', termTo: 'T2', seat: '14K', gate: 'G98',
};

const MEETING = {
  title: 'Q3 partnership review',
  org: 'Lanson Group',
  place: 'Shanghai IFC · Tower 2, 8F',
  time: BASE.meeting, tz: 'CST',
};

// ── live events the user can fire on the Live screen ────────────────────
// Each event mutates the schedule; arc: 39 → 14 → 0(at-risk) → 9 min buffer.
const EVENTS = [
  { id: 'delay',  time: '7:51 AM', kind: 'flight',
    title: 'UA857 delayed 25 min',
    body: 'New departure 10:35 AM. Gate G98 unchanged.',
    apply: (s) => { s.flightDelay += 25; } },
  { id: 'immig',  time: '11:46 AM', kind: 'queue',
    title: 'PVG immigration backing up',
    body: 'Foreign-passport hall now ~41 min (+14). Two desks just closed.',
    apply: (s) => { s.dur.immigration = (s.dur.immigration || 0) + 14; } },
  { id: 'traffic',time: '12:30 PM', kind: 'traffic',
    title: 'Tunnel cleared · Didi at the curb',
    body: 'Yan’an accident cleared (drive −19) and your Didi is already waiting (−5). Buffer restored.',
    apply: (s) => { s.dur.drive = (s.dur.drive || 0) - 9; s.dur.didi = (s.dur.didi || 0) - 5; } },
];

const STATUS = {
  ontrack: { id: 'ontrack', label: 'On track',  color: '#3ddc84', soft: 'rgba(61,220,132,0.14)' },
  tight:   { id: 'tight',   label: 'Tight',     color: '#f6c454', soft: 'rgba(246,196,84,0.15)' },
  risk:    { id: 'risk',    label: 'At risk',   color: '#ff6f61', soft: 'rgba(255,111,97,0.15)' },
  missed:  { id: 'missed',  label: 'Won’t make it', color: '#ff6f61', soft: 'rgba(255,111,97,0.15)' },
};
function statusFor(buffer) {
  if (buffer < 0)  return STATUS.missed;
  if (buffer < 10) return STATUS.risk;
  if (buffer < 30) return STATUS.tight;
  return STATUS.ontrack;
}

// ── the core: build an absolute-timed schedule from a set of overrides ──
// overrides: { flightDelay:0, dur:{ immigration:+14, ... } } (deltas already applied)
function computeSchedule(state) {
  state = state || { flightDelay: 0, dur: {} };
  const durOf = (leg) => leg.dur + (state.dur[leg.id] || 0);

  const preSum = PRE.reduce((a, l) => a + durOf(l), 0);
  const atGateTarget = BASE.board - BASE.gateCushion;       // 8:55 AM
  const leaveBy = atGateTarget - preSum;                    // 7:38 AM

  // chain pre-flight legs forward from leaveBy
  let t = leaveBy;
  const preLegs = PRE.map((l) => {
    const d = durOf(l);
    const row = { ...l, dur: d, start: t, end: t + d };
    t += d; return row;
  });
  const atGate = t;                                          // arrival at gate
  const gateWait = BASE.board - atGate;                      // cushion before boarding

  // flight
  const depart = BASE.depart + state.flightDelay;
  const land = BASE.land + state.flightDelay;                // delay pushes landing
  const flightLeg = { ...FLIGHT, dur: BASE.blockMin, start: depart, end: land,
                      board: BASE.board + state.flightDelay, delay: state.flightDelay,
                      dayFrom: 0, dayTo: 1 };

  // chain post-flight legs forward from landing
  t = land;
  const postLegs = POST.map((l) => {
    const d = durOf(l);
    const row = { ...l, dur: d, start: t, end: t + d, day: 1 };
    t += d; return row;
  });
  const arrive = t;                                          // arrive at meeting
  const buffer = MEETING.time - arrive;                      // minutes of slack
  const status = statusFor(buffer);

  return {
    leaveBy, atGate, gateWait,
    preLegs, flightLeg, postLegs,
    depart, land, arrive, buffer, status,
    now: BASE.now, board: flightLeg.board, meeting: MEETING.time,
  };
}

// default mutable state (deltas), starts clean
function freshState() { return { flightDelay: 0, dur: {} }; }

Object.assign(window, {
  TRIP: { BASE, PRE, POST, FLIGHT, MEETING, EVENTS },
  computeSchedule, freshState, fmtTime, fmtDur, statusFor, STATUS,
});
