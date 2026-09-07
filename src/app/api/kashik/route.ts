import { NextRequest, NextResponse } from "next/server";
import { kashikRespond } from "@/lib/kashik-brain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, scenario, userContext, history, preferences } = body;

    const response = kashikRespond({
      message,
      scenario,
      history,
      preferences,
      ...userContext,
    });

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
