// orchestrator.ts — multi-agent hub & spoke (Router → Analyst → Comm) from the
// pitch deck, reframed for ETA tracking (no hard deadline). The schedule MATH is
// deterministic (computeSchedule); the agents do triage, interpretation, comms.
// A key judgment they surface: a delay the 15h layover absorbs vs one that slips
// arrival. With no OPENROUTER_API_KEY, a deterministic fallback matches the shape.

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
import { computeSchedule, fmtTime, fmtDur, fmtDate } from "../schedule";
import { senseFeeds, applyReadings } from "./feeds";
import { chatJson, hasOpenRouter, modelFor } from "./openrouter";

function legName(trip: Trip, id: string): string {
  const all = [...trip.pre, ...trip.post, ...trip.connections.flatMap((c) => c.legs)];
  return all.find((l) => l.id === id)?.title ?? id;
}

function changeLines(trip: Trip, readings: FeedReading[]): string[] {
  return readings.map((r) => {
    if (r.scope === "flight") {
      const f = trip.flights.find((x) => x.id === r.target);
      const route = f ? ` (${f.fromCode}→${f.toCode})` : "";
      return `${r.target}${route}: delay ${r.previous}→${r.value} min. ${r.note}`;
    }
    const sign = r.value >= 0 ? "+" : "";
    return `${legName(trip, r.target)}: ${sign}${r.value} min vs base. ${r.note}`;
  });
}

function uniqueFeeds(readings: FeedReading[]) {
  return Array.from(new Set(readings.map((r) => r.feed)));
}

function slipText(slip: number): string {
  if (slip > 0) return `+${slip} min vs plan`;
  if (slip < 0) return `${slip} min (ahead of plan)`;
  return "on plan";
}

// ── deterministic fallback workers ─────────────────────────────────────
function mockRouter(readings: FeedReading[], statusId: string, slipBefore: number, slipAfter: number): RouterOut {
  if (readings.length === 0)
    return { severity: "none", engage: false, strategy: "Hold. No new logistics events; continue passive monitoring.", affected: [] };
  const hasFlight = readings.some((r) => r.scope === "flight");
  const absorbed = hasFlight && slipAfter === slipBefore;
  if (absorbed)
    return {
      severity: "low",
      engage: true,
      strategy: "Flight delay detected but the 15h Seoul layover absorbs it — projected arrival unchanged. Log and inform; no re-route.",
      affected: uniqueFeeds(readings),
    };
  const severity: Severity =
    statusId === "major" ? "critical" : statusId === "delayed" ? "high" : statusId === "minor" ? "med" : "low";
  return {
    severity,
    engage: true,
    strategy: "Arrival impact detected. Initialize timeline reassessment and hand off to Logistics Analyst.",
    affected: uniqueFeeds(readings),
  };
}

function mockAnalyst(trip: Trip, ov: Overrides, readings: FeedReading[]): AnalystOut {
  const s = computeSchedule(trip, ov);
  const tz = trip.destination.tz;
  const worst = s.postLegs.filter((l) => l.live).sort((a, b) => b.dur - a.dur)[0];
  return {
    bottleneck: worst ? worst.title : "Immigration",
    etaSummary: `Arrival ${fmtTime(s.arriveUtc, tz)} ${fmtDate(s.arriveUtc, tz)} ${tz.label} · ${slipText(s.slip)}.`,
    narrative: changeLines(trip, readings).join(" "),
    risks:
      s.slip > 60
        ? ["Arrival slipping past plan by over an hour", `${worst ? worst.title : "Arrival queue"} is the critical path`]
        : s.slip > 20
          ? ["Arrival running notably late; watch the next disruption"]
          : s.slip > 0
            ? ["Minor slip; comfortably within tolerance"]
            : ["No impact to projected arrival — delay absorbed upstream"],
  };
}

function mockComm(
  trip: Trip,
  ov: Overrides,
  readings: FeedReading[],
  slipBefore: number,
  slipAfter: number
): CommOut {
  if (readings.length === 0) return { alert: null, actions: [] };
  const s = computeSchedule(trip, ov);
  const tz = trip.destination.tz;
  const eta = `${fmtTime(s.arriveUtc, tz)} ${tz.label}`;
  const hasFlight = readings.some((r) => r.scope === "flight");
  const absorbed = hasFlight && slipAfter === slipBefore;
  const recovering = slipAfter < slipBefore;
  const sev = slipAfter > 60 ? "critical" : slipAfter > 20 ? "warn" : "info";

  let title: string;
  if (absorbed) title = "Delay absorbed — arrival unchanged";
  else if (recovering) title = "Arrival improving";
  else if (hasFlight) {
    const f = readings.find((r) => r.scope === "flight")!;
    title = `${f.target} delayed ${f.value} min`;
  } else title = `${legName(trip, readings[0].target)} updated`;

  const actions = [] as CommOut["actions"];
  if (absorbed)
    actions.push({ type: "calendar", label: "No action needed", detail: "Your 15h Seoul layover absorbs the delay; arrival is unchanged." });
  if (!absorbed && hasFlight)
    actions.push({ type: "rideshare", label: "Re-time Beijing Didi", detail: `I'll shift your PEK pickup to match the new ${eta} arrival.` });
  if (readings.some((r) => r.target === "immigration"))
    actions.push({ type: "message", label: "Message your contact", detail: `Draft: "PEK immigration is slow — I'll reach ${trip.destination.place} around ${eta}."` });
  if (recovering)
    actions.push({ type: "calendar", label: "Keep current plan", detail: "Traffic cleared; no changes needed." });

  return {
    alert: {
      title,
      body: `${changeLines(trip, readings)[0]} Projected arrival ${eta} · ${slipText(s.slip)}.`,
      severity: sev,
    },
    actions,
  };
}

// ── Gemma workers ──────────────────────────────────────────────────────
async function gemmaRouter(ctx: string): Promise<RouterOut | null> {
  const { json } = await chatJson<RouterOut>(modelFor("router"), [
    { role: "system", content:
      "You are the Lead Router in a multi-agent travel ops system. You intercept live logistics events and triage them by impact on the traveler's PROJECTED ARRIVAL. " +
      "A delay that the layover absorbs (projected arrival unchanged) is LOW severity. A delay that pushes arrival later is higher. " +
      "Reply ONLY with JSON: {\"severity\":\"none|low|med|high|critical\",\"engage\":boolean,\"strategy\":\"one sentence\",\"affected\":[feedIds]}." },
    { role: "user", content: ctx },
  ], { maxTokens: 250 });
  return json;
}

async function gemmaAnalyst(ctx: string): Promise<AnalystOut | null> {
  const { json } = await chatJson<AnalystOut>(modelFor("analyst"), [
    { role: "system", content:
      "You are the Logistics Analyst. You reason about how a disruption cascades to the final arrival ETA across a multi-flight, multi-timezone trip. " +
      "The arithmetic is already done; interpret it. Reply ONLY with JSON: " +
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
      "If the delay was absorbed and nothing is needed, still send an info alert reassuring the traveler. If truly nothing, alert=null, actions=[]." },
    { role: "user", content: ctx },
  ], { maxTokens: 400 });
  return json;
}

// ── the tick ───────────────────────────────────────────────────────────
export async function runTick(trip: Trip, overrides: Overrides, tick: number): Promise<AgentTickResponse> {
  const before = computeSchedule(trip, overrides);
  const readings = await senseFeeds(trip, overrides, tick);
  const nextOv = applyReadings(overrides, readings);
  const after = computeSchedule(trip, nextOv);
  const tz = trip.destination.tz;

  const useGemma = hasOpenRouter();
  let engine: "gemma" | "mock" = useGemma ? "gemma" : "mock";

  const events = readings.length ? changeLines(trip, readings).join("\n") : "(no new events this tick)";
  const ctxBase =
    `Trip: ${trip.origin.code} → ${trip.flights.map((f) => f.code).join(" → ")} → ${trip.destination.code}, ` +
    `${trip.flights.length - 1} stop(s). ETA-only (no hard deadline). Destination: ${trip.destination.place}.\n` +
    `Planned arrival: ${fmtTime(after.baselineArriveUtc, tz)} ${fmtDate(after.baselineArriveUtc, tz)} ${tz.label}.\n` +
    `Projected arrival now: ${fmtTime(after.arriveUtc, tz)} ${tz.label} (${slipText(after.slip)}). Was ${slipText(before.slip)} before these events.\n` +
    `Note: a 15h layover at ICN can absorb upstream delays without affecting arrival.\n` +
    `New events:\n${events}\n` +
    `Available feeds: flight_status, security_wait, immigration_wait, baggage_estimate, traffic.`;

  let router: RouterOut;
  let analyst: AnalystOut | null = null;
  let comm: CommOut | null = null;

  if (useGemma) {
    try {
      router = (await gemmaRouter(ctxBase)) ?? mockRouter(readings, after.status.id, before.slip, after.slip);
    } catch (e) {
      console.error("[agent] router (gemma) failed:", e instanceof Error ? e.message : e);
      engine = "mock";
      router = mockRouter(readings, after.status.id, before.slip, after.slip);
    }
  } else {
    router = mockRouter(readings, after.status.id, before.slip, after.slip);
  }

  if (router.engage) {
    const analystCtx =
      ctxBase + `\nChanged: ${readings.map((r) => r.target).join(", ") || "none"}. Leave-by ${fmtTime(after.leaveByUtc, trip.origin.tz)} ${trip.origin.tz.label}.`;
    if (engine === "gemma") {
      try {
        analyst = (await gemmaAnalyst(analystCtx)) ?? mockAnalyst(trip, nextOv, readings);
      } catch (e) {
        console.error("[agent] analyst (gemma) failed:", e instanceof Error ? e.message : e);
        engine = "mock";
        analyst = mockAnalyst(trip, nextOv, readings);
      }
    } else {
      analyst = mockAnalyst(trip, nextOv, readings);
    }

    const commCtx =
      analystCtx +
      `\nAnalyst: bottleneck=${analyst.bottleneck}; ${analyst.etaSummary}; risks=${analyst.risks.join("; ")}.\n` +
      `Destination: ${trip.destination.place}. Rideshare legs: Uber (LAX), Didi (PEK).`;
    if (engine === "gemma") {
      try {
        comm = (await gemmaComm(commCtx)) ?? mockComm(trip, nextOv, readings, before.slip, after.slip);
      } catch (e) {
        console.error("[agent] comm (gemma) failed:", e instanceof Error ? e.message : e);
        engine = "mock";
        comm = mockComm(trip, nextOv, readings, before.slip, after.slip);
      }
    } else {
      comm = mockComm(trip, nextOv, readings, before.slip, after.slip);
    }
  }

  return {
    reasoning: router.strategy,
    polled: uniqueFeeds(readings),
    readings,
    overrides: nextOv,
    arriveBefore: before.arriveUtc,
    arriveAfter: after.arriveUtc,
    slipBefore: before.slip,
    slipAfter: after.slip,
    status: after.status,
    alert: comm?.alert ?? null,
    actions: comm?.actions ?? [],
    pipeline: { router, analyst, comm },
    engine,
    model: useGemma ? modelFor("router") : undefined,
  };
}
