import { NextRequest, NextResponse } from "next/server";
import { fetchSoilProfile } from "@/services/liveIngestion";
import type { AgentTraceStep } from "@/types";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "21.1458");
    const lon = parseFloat(searchParams.get("lon") || "79.0882");

    const trace: AgentTraceStep[] = [
      {
        node: 1,
        label: "ISRIC SoilGrids Ingestion",
        status: "running",
        apiCalls: [],
      },
    ];

    const profile = await fetchSoilProfile(lat, lon, trace);

    return NextResponse.json({
      profile,
      trace,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch SoilGrids profile", details: error.message },
      { status: 500 }
    );
  }
}
