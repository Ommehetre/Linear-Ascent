import { NextRequest, NextResponse } from "next/server";
import { executeAgentPipeline } from "@/services/agentOrchestrator";
import type { FarmLocation, CropType } from "@/types";



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const location: FarmLocation = body.location;
    const crop: CropType = body.crop || location.crop || "Cotton";

    if (!location || !location.lat || !location.lon) {
      return NextResponse.json(
        { error: "Invalid location coordinates provided" },
        { status: 400 }
      );
    }

    const report = await executeAgentPipeline(location, crop);

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Agent pipeline error:", error);
    return NextResponse.json(
      {
        error: "Agent execution failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
