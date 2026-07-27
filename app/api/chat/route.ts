import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { agent } from "@/lib/agent";
import { getChatHistory, saveChatHistory } from "@/lib/chatSessions";

export async function POST(req: NextRequest) {
  try {
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

    const sid = sessionId ?? "default";

    const history = await getChatHistory(userEmail, sid);

    history.push({
      role: "user",
      content: message,
    });

    const reply = await agent.respond(history);

    history.push({
      role: "assistant",
      content: reply,
    });

    await saveChatHistory(userEmail, sid, history);

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
