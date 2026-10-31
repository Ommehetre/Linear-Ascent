import { NextRequest, NextResponse } from "next/server";
import { fetchMonsoonData } from "@/services/liveIngestion";
import type { AgentTraceStep } from "@/types";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "21.1458");
    const lon = parseFloat(searchParams.get("lon") || "79.0882");

    const trace: AgentTraceStep[] = [
      {
        node: 1,
        label: "Historical Monsoon & Archive Ingestion",
        status: "running",
        apiCalls: [],
      },
    ];

    const monsoon = await fetchMonsoonData(lat, lon, trace);

    return NextResponse.json({
      monsoon,
      trace,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch monsoon data", details: error.message },
      { status: 500 }
    );
  }
}
