// GET /api/traffic — live drive time for the "Uber to LAX" pre-flight leg.
// Calls Google Routes computeRoutes (TRAFFIC_AWARE) for
// 2807 Villa Way, Newport Beach, CA 92663 → LAX, returns minutes.
// On any failure (no key, fetch !ok, parse error) returns a fallback (HTTP 200).

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ ride: null, source: "fallback" });
  }

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { address: "2807 Villa Way, Newport Beach, CA 92663" },
        destination: { location: { latLng: { latitude: 33.9416, longitude: -118.4085 } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ ride: null, source: "fallback" });
    }

    const data = await res.json();
    const duration: string | undefined = data?.routes?.[0]?.duration;
    const seconds = duration ? parseInt(duration, 10) : NaN;
    if (!Number.isFinite(seconds)) {
      return NextResponse.json({ ride: null, source: "fallback" });
    }

    const minutes = Math.round(seconds / 60);
    return NextResponse.json({ ride: minutes, source: "google", origin: "Newport Beach" });
  } catch {
    return NextResponse.json({ ride: null, source: "fallback" });
  }
}
