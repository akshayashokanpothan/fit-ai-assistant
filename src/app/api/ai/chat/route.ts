import { NextRequest, NextResponse } from "next/server";
import { handleChatMessage } from "@/server/ai/orchestrator";
import type { AIContext } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, context } = body as {
      message: string;
      history: { role: "user" | "assistant"; content: string }[];
      context: AIContext;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (!context) {
      return NextResponse.json({ error: "context is required" }, { status: 400 });
    }

    const result = await handleChatMessage(message, context, history ?? []);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/ai/chat] error", err);
    return NextResponse.json(
      { error: "Something went wrong generating a response. Please try again." },
      { status: 500 }
    );
  }
}
