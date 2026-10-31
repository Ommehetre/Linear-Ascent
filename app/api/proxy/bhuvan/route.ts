import { NextRequest, NextResponse } from "next/server";



// 1x1 transparent PNG fallback buffer
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bhuvanUrl = new URL("https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms");

    // Pass all incoming query parameters
    searchParams.forEach((val, key) => {
      bhuvanUrl.searchParams.set(key, val);
    });

    // Ensure required WMS params exist
    if (!bhuvanUrl.searchParams.has("SERVICE")) bhuvanUrl.searchParams.set("SERVICE", "WMS");
    if (!bhuvanUrl.searchParams.has("VERSION")) bhuvanUrl.searchParams.set("VERSION", "1.1.1");
    if (!bhuvanUrl.searchParams.has("REQUEST")) bhuvanUrl.searchParams.set("REQUEST", "GetMap");
    if (!bhuvanUrl.searchParams.has("FORMAT")) bhuvanUrl.searchParams.set("FORMAT", "image/png");

    const upstreamRes = await fetch(bhuvanUrl.toString(), {
      headers: {
        Accept: "image/png,image/*;q=0.8",
        "User-Agent": "TerraPulse/1.0 (MicroClimate Ag Engine)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      return new NextResponse(TRANSPARENT_PNG, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": upstreamRes.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    // Return transparent tile on timeout/error so client map remains functional
    return new NextResponse(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
