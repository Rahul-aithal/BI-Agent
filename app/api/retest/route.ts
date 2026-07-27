import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { clearChatHistory } from "@/lib/chatSessions";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
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

  await clearChatHistory(userEmail, sessionId ?? "default");

  return NextResponse.json({
    ok: true,
  });
}
