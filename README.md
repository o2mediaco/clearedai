# Cleared — Travel AI

Autonomous, multi-agent travel co-pilot. **Gemma orchestrates real-time,
door-to-door tracking**: it senses live logistics feeds, reasons about how a
disruption cascades through your trip, and drafts the alerts + actions that keep
you on time for the meeting at the other end.

Built for the Google I/O Innovation Lab Hackathon. Next.js on Vercel, local-first
(no login), Gemma via OpenRouter.

## The agent pipeline (hub & spoke)

One orchestration "tick" runs three Gemma workers in sequence — mirroring the
pitch deck:

1. **Lead Router** — intercepts the new feed events, classifies severity, decides
   whether to engage the pipeline.
2. **Logistics Analyst** — interprets the cascade across the door-to-door schedule
   and flags the bottleneck + risks.
3. **Comm & Action Ops** — drafts the push notification and stages machine actions
   (re-time rideshare, message the meeting contact).

The **schedule math is deterministic** (`lib/schedule.ts`) — we don't trust an LLM
to do arithmetic. Gemma does the triage, interpretation, and communication.

```
Client (local-first)              POST /api/agent/tick
 Today / Timeline / Live   ───►   sense feeds → Router → Analyst → Comm → recompute
                           ◄───   { reasoning, readings, alert, actions, pipeline }
```

## Run it

```bash
npm install
cp .env.local.example .env.local   # add your keys (optional)
npm run dev                        # http://localhost:3000
```

The app **runs with no keys** — it uses a deterministic mock agent + a scripted
disruption arc so the demo is always reliable. Add keys to go live:

| Var | Purpose |
|-----|---------|
| `OPENROUTER_API_KEY` | Turns on the real Gemma pipeline |
| `OPENROUTER_MODEL` | Model slug, e.g. `google/gemma-4-26b-a4b-it:free` |
| `FEED_MODE` | `mock` (default) or `real` |
| `AERO_API_KEY` | FlightAware AeroAPI — real flight status when `FEED_MODE=real` |

On the **Live** tab, hit **Run agent tick** to watch Gemma sweep the feeds and
react. The scripted arc runs 3 ticks: flight delay → immigration backup →
traffic clears (buffer 39 → 14 → 0 → 14 min).

## Layout

```
app/
  page.tsx              phone shell, tabs, agent wiring (client)
  api/agent/tick/       the orchestration endpoint
components/
  ui.tsx                theme + primitives
  screens/              Today / Timeline / Live
lib/
  schedule.ts           deterministic door-to-door engine
  trip.ts               seed trip (SFO → PVG)
  agent/
    orchestrator.ts     Router → Analyst → Comm pipeline (+ mock fallback)
    feeds.ts            data feeds (mock arc + FlightAware real)
    openrouter.ts       OpenRouter client + JSON extraction
prototype/              original Claude Design prototype (reference only)
```

## Notes

- Gemma has no native tool-calling, so workers return JSON via prompting and we
  extract it defensively (`extractJson`).
- A full tick is 3 chained model calls (~10–20s on a free model). The `:free`
  MoE slug is faster than the dense 27B.
- Deploy: `vercel` (set the env vars in the Vercel dashboard / `vercel env add`).
