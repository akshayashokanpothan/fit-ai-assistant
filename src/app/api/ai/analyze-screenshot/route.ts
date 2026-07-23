import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

const INSTRUCTION = `This is a screenshot from a fitness/health app (e.g. Apple Fitness, Samsung Health, Strava, or similar). Extract ONLY the information that is visibly present. Respond with ONLY JSON, no prose, no markdown fences, in this shape:
{"steps": number | null, "distanceKm": number | null, "activeKcal": number | null, "durationMin": number | null, "activityType": string | null}
Use null for anything not visible. Do not invent numbers that aren't shown.`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = (await req.json()) as {
      imageBase64: string;
      mediaType: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    const provider = getAIProvider();
    const { text } = await provider.analyzeImage({
      imageBase64,
      mediaType: mediaType || "image/jpeg",
      instruction: "This is a fitness screenshot. " + INSTRUCTION,
    });

    let parsed: {
      steps: number | null;
      distanceKm: number | null;
      activeKcal: number | null;
      durationMin: number | null;
      activityType: string | null;
    };
    try {
      const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error:
            "I couldn't read this screenshot clearly. Try a clearer capture, or add the activity manually.",
        },
        { status: 422 }
      );
    }

    if (!parsed.steps && !parsed.distanceKm && !parsed.activeKcal && !parsed.durationMin) {
      return NextResponse.json(
        {
          error: "I couldn't find any activity numbers in this screenshot.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      draft: {
        activityType: parsed.activityType || "walk",
        steps: parsed.steps ?? undefined,
        distanceKm: parsed.distanceKm ?? undefined,
        activeKcal: parsed.activeKcal ?? undefined,
        durationMin: parsed.durationMin ?? undefined,
        confidence: 0.7,
      },
    });
  } catch (err) {
    console.error("[/api/ai/analyze-screenshot] error", err);
    return NextResponse.json(
      { error: "Screenshot analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
