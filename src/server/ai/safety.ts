// ─────────────────────────────────────────────────────────────────────────
// Safety layer. Runs BEFORE any user message reaches the AI provider.
// This is intentionally simple pattern-matching for the MVP — it is meant
// to catch clear cases and hand off to real help, not to be a clinical
// classifier. When in doubt, it prefers to route to the cautious response.
// ─────────────────────────────────────────────────────────────────────────

export type SafetyCategory =
  | "emergency"
  | "disordered_eating"
  | "medical_advice"
  | "extreme_diet"
  | "none";

export interface SafetyResult {
  category: SafetyCategory;
  message: string;
}

const EMERGENCY_PATTERNS = [
  /chest pain/i,
  /can'?t breathe/i,
  /difficulty breathing/i,
  /severe breathing/i,
  /fainte?d?/i,
  /passing out/i,
  /passed out/i,
  /severe dizziness/i,
  /(bleeding|broken bone|serious injury)/i,
  /heart (attack|racing uncontrollably)/i,
];

const DISORDERED_EATING_PATTERNS = [
  /purg(e|ing)/i,
  /throw(ing)? up (my )?food/i,
  /starv(e|ing) myself/i,
  /(binge|binging) and (purge|purging)/i,
  /(under|extremely low) ?\d{2,3} ?(kcal|calories)/i,
  /how to (not eat|stop eating) (for days|entirely)/i,
];

const EXTREME_DIET_PATTERNS = [
  /lose \d{2,}\s?(kg|kgs|pounds|lbs) in (a|1) week/i,
  /(zero|0) calorie/i,
  /water fast for \d+ days/i,
];

const MEDICAL_ADVICE_PATTERNS = [
  /(diagnos|prescri)/i,
  /what medication/i,
  /which (medicine|pills|drug) should i take/i,
  /is this (a heart attack|a stroke|serious)\??$/i,
];

export function checkSafety(userMessage: string): SafetyResult {
  const text = userMessage.trim();

  if (EMERGENCY_PATTERNS.some((p) => p.test(text))) {
    return {
      category: "emergency",
      message:
        "This sounds like it could be a medical emergency. Please stop what you're doing and get urgent help right now — contact local emergency services (in India, dial 112) or go to the nearest hospital. I'm not able to help with this here, but please don't wait.",
    };
  }

  if (DISORDERED_EATING_PATTERNS.some((p) => p.test(text))) {
    return {
      category: "disordered_eating",
      message:
        "I want to be honest with you: I can't help with restricting, purging, or extreme food behaviours — those can be genuinely dangerous. What you're describing matters, and it's worth talking to a doctor or a mental health professional who can support you properly. I'm still here to help with balanced, sustainable habits whenever you're ready.",
    };
  }

  if (EXTREME_DIET_PATTERNS.some((p) => p.test(text))) {
    return {
      category: "extreme_diet",
      message:
        "I'm not able to help plan that — losing weight that quickly isn't safe and usually isn't sustainable either. I can help you set a realistic, steady target instead, based on your goal and profile. Want me to put one together?",
    };
  }

  if (MEDICAL_ADVICE_PATTERNS.some((p) => p.test(text))) {
    return {
      category: "medical_advice",
      message:
        "I'm not able to diagnose symptoms or advise on medication — that needs a qualified doctor. If this feels urgent, please get medical attention. For general fitness and nutrition guidance once you've spoken to a professional, I'm happy to help.",
    };
  }

  return { category: "none", message: "" };
}
