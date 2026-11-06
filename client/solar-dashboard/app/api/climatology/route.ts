import { NextRequest, NextResponse } from "next/server";

const NASA_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const NASA_MONTH_KEYS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/** Random land-ish band with usable solar climatology. */
function randomCoordinate() {
  const lat = -35 + Math.random() * 70; // -35 … 35
  const lon = -180 + Math.random() * 360;
  return { lat: round4(lat), lon: round4(lon) };
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < -900) return 0;
  return n;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const hasCoords = sp.has("lat") && sp.has("lon");
  const lat = hasCoords ? Number(sp.get("lat")) : randomCoordinate().lat;
  const lon = hasCoords ? Number(sp.get("lon")) : randomCoordinate().lon;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = new URL(NASA_URL);
  url.searchParams.set(
    "parameters",
    "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,T2M,RH2M,WS2M",
  );
  url.searchParams.set("community", "RE");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("format", "JSON");

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `NASA POWER ${response.status}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      properties?: {
        parameter?: Record<string, Record<string, number>>;
      };
    };

    const params = payload.properties?.parameter;
    if (!params?.ALLSKY_SFC_SW_DWN || !params?.CLRSKY_SFC_SW_DWN) {
      return NextResponse.json({ error: "Unexpected NASA response" }, { status: 502 });
    }

    const monthly = MONTHS.map((month, index) => {
      const key = NASA_MONTH_KEYS[index];
      return {
        month,
        solar: num(params.ALLSKY_SFC_SW_DWN[key]),
        clearSky: num(params.CLRSKY_SFC_SW_DWN[key]),
      };
    });

    return NextResponse.json({
      location: { lat, lon },
      monthly,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NASA fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
