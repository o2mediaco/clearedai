// orchestrator.ts — the multi-agent hub & spoke from the pitch deck:
//   Router (triage/severity)  →  Logistics Analyst (cascade)  →  Comm/Action (drafts)
// Each worker is a Gemma call via OpenRouter that returns JSON. The schedule
// MATH is done deterministically by computeSchedule (we don't trust an LLM to
// do arithmetic); the agents handle severity, interpretation, and comms.
// With no OPENROUTER_API_KEY, a deterministic fallback produces the same shape.

import type {
  Trip,
  Overrides,
  FeedReading,
  AgentTickResponse,
  RouterOut,
  AnalystOut,
  CommOut,
  Severity,
} from "../types";
import { computeSchedule, fmtTime, fmtDur } from "../schedule";
import { senseFeeds, applyReadings } from "./feeds";
import { chatJson, hasOpenRouter, modelFor } from "./openrouter";

function changeLines(trip: Trip, readings: FeedReading[]): string[] {
  return readings.map((r) => {
    if (r.target === "flightDelay")
      return `Flight ${trip.flight.code}: delay ${r.previous}→${r.value} min. ${r.note}`;
    const leg = [...trip.pre, ...trip.post].find((l) => l.id === r.target);
    const name = leg ? leg.title : r.target;
    const sign = r.value >= 0 ? "+" : "";
    return `${name}: ${sign}${r.value} min vs base (${r.source}). ${r.note}`;
  });
}

function uniqueFeeds(readings: FeedReading[]) {
  return Array.from(new Set(readings.map((r) => r.feed)));
}

// ── deterministic fallback workers ─────────────────────────────────────
function mockRouter(readings: FeedReading[], statusId: string): RouterOut {
  if (readings.length === 0)
    return { severity: "none", engage: false, strategy: "Hold. No new logistics events; continue passive monitoring.", affected: [] };
  const severity: Severity =
    statusId === "missed" ? "critical" : statusId === "risk" ? "high" : statusId === "tight" ? "med" : "low";
  return {
    severity,
    engage: true,
    strategy: "Logistical change detected. Initialize timeline reassessment and hand off to Logistics Analyst.",
    affected: uniqueFeeds(readings),
  };
}

function mockAnalyst(trip: Trip, ov: Overrides, readings: FeedReading[]): AnalystOut {
  const s = computeSchedule(trip, ov);
  const worst = [...s.postLegs, ...s.preLegs]
    .filter((l) => l.live)
    .sort((a, b) => b.dur - a.dur)[0];
  return {
    bottleneck: worst ? worst.title : "Immigration",
    etaSummary: `New arrival ${fmtTime(s.arrive)} · buffer ${s.buffer < 0 ? "−" : ""}${fmtDur(Math.abs(s.buffer))} before 2:00 PM.`,
    narrative: changeLines(trip, readings).join(" "),
    risks:
      s.buffer < 0
        ? ["Projected to miss the 2:00 PM meeting", `${worst ? worst.title : "Queue"} is the critical path`]
        : s.buffer < 10
          ? ["Buffer under 10 min — one more disruption misses the meeting"]
          : ["Buffer holding; no action required yet"],
  };
}

function mockComm(trip: Trip, ov: Overrides, readings: FeedReading[]): CommOut {
  const s = computeSchedule(trip, ov);
  if (readings.length === 0) return { alert: null, actions: [] };
  const recovering = readings.every((r) =>
    r.target === "flightDelay" ? r.value <= r.previous : r.value < (r.previous || 0)
  );
  const sev = s.buffer < 0 ? "critical" : s.buffer < 10 ? "warn" : "info";
  const lead = readings[0];
  const title =
    lead.target === "flightDelay"
      ? `Flight ${trip.flight.code} delayed ${lead.value} min`
      : recovering
        ? "Buffer restored — you’re back on track"
        : `${trip.post.concat(trip.pre).find((l) => l.id === lead.target)?.title ?? "Schedule"} updated`;
  const actions = [];
  if (readings.some((r) => r.target === "flightDelay"))
    actions.push({ type: "rideshare", label: "Re-time Uber pickup", detail: `Shift SFO pickup to ${fmtTime(s.leaveBy)} to match the new departure.` });
  if (readings.some((r) => r.target === "immigration"))
    actions.push({ type: "message", label: "Text Lanson Group", detail: `Draft: "Immigration is slow at PVG — I may arrive ~${fmtTime(s.arrive)}. Will confirm on landing."` });
  if (recovering)
    actions.push({ type: "calendar", label: "Keep current plan", detail: "Buffer is healthy again; no changes needed." });
  return {
    alert: {
      title,
      body: `${changeLines(trip, readings)[0]} Arrive ${fmtTime(s.arrive)} · buffer ${s.buffer < 0 ? "−" : ""}${fmtDur(Math.abs(s.buffer))}.`,
      severity: sev,
    },
    actions,
  };
}

// ── Gemma workers ──────────────────────────────────────────────────────
async function gemmaRouter(ctx: string): Promise<RouterOut | null> {
  const { json } = await chatJson<RouterOut>(modelFor("router"), [
    { role: "system", content:
      "You are the Lead Router in a multi-agent travel ops system. You intercept live logistics events and triage them. " +
      "Reply ONLY with JSON: {\"severity\":\"none|low|med|high|critical\",\"engage\":boolean,\"strategy\":\"one sentence\",\"affected\":[feedIds]}. " +
      "engage=true only when an event meaningfully changes the plan." },
    { role: "user", content: ctx },
  ], { maxTokens: 250 });
  return json;
}

async function gemmaAnalyst(ctx: string): Promise<AnalystOut | null> {
  const { json } = await chatJson<AnalystOut>(modelFor("analyst"), [
    { role: "system", content:
      "You are the Logistics Analyst. You reason about cascading delays across a door-to-door timeline. " +
      "The arithmetic is already done for you; interpret it. Reply ONLY with JSON: " +
      "{\"bottleneck\":\"leg name\",\"etaSummary\":\"one line\",\"narrative\":\"2 sentences\",\"risks\":[\"...\"]}." },
    { role: "user", content: ctx },
  ], { maxTokens: 350 });
  return json;
}

async function gemmaComm(ctx: string): Promise<CommOut | null> {
  const { json } = await chatJson<CommOut>(modelFor("comm"), [
    { role: "system", content:
      "You are Comm & Action Ops. Draft a short push notification and stage machine actions. Reply ONLY with JSON: " +
      "{\"alert\":{\"title\":\"<=6 words\",\"body\":\"1-2 sentences\",\"severity\":\"info|warn|critical\"}," +
      "\"actions\":[{\"type\":\"rideshare|message|calendar\",\"label\":\"<=4 words\",\"detail\":\"what it does\"}]}. " +
      "If nothing needs the user, set alert to null and actions to []." },
    { role: "user", content: ctx },
  ], { maxTokens: 400 });
  return json;
}

// ── the tick ───────────────────────────────────────────────────────────
export async function runTick(
  trip: Trip,
  overrides: Overrides,
  tick: number
): Promise<AgentTickResponse> {
  const before = computeSchedule(trip, overrides);
  const readings = await senseFeeds(trip, overrides, tick);
  const nextOv = applyReadings(overrides, readings);
  const after = computeSchedule(trip, nextOv);

  const useGemma = hasOpenRouter();
  let engine: "gemma" | "mock" = useGemma ? "gemma" : "mock";

  // Build the shared context the agents reason over.
  const events = readings.length ? changeLines(trip, readings).join("\n") : "(no new events this tick)";
  const ctxBase =
    `Trip: ${trip.flight.from}→${trip.flight.to}, meeting ${fmtTime(trip.meeting.time)} ${trip.meeting.tz} at ${trip.meeting.place}.\n` +
    `Buffer before: ${before.buffer} min (${before.status.label}). Buffer after events: ${after.buffer} min (${after.status.label}).\n` +
    `New events:\n${events}\n` +
    `Available feeds: flight_status, security_wait, immigration_wait, baggage_estimate, traffic.`;

  let router: RouterOut;
  let analyst: AnalystOut | null = null;
  let comm: CommOut | null = null;

  if (useGemma) {
    try {
      router = (await gemmaRouter(ctxBase)) ?? mockRouter(readings, after.status.id);
    } catch (e) {
      console.error("[agent] router (gemma) failed:", e instanceof Error ? e.message : e);
      engine = "mock";
      router = mockRouter(readings, after.status.id);
    }
  } else {
    router = mockRouter(readings, after.status.id);
  }

  if (router.engage) {
    const analystCtx =
      ctxBase +
      `\nChanged legs: ${readings.map((r) => r.target).join(", ") || "none"}.\n` +
      `Door-to-door now: leave ${fmtTime(after.leaveBy)} → arrive ${fmtTime(after.arrive)}.`;
    if (engine === "gemma") {
      try {
        analyst = (await gemmaAnalyst(analystCtx)) ?? mockAnalyst(trip, nextOv, readings);
      } catch {
        engine = "mock";
        analyst = mockAnalyst(trip, nextOv, readings);
      }
    } else {
      analyst = mockAnalyst(trip, nextOv, readings);
    }

    const commCtx =
      analystCtx +
      `\nAnalyst: bottleneck=${analyst.bottleneck}; ${analyst.etaSummary}; risks=${analyst.risks.join("; ")}.\n` +
      `Meeting contact: ${trip.meeting.org}. Rideshare legs: Uber (SFO), Didi (PVG).`;
    if (engine === "gemma") {
      try {
        comm = (await gemmaComm(commCtx)) ?? mockComm(trip, nextOv, readings);
      } catch {
        engine = "mock";
        comm = mockComm(trip, nextOv, readings);
      }
    } else {
      comm = mockComm(trip, nextOv, readings);
    }
  }

  return {
    reasoning: router.strategy,
    polled: uniqueFeeds(readings),
    readings,
    overrides: nextOv,
    bufferBefore: before.buffer,
    bufferAfter: after.buffer,
    status: after.status,
    alert: comm?.alert ?? null,
    actions: comm?.actions ?? [],
    pipeline: { router, analyst, comm },
    engine,
    model: useGemma ? modelFor("router") : undefined,
  };
}
