import { NextRequest, NextResponse } from "next/server";
import { fetchSentinelScenes } from "@/services/liveIngestion";
import type { FarmLocation, AgentTraceStep } from "@/types";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "21.1458");
    const lon = parseFloat(searchParams.get("lon") || "79.0882");
    const bboxParam = searchParams.get("bbox");

    let bbox: [number, number, number, number] = [
      lon - 0.15,
      lat - 0.15,
      lon + 0.15,
      lat + 0.15,
    ];
    if (bboxParam) {
      const parts = bboxParam.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        bbox = parts as [number, number, number, number];
      }
    }

    const location: FarmLocation = {
      name: searchParams.get("name") || "Custom Field",
      lat,
      lon,
      bbox,
      state: searchParams.get("state") || "Maharashtra",
      crop: (searchParams.get("crop") as any) || "Cotton",
    };

    const trace: AgentTraceStep[] = [
      {
        node: 1,
        label: "Sentinel-2 STAC Ingestion",
        status: "running",
        apiCalls: [],
      },
    ];

    const scenes = await fetchSentinelScenes(location, trace);

    return NextResponse.json({
      scenes,
      trace,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch satellite scenes", details: error.message },
      { status: 500 }
    );
  }
}
