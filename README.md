# Cleared — Travel AI

Autonomous, multi-agent travel co-pilot. **Gemma orchestrates real-time,
door-to-door tracking** across a multi-flight itinerary: it senses live logistics
feeds, reasons about how each disruption cascades to your projected arrival, and
drafts the alerts + actions worth bothering you with.

Built for the Google I/O Innovation Lab Hackathon. Next.js on Vercel, local-first
(no login), Gemma via OpenRouter.

## The example trip

**LAX → (KE012, A380) → Seoul Incheon → 15h layover → (KE863, A330) → Beijing PEK.**
Three timezones (PDT / KST / CST), three calendar days, across the date line.
**ETA-only** — there's no hard meeting deadline; the verdict is your live arrival
time and how far it has slipped from the original plan.

## The agent pipeline (hub & spoke)

One orchestration "tick" runs three Gemma workers in sequence — mirroring the
pitch deck:

1. **Lead Router** — intercepts the new feed events, classifies severity, decides
   whether to engage. (A delay the layover absorbs → LOW, monitoring only.)
2. **Logistics Analyst** — interprets the cascade to the final arrival ETA and
   flags the bottleneck + risks.
3. **Comm & Action Ops** — drafts the push notification and stages machine actions
   (re-time rideshare, message your contact).

The **schedule math is deterministic** (`lib/schedule.ts`, absolute UTC-minute
engine) — we don't trust an LLM to do arithmetic. Gemma does the triage,
interpretation, and communication.

```
Client (local-first)              POST /api/agent/tick
 Today / Timeline / Live   ───►   sense feeds → Router → Analyst → Comm → recompute
                           ◄───   { reasoning, readings, alert, actions, pipeline }
```

## Run it

```bash
npm install
cp .env.local.example .env.local   # add your keys (all optional)
npm run dev                        # http://localhost:3000
```

The app **runs with no keys** — a deterministic mock agent + a scripted
disruption arc keep the demo reliable. Add keys to go live:

| Var | Purpose |
|-----|---------|
| `OPENROUTER_API_KEY` | Turns on the real Gemma pipeline |
| `OPENROUTER_MODEL` | Model slug, e.g. `google/gemma-4-26b-a4b-it:free` |
| `FEED_MODE` | `mock` (default) or `real` |
| `AERO_API_KEY` | FlightAware AeroAPI — real flight status (`FEED_MODE=real`) |
| `GOOGLE_MAPS_API_KEY` | Google Routes API — real traffic-aware drive times (`FEED_MODE=real`) |

On the **Live** tab, hit **Run agent tick** to watch Gemma sweep the feeds and
react. The scripted 4-beat arc (slip vs plan in parentheses):

1. **KE012 +95 min** → *absorbed by the 15h Seoul layover* → arrival unchanged `(+0)`
2. **KE863 +50 min** → directly slips arrival `(+50)`
3. **PEK immigration +20** → slips further `(+70)`
4. **Beijing traffic clears −30** → partial recovery `(+40)`

Beat 1 is the showcase: the agent recognizes a 95-minute delay it doesn't need to
bother you about.

## Layout

```
app/
  page.tsx              phone shell, tabs, agent wiring (client)
  api/agent/tick/       the orchestration endpoint
components/
  ui.tsx                theme + primitives
  screens/              Today / Timeline / Live
lib/
  schedule.ts           absolute-time, multi-flight door-to-door engine
  trip.ts               seed itinerary (LAX → ICN → PEK)
  types.ts              shared domain types
  agent/
    orchestrator.ts     Router → Analyst → Comm pipeline (+ mock fallback)
    feeds.ts            data feeds (mock arc + FlightAware + Google Routes)
    openrouter.ts       OpenRouter client + JSON extraction
prototype/              original Claude Design prototype (reference only)
```

## Notes

- Gemma has no native tool-calling, so workers return JSON via prompting and we
  extract it defensively (`extractJson`).
- A full tick is 3 chained model calls (~10–20s on a free model). The `:free`
  MoE slug is faster than a dense model.
- All instants are UTC minutes; display converts to each segment's local timezone,
  so the 3-tz / 3-day / date-line math stays correct.
- Deploy: `vercel` (set the env vars in the Vercel dashboard / `vercel env add`).
