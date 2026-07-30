import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { checkFeatureLimit, incrementUsage } from "@/lib/subscription";
import { findFoodByName, sumNutrition } from "@/lib/nutrition/seed-foods";
import type { MealItem } from "@/types";

const INSTRUCTION = `Identify the food items visible in this photo of an Indian meal or snack. Respond with ONLY a JSON array, no prose, no markdown fences, like:
[{"name": "Dosa", "qty": "2 pieces"}, {"name": "Sambar", "qty": "1 bowl"}]
Use common Indian dish names where applicable (dosa, idli, puttu, kadala curry, appam, idiyappam, poha, upma, chapati, paratha, rice, dal, paneer dishes, chicken curry, fish curry, biryani, mandi, sambar, chutneys, avial, thoran). If you are not confident about an item, include your best guess — the user will review and correct it.`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = (await req.json()) as {
      imageBase64: string;
      mediaType: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { allowed, limit } = await checkFeatureLimit(user.id, "meal_analysis");
      if (!allowed) {
        return NextResponse.json(
          {
            error: `You've reached today's meal analysis limit. ${
              limit === 3 ? "Free plan includes 3 meal scans/day. Upgrade to Pro for more." : "Upgrade your plan to continue."
            }`
          },
          { status: 403 }
        );
      }
    }

    const provider = getAIProvider();
    const { text } = await provider.analyzeImage({
      imageBase64,
      mediaType: mediaType || "image/jpeg",
      instruction: INSTRUCTION,
    });

    let detected: { name: string; qty: string }[] = [];
    try {
      const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");
      detected = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error:
            "I couldn't clearly make out this photo. Try a clearer, well-lit shot, or add the meal manually.",
        },
        { status: 422 }
      );
    }

    const items: MealItem[] = detected.slice(0, 8).map((d, idx) => {
      const food = findFoodByName(d.name);
      return {
        id: `draft-item-${Date.now()}-${idx}`,
        name: food?.name ?? d.name,
        quantityLabel: d.qty || food?.unitLabel || "1 serving",
        nutrition: food?.perUnit ?? { kcal: 150, proteinG: 4, carbsG: 20, fatG: 5, fibreG: 1 },
        confidence: food ? 0.75 : 0.4,
      };
    });

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "I couldn't identify any food in this photo. Try a clearer shot, or add the meal manually.",
        },
        { status: 422 }
      );
    }

    if (user) {
      await incrementUsage(user.id, "meal_analysis").catch((err) => {
        console.error("[/api/ai/analyze-image] failed to increment usage:", err);
      });
    }

    return NextResponse.json({
      items,
      totalNutrition: sumNutrition(items.map((i) => i.nutrition)),
      overallConfidence:
        items.reduce((s, i) => s + i.confidence, 0) / Math.max(items.length, 1),
    });
  } catch (err) {
    console.error("[/api/ai/analyze-image] error", err);
    return NextResponse.json(
      { error: "Image analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
