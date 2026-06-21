// POST /api/agent/tick — run one orchestration cycle.
// Body: { overrides: Overrides, tick: number }
// Returns: AgentTickResponse

import { NextResponse } from "next/server";
import { runTick } from "@/lib/agent/orchestrator";
import { SEED_TRIP } from "@/lib/trip";
import { freshOverrides } from "@/lib/schedule";
import type { Overrides } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { overrides?: Overrides; tick?: number; feedMode?: "real" | "mock" } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — treat as a fresh tick 1
  }
  const overrides: Overrides = body.overrides ?? freshOverrides();
  const tick = Number.isFinite(body.tick) ? Number(body.tick) : 1;
  // request toggle wins; otherwise fall back to the FEED_MODE env default
  const feedMode: "real" | "mock" =
    body.feedMode === "real" || body.feedMode === "mock"
      ? body.feedMode
      : process.env.FEED_MODE === "real"
        ? "real"
        : "mock";

  try {
    const result = await runTick(SEED_TRIP, overrides, tick, feedMode);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
