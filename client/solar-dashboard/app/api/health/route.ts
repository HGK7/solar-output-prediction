import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const HEALTH_TIMEOUT_MS = 8_000;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Backend health check failed" },
        { status: 502 },
      );
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Backend timed out" : "Backend unreachable" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
