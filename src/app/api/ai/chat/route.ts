import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { handleChatMessage } from "@/server/ai/orchestrator";
import { checkFeatureLimit, incrementUsage } from "@/lib/subscription";
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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { allowed } = await checkFeatureLimit(user.id, "ai_message");
      if (!allowed) {
        return NextResponse.json({
          role: "assistant",
          content: "You've used today's AI conversations. Upgrade your plan to continue.",
        });
      }
    }

    const result = await handleChatMessage(message, context, history ?? []);
    
    if (user && result && result.content) {
      await incrementUsage(user.id, "ai_message").catch((err) => {
        console.error("[/api/ai/chat] failed to increment usage:", err);
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/ai/chat] error", err);
    return NextResponse.json(
      { error: "Something went wrong generating a response. Please try again." },
      { status: 500 }
    );
  }
}
