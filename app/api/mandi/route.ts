import { NextRequest, NextResponse } from "next/server";
import { fetchMandiPrices } from "@/services/liveIngestion";
import type { AgentTraceStep } from "@/types";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || "Maharashtra";
    const commodity = searchParams.get("commodity") || "Cotton";

    const trace: AgentTraceStep[] = [
      {
        node: 1,
        label: "Agmarknet Mandi Price Ingestion",
        status: "running",
        apiCalls: [],
      },
    ];

    const records = await fetchMandiPrices(state, commodity, trace);

    return NextResponse.json({
      records,
      count: records.length,
      trace,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch Mandi records", details: error.message },
      { status: 500 }
    );
  }
}
