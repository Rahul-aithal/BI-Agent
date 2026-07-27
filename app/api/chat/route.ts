import { NextRequest, NextResponse } from "next/server";

import { agent } from "@/lib/agent";
import { sessions } from "@/lib/agent/session";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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

    const { sessionId, message } = await req.json();

    if (!message) {
      return NextResponse.json(
        {
          error: "Missing message",
        },
        {
          status: 400,
        },
      );
    }

    const sid = sessionId ?? session.user.email;

    const history = sessions.get(sid) ?? [];

    history.push({
      role: "user",
      content: message,
    });

    const reply = await agent.respond(history);

    history.push({
      role: "assistant",
      content: reply,
    });

    sessions.set(sid, history);

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
