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
      strategy: "Flight delay detected but the Seoul layover absorbs it — projected arrival unchanged. Log and inform; no re-route.",
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
  const parts = readings.map((r) => {
    if (r.scope === "flight") {
      const f = trip.flights.find((x) => x.id === r.target);
      return `${r.target}${f ? ` (${f.fromCode}→${f.toCode})` : ""} is delayed ${r.value} min`;
    }
    return `${legName(trip, r.target)} is ${r.value >= 0 ? `${r.value} min slower` : `${Math.abs(r.value)} min faster`}`;
  });
  const lead = parts[0] ?? "Conditions updated";
  const narrative =
    `${lead}${parts.length > 1 ? `; ${parts.slice(1).join(", ")}` : ""}. ` +
    `Net effect: projected arrival ${fmtTime(s.arriveUtc, tz)} ${tz.label}, ${slipText(s.slip)}.`;
  return {
    bottleneck: worst ? worst.title : "Immigration",
    etaSummary: `Arrival ${fmtTime(s.arriveUtc, tz)} ${fmtDate(s.arriveUtc, tz)} ${tz.label} · ${slipText(s.slip)}.`,
    narrative,
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
  const arrCode = trip.flights[trip.flights.length - 1].toCode;
  if (absorbed)
    actions.push({ type: "calendar", label: "No action needed", detail: "Your Seoul layover absorbs the delay; arrival is unchanged." });
  if (!absorbed && hasFlight)
    actions.push({ type: "rideshare", label: `Re-time ${trip.destination.city} Uber`, detail: `I'll shift your ${arrCode} pickup to match the new ${eta} arrival.` });
  if (readings.some((r) => r.target === "immigration"))
    actions.push({ type: "message", label: "Message your contact", detail: `Draft: "${arrCode} immigration is slow — I'll reach ${trip.destination.place} around ${eta}."` });
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
      "Reply ONLY with minified JSON: {\"severity\":\"none|low|med|high|critical\",\"engage\":boolean,\"strategy\":\"one sentence\",\"affected\":[feedIds]}. " +
      "Inside string values use single quotes, never the double-quote character. No markdown, no trailing commas." },
    { role: "user", content: ctx },
  ], { maxTokens: 250, temperature: 0.2 });
  return json;
}

async function gemmaAnalyst(ctx: string): Promise<AnalystOut | null> {
  const { json } = await chatJson<AnalystOut>(modelFor("analyst"), [
    { role: "system", content:
      "You are the Logistics Analyst. You reason about how a disruption cascades to the final arrival ETA across a multi-flight, multi-timezone trip. " +
      "The arithmetic is already done; interpret it. Reply ONLY with JSON: " +
      "{\"bottleneck\":\"leg name\",\"etaSummary\":\"one line\",\"narrative\":\"2 sentences\",\"risks\":[\"...\"]}. " +
      "Output minified JSON only. Inside string values use single quotes, never the double-quote character. No markdown, no trailing commas." },
    { role: "user", content: ctx },
  ], { maxTokens: 350, temperature: 0.2 });
  return json;
}

async function gemmaComm(ctx: string): Promise<CommOut | null> {
  const { json } = await chatJson<CommOut>(modelFor("comm"), [
    { role: "system", content:
      "You are Comm & Action Ops. Draft a short push notification and stage machine actions. Reply ONLY with JSON: " +
      "{\"alert\":{\"title\":\"<=6 words\",\"body\":\"1-2 sentences\",\"severity\":\"info|warn|critical\"}," +
      "\"actions\":[{\"type\":\"rideshare|message|calendar\",\"label\":\"<=4 words\",\"detail\":\"what it does\"}]}. " +
      "If the delay was absorbed and nothing is needed, still send an info alert reassuring the traveler. If truly nothing, alert=null, actions=[]. " +
      "Output minified JSON only. Inside string values use single quotes, never the double-quote character. No markdown, no trailing commas." },
    { role: "user", content: ctx },
  ], { maxTokens: 400, temperature: 0.2 });
  return json;
}

type Src = "gemma" | "mock";

/** Run a Gemma worker, falling back to the deterministic worker on error OR on
 *  unparseable JSON — and report which one was used (per-step provenance). */
async function runWorker<T>(
  useGemma: boolean,
  name: string,
  run: () => Promise<T | null>,
  fallback: () => T
): Promise<{ value: T; via: Src }> {
  if (!useGemma) return { value: fallback(), via: "mock" };
  try {
    const g = await run();
    if (g != null) return { value: g, via: "gemma" };
    console.error(`[agent] ${name} (gemma) returned unparseable JSON; using deterministic fallback`);
    return { value: fallback(), via: "mock" };
  } catch (e) {
    console.error(`[agent] ${name} (gemma) failed:`, e instanceof Error ? e.message : e);
    return { value: fallback(), via: "mock" };
  }
}

// ── the tick ───────────────────────────────────────────────────────────
export async function runTick(trip: Trip, overrides: Overrides, tick: number, feedMode: "real" | "mock"): Promise<AgentTickResponse> {
  const before = computeSchedule(trip, overrides);
  const readings = await senseFeeds(trip, overrides, tick, feedMode === "real");
  const nextOv = applyReadings(overrides, readings);
  const after = computeSchedule(trip, nextOv);
  const tz = trip.destination.tz;

  const useGemma = hasOpenRouter();

  const events = readings.length ? changeLines(trip, readings).join("\n") : "(no new events this tick)";
  const ctxBase =
    `Trip: ${trip.origin.code} → ${trip.flights.map((f) => f.code).join(" → ")} → ${trip.destination.code}, ` +
    `${trip.flights.length - 1} stop(s). ETA-only (no hard deadline). Destination: ${trip.destination.place}.\n` +
    `Planned arrival: ${fmtTime(after.baselineArriveUtc, tz)} ${fmtDate(after.baselineArriveUtc, tz)} ${tz.label}.\n` +
    `Projected arrival now: ${fmtTime(after.arriveUtc, tz)} ${tz.label} (${slipText(after.slip)}). Was ${slipText(before.slip)} before these events.\n` +
    `Note: the Seoul (ICN) layover can absorb upstream delays without affecting arrival.\n` +
    `New events:\n${events}\n` +
    `Available feeds: flight_status, security_wait, immigration_wait, baggage_estimate, traffic.`;

  const via: { router: Src; analyst: Src; comm: Src } = { router: "mock", analyst: "mock", comm: "mock" };

  const routerRes = await runWorker(useGemma, "router", () => gemmaRouter(ctxBase), () => mockRouter(readings, after.status.id, before.slip, after.slip));
  const router = routerRes.value;
  via.router = routerRes.via;

  let analyst: AnalystOut | null = null;
  let comm: CommOut | null = null;

  if (router.engage) {
    const analystCtx =
      ctxBase + `\nChanged: ${readings.map((x) => x.target).join(", ") || "none"}. Leave-by ${fmtTime(after.leaveByUtc, trip.origin.tz)} ${trip.origin.tz.label}.`;
    const analystRes = await runWorker(useGemma, "analyst", () => gemmaAnalyst(analystCtx), () => mockAnalyst(trip, nextOv, readings));
    analyst = analystRes.value;
    via.analyst = analystRes.via;

    const commCtx =
      analystCtx +
      `\nAnalyst: bottleneck=${analyst.bottleneck}; ${analyst.etaSummary}; risks=${analyst.risks.join("; ")}.\n` +
      `Destination: ${trip.destination.place}. Rideshare legs: Uber (LAX), Uber (${trip.flights[trip.flights.length - 1].toCode}).`;
    const commRes = await runWorker(useGemma, "comm", () => gemmaComm(commCtx), () => mockComm(trip, nextOv, readings, before.slip, after.slip));
    comm = commRes.value;
    via.comm = commRes.via;
  }

  // "gemma" if Gemma actually produced at least one step this tick, else "mock"
  const engine: "gemma" | "mock" =
    via.router === "gemma" || via.analyst === "gemma" || via.comm === "gemma" ? "gemma" : "mock";

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
    pipeline: { router, analyst, comm, via },
    engine,
    model: useGemma ? modelFor("router") : undefined,
  };
}
