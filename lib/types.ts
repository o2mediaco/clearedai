// Shared domain types for Cleared. Used by both the client UI and the
// server-side agent so the schedule is computed from one source of truth.

export type Phase = "us" | "air" | "cn";
export type LegMode = "ride" | "walk" | "queue";
export type Tab = "today" | "timeline" | "live";

/** A single door-to-door leg (a drive, a queue, a walk). */
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
  /** id of the agent tool/feed that can update this leg */
  feed?: FeedId;
}

export interface Flight {
  id: "flight";
  phase: "air";
  icon: string;
  code: string;
  carrier: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  termFrom: string;
  termTo: string;
  seat: string;
  gate: string;
}

export interface Meeting {
  title: string;
  org: string;
  place: string;
  /** minutes-from-midnight, destination tz */
  time: number;
  tz: string;
}

export interface TripBase {
  now: number;
  board: number;
  depart: number;
  blockMin: number;
  land: number;
  meeting: number;
  gateCushion: number;
}

export interface Trip {
  base: TripBase;
  pre: Leg[];
  flight: Flight;
  post: Leg[];
  meeting: Meeting;
}

/** Accumulated live deltas applied on top of the base trip. */
export interface Overrides {
  /** minutes the flight is delayed */
  flightDelay: number;
  /** per-leg duration deltas keyed by leg id */
  dur: Record<string, number>;
}

export interface StatusInfo {
  id: "ontrack" | "tight" | "risk" | "missed";
  label: string;
  color: string;
  soft: string;
}

export interface ComputedLeg extends Leg {
  start: number;
  end: number;
  day?: number;
}

export interface ComputedFlight extends Flight {
  dur: number;
  start: number;
  end: number;
  board: number;
  delay: number;
}

export interface Schedule {
  leaveBy: number;
  atGate: number;
  gateWait: number;
  preLegs: ComputedLeg[];
  flightLeg: ComputedFlight;
  postLegs: ComputedLeg[];
  depart: number;
  land: number;
  arrive: number;
  /** minutes of slack before the meeting (negative = late) */
  buffer: number;
  status: StatusInfo;
  now: number;
  board: number;
  meeting: number;
}

// ── Agent / feed types ────────────────────────────────────────────────
export type FeedId =
  | "flight_status"
  | "traffic"
  | "security_wait"
  | "immigration_wait"
  | "baggage_estimate";

/** What a single feed poll returned. */
export interface FeedReading {
  feed: FeedId;
  /** which override field this writes: "flightDelay" or a leg id */
  target: string;
  /** new absolute value for the override (replaces, not adds) */
  value: number;
  /** previous override value, for diffing */
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
  type: string; // e.g. "rideshare", "message", "calendar"
  label: string; // one-tap button text
  detail: string; // what it will do / draft body
}

/** Step 1 — Lead Router: classify severity and set strategy. */
export interface RouterOut {
  severity: Severity;
  engage: boolean;
  strategy: string;
  affected: FeedId[];
}

/** Step 2 — Logistics Analyst: cascade reasoning over the schedule. */
export interface AnalystOut {
  bottleneck: string;
  etaSummary: string;
  narrative: string;
  risks: string[];
}

/** Step 3 — Comm & Action Ops: draft the alert + machine actions. */
export interface CommOut {
  alert: AgentAlert | null;
  actions: AgentAction[];
}

export interface PipelineTrace {
  router: RouterOut;
  analyst: AnalystOut | null;
  comm: CommOut | null;
}

export interface AgentTickRequest {
  overrides: Overrides;
  tick: number;
}

export interface AgentTickResponse {
  /** the model's (or mock's) reasoning about what to monitor */
  reasoning: string;
  /** which feeds the agent chose to poll this tick */
  polled: FeedId[];
  /** the readings it got back */
  readings: FeedReading[];
  /** overrides after applying the readings */
  overrides: Overrides;
  /** buffer before / after this tick */
  bufferBefore: number;
  bufferAfter: number;
  status: StatusInfo;
  /** a user-facing alert, if the agent decided one is warranted */
  alert: AgentAlert | null;
  /** staged machine actions from the Comm/Action agent */
  actions: AgentAction[];
  /** the full Router → Analyst → Comm trace, for the Live screen */
  pipeline: PipelineTrace;
  /** whether Gemma actually ran, or the deterministic fallback did */
  engine: "gemma" | "mock";
  model?: string;
}
