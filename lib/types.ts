// Shared domain types for Cleared. Multi-flight, absolute-time model.
// All instants are UTC minutes (minutes since the Unix epoch, /60000), so the
// engine is correct across timezones, the date line, and multi-day journeys.
// Display converts to a segment's local timezone via Tz.offsetMin.

export type Tab = "today" | "timeline" | "live";

/** A fixed-offset timezone (June 2026 — no DST ambiguity for our routes). */
export interface Tz {
  label: string; // e.g. "PDT", "KST", "CST"
  offsetMin: number; // minutes from UTC, e.g. -420 for PDT
}

export type Phase = "depart" | "connection" | "arrive";
export type LegMode = "ride" | "walk" | "queue" | "wait";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type FeedId =
  | "flight_status"
  | "security_wait"
  | "immigration_wait"
  | "baggage_estimate"
  | "traffic";

/** A single door-to-door ground leg (a drive, a queue, a walk, a transfer). */
export interface Leg {
  id: string;
  phase: Phase;
  icon: string;
  title: string;
  sub: string;
  /** base duration in minutes (before any live override) */
  dur: number;
  mode: LegMode;
  source: string;
  detail: string;
  /** whether a live feed watches this leg */
  live?: boolean;
  /** the agent feed that can update this leg */
  feed?: FeedId;
  /** timezone the leg's clock times display in */
  tz: Tz;
  /** drive legs: endpoints for live traffic (Google Routes) */
  from?: GeoPoint;
  to?: GeoPoint;
}

/** A flight segment with scheduled absolute times. */
export interface FlightSeg {
  id: string; // "KE012"
  code: string;
  carrier: string;
  aircraft?: string;
  fromCode: string;
  fromCity: string;
  fromTerm: string;
  fromTz: Tz;
  toCode: string;
  toCity: string;
  toTerm: string;
  toTz: Tz;
  /** scheduled departure / arrival, UTC minutes */
  departUtc: number;
  arriveUtc: number;
  seat?: string;
  /** the feed that updates this flight's delay */
  feed?: FeedId;
}

/** A connection/layover between two flights at a hub. */
export interface Connection {
  id: string;
  airportCode: string;
  city: string;
  term: string;
  tz: Tz;
  /** transfer legs (deplane, walk); the long wait is the implicit gap */
  legs: Leg[];
}

export interface Trip {
  origin: { code: string; city: string; tz: Tz };
  destination: { code: string; city: string; place: string; tz: Tz };
  pre: Leg[]; // departure side (before flight 1)
  flights: FlightSeg[]; // ordered
  connections: Connection[]; // length = flights.length - 1
  post: Leg[]; // arrival side (after last flight)
  boardLeadMin: number; // departure − boarding
  gateCushionMin: number; // target minutes at gate before boarding
  minConnectionMin: number; // minimum viable connection time at a hub
  deadlineUtc: number | null; // a hard deadline for verdict mode; null = ETA-only
}

/** Accumulated live deltas on top of the base trip. */
export interface Overrides {
  /** per-flight departure delay in minutes, keyed by flight id */
  flightDelay: Record<string, number>;
  /** per-leg duration deltas in minutes, keyed by leg id */
  dur: Record<string, number>;
}

export interface StatusInfo {
  id: "ontime" | "minor" | "delayed" | "major";
  label: string;
  color: string;
  soft: string;
}

export interface ComputedLeg extends Leg {
  startUtc: number;
  endUtc: number;
}

export interface ComputedFlight extends FlightSeg {
  boardUtc: number;
  actualDepartUtc: number;
  actualArriveUtc: number;
  /** scheduled airborne minutes */
  blockMin: number;
  /** total delay vs schedule at arrival (min) */
  delay: number;
}

export interface ComputedConnection extends Connection {
  arriveUtc: number; // when you land at the hub
  departUtc: number; // when the next flight actually departs
  layoverMin: number;
  legs: ComputedLeg[];
  tight: boolean; // layover below minConnectionMin
}

export interface Schedule {
  leaveByUtc: number;
  preLegs: ComputedLeg[];
  flights: ComputedFlight[];
  connections: ComputedConnection[];
  postLegs: ComputedLeg[];
  /** final arrival at the destination, UTC minutes */
  arriveUtc: number;
  /** arrival with zero overrides (the original plan) */
  baselineArriveUtc: number;
  /** minutes later than baseline (negative = ahead of plan) */
  slip: number;
  status: StatusInfo;
  /** deadline mode (null for ETA-only trips) */
  deadlineUtc: number | null;
  buffer: number | null;
}

// ── Agent / feed types ────────────────────────────────────────────────
/** What a single feed poll returned. */
export interface FeedReading {
  feed: FeedId;
  /** "flight" → target is a flight id; "leg" → target is a leg id */
  scope: "flight" | "leg";
  target: string;
  /** new absolute override value (replaces, not adds) */
  value: number;
  previous: number;
  source: "real" | "mock";
  note: string;
}

export interface AgentAlert {
  title: string;
  body: string;
  severity: "info" | "warn" | "critical";
}

export type Severity = "none" | "low" | "med" | "high" | "critical";

/** A machine action the Comm/Action agent stages on the user's behalf. */
export interface AgentAction {
  type: string; // "rideshare" | "message" | "calendar" | ...
  label: string;
  detail: string;
}

export interface RouterOut {
  severity: Severity;
  engage: boolean;
  strategy: string;
  affected: FeedId[];
}

export interface AnalystOut {
  bottleneck: string;
  etaSummary: string;
  narrative: string;
  risks: string[];
}

export interface CommOut {
  alert: AgentAlert | null;
  actions: AgentAction[];
}

export interface PipelineTrace {
  router: RouterOut;
  analyst: AnalystOut | null;
  comm: CommOut | null;
  /** per-step provenance: did Gemma produce it, or did we fall back to the
   *  deterministic worker (e.g. Gemma returned unparseable JSON)? */
  via: { router: "gemma" | "mock"; analyst: "gemma" | "mock"; comm: "gemma" | "mock" };
}

export interface AgentTickRequest {
  overrides: Overrides;
  tick: number;
  feedMode?: "real" | "mock";
}

export interface AgentTickResponse {
  reasoning: string;
  polled: FeedId[];
  readings: FeedReading[];
  overrides: Overrides;
  /** final arrival before / after this tick (UTC minutes) */
  arriveBefore: number;
  arriveAfter: number;
  /** slip vs plan before / after */
  slipBefore: number;
  slipAfter: number;
  status: StatusInfo;
  alert: AgentAlert | null;
  actions: AgentAction[];
  pipeline: PipelineTrace;
  engine: "gemma" | "mock";
  model?: string;
}
