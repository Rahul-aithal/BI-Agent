import { NextRequest, NextResponse } from "next/server";

import { sessions } from "@/lib/agent/session";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  sessions.delete(sessionId ?? "default");

  return NextResponse.json({
    ok: true,
  });
}
