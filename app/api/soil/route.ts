import { NextRequest, NextResponse } from "next/server";
import { fetchSoilForecast } from "@/services/liveIngestion";
import type { AgentTraceStep } from "@/types";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "21.1458");
    const lon = parseFloat(searchParams.get("lon") || "79.0882");

    const trace: AgentTraceStep[] = [
      {
        node: 1,
        label: "Open-Meteo Soil Ingestion",
        status: "running",
        apiCalls: [],
      },
    ];

    const soilForecast = await fetchSoilForecast(lat, lon, trace);

    return NextResponse.json({
      soilForecast,
      trace,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch soil forecast", details: error.message },
      { status: 500 }
    );
  }
}
