import { NextRequest, NextResponse } from "next/server";
import { executeAgentPipeline, AgentProgressEvent } from "@/services/agentOrchestrator";
import { AgentRunRequestSchema } from "@/lib/schemas";
import type { FarmLocation, CropType } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout guarded by maxDuration=60

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parsed = AgentRunRequestSchema.safeParse(body);
    if (!parsed.success) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: "Schema validation failed for request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { location: rawLoc, crop: bodyCrop } = parsed.data;
    const crop: CropType = (bodyCrop || rawLoc.crop || "Cotton") as CropType;

    // Ensure valid bbox; if not provided or incomplete, compute default 0.05-deg window
    const bbox: [number, number, number, number] = rawLoc.bbox || [
      rawLoc.lon - 0.025,
      rawLoc.lat - 0.025,
      rawLoc.lon + 0.025,
      rawLoc.lat + 0.025,
    ];

    const location: FarmLocation = {
      name: rawLoc.name || "Custom Field",
      lat: rawLoc.lat,
      lon: rawLoc.lon,
      bbox,
      state: rawLoc.state || "Maharashtra",
      crop,
      sowingDate: rawLoc.sowingDate || parsed.data.sowingDate,
      growthStage: rawLoc.growthStage || parsed.data.growthStage,
    };

    const isStream =
      req.headers.get("accept")?.includes("text/event-stream") ||
      req.nextUrl.searchParams.get("stream") === "true";

    if (isStream) {
      const responseStream = new ReadableStream({
        async start(streamController) {
          const encoder = new TextEncoder();
          const emit = (event: AgentProgressEvent) => {
            streamController.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          };

          try {
            emit({
              stage: "INITIALIZING",
              message: "Connecting to TerraPulse autonomous agentic pipeline...",
              timestamp: new Date().toISOString(),
            });

            const report = await executeAgentPipeline(location, crop, emit);
            emit({
              stage: "COMPLETE",
              message: "Pipeline completed successfully with verified telemetry.",
              timestamp: new Date().toISOString(),
              data: report,
            });
            streamController.close();
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            emit({
              stage: "ERROR",
              message: `Pipeline execution failed: ${errorMsg}`,
              timestamp: new Date().toISOString(),
            });
            streamController.close();
          } finally {
            clearTimeout(timeoutId);
          }
        },
        cancel() {
          controller.abort();
          clearTimeout(timeoutId);
        },
      });

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming JSON mode (preserves frontend contract)
    const report = await executeAgentPipeline(location, crop);
    clearTimeout(timeoutId);

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("Agent pipeline error:", error);
    const isTimeout = controller.signal.aborted || error.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout ? "Pipeline execution timed out" : "Agent execution failed",
        details: error.message,
        statusCode: isTimeout ? 504 : error.status || 500,
      },
      { status: isTimeout ? 504 : error.status || 500 }
    );
  }
}
