import { NextResponse } from "next/server";
import { UserEvent } from "@/lib/events";
import { recordEvents } from "@/lib/metrics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = Array.isArray(body?.events) ? (body.events as UserEvent[]) : [];

    if (!events.length) {
      return NextResponse.json({ status: "no_events" }, { status: 200 });
    }

    recordEvents(events);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("/api/feedback error", error);
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
