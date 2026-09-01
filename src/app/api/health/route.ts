import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.round((Date.now() - startTime) / 1000) + "s",
    startTime: new Date(startTime).toISOString(),
    now: new Date().toISOString(),
    version: "1.0",
  });
}
