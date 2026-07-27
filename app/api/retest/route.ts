import { NextRequest, NextResponse } from "next/server";

import { sessions } from "@/lib/agent/session";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { sessionId } = await req.json();

  sessions.delete(sessionId ?? session.user.email);

  return NextResponse.json({
    ok: true,
  });
}
