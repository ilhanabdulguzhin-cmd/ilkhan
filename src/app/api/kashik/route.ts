import { NextRequest, NextResponse } from "next/server";
import { kashikRespond } from "@/lib/kashik-brain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, scenario, userContext, history } = body;

    const response = kashikRespond({
      message,
      scenario,
      history,
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
