import type { NutritionEstimate } from "@/types";

// Reference nutrition per common serving unit. Values are reasonable estimates
// for an MVP, not laboratory-verified figures — always surfaced to users as
// estimates, never as exact facts.
export interface SeedFood {
  id: string;
  name: string;
  aliases: string[];
  unitLabel: string; // e.g. "1 piece", "1 bowl (150g)"
  perUnit: NutritionEstimate;
}

export const SEED_FOODS: SeedFood[] = [
  {
    id: "dosa",
    name: "Dosa",
    aliases: ["plain dosa", "sada dosa"],
    unitLabel: "1 piece",
    perUnit: { kcal: 133, proteinG: 3.9, carbsG: 21, fatG: 3.7, fibreG: 1.2 },
  },
  {
    id: "idli",
    name: "Idli",
    aliases: [],
    unitLabel: "1 piece",
    perUnit: { kcal: 58, proteinG: 2, carbsG: 12, fatG: 0.2, fibreG: 0.5 },
  },
  {
    id: "puttu",
    name: "Puttu",
    aliases: [],
    unitLabel: "1 cup",
    perUnit: { kcal: 180, proteinG: 3.6, carbsG: 38, fatG: 1.2, fibreG: 2 },
  },
  {
    id: "kadala-curry",
    name: "Kadala curry",
    aliases: ["black chana curry", "kadala"],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 195, proteinG: 8, carbsG: 24, fatG: 7, fibreG: 6 },
  },
  {
    id: "appam",
    name: "Appam",
    aliases: [],
    unitLabel: "1 piece",
    perUnit: { kcal: 120, proteinG: 2.2, carbsG: 22, fatG: 2.5, fibreG: 0.6 },
  },
  {
    id: "idiyappam",
    name: "Idiyappam",
    aliases: ["string hoppers"],
    unitLabel: "1 piece",
    perUnit: { kcal: 105, proteinG: 2, carbsG: 23, fatG: 0.3, fibreG: 0.5 },
  },
  {
    id: "poha",
    name: "Poha",
    aliases: ["flattened rice"],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 250, proteinG: 4.5, carbsG: 42, fatG: 7, fibreG: 2.3 },
  },
  {
    id: "upma",
    name: "Upma",
    aliases: [],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 230, proteinG: 5, carbsG: 34, fatG: 8, fibreG: 2.5 },
  },
  {
    id: "chapati",
    name: "Chapati",
    aliases: ["roti"],
    unitLabel: "1 piece",
    perUnit: { kcal: 104, proteinG: 3, carbsG: 18, fatG: 2.5, fibreG: 1.9 },
  },
  {
    id: "paratha",
    name: "Paratha",
    aliases: ["plain paratha"],
    unitLabel: "1 piece",
    perUnit: { kcal: 210, proteinG: 4.5, carbsG: 27, fatG: 9, fibreG: 2 },
  },
  {
    id: "rice",
    name: "Rice",
    aliases: ["steamed rice", "white rice"],
    unitLabel: "1 cup cooked (150g)",
    perUnit: { kcal: 205, proteinG: 4.2, carbsG: 45, fatG: 0.4, fibreG: 0.6 },
  },
  {
    id: "dal",
    name: "Dal",
    aliases: ["dal tadka", "sambar dal", "toor dal"],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 150, proteinG: 9, carbsG: 20, fatG: 3.5, fibreG: 5 },
  },
  {
    id: "paneer-curry",
    name: "Paneer curry",
    aliases: ["paneer butter masala", "paneer dish"],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 310, proteinG: 14, carbsG: 10, fatG: 24, fibreG: 2 },
  },
  {
    id: "chicken-curry",
    name: "Chicken curry",
    aliases: [],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 260, proteinG: 22, carbsG: 6, fatG: 16, fibreG: 1.5 },
  },
  {
    id: "fish-curry",
    name: "Fish curry",
    aliases: [],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 200, proteinG: 20, carbsG: 5, fatG: 11, fibreG: 1 },
  },
  {
    id: "biryani",
    name: "Biryani",
    aliases: ["chicken biryani", "veg biryani"],
    unitLabel: "1 plate (300g)",
    perUnit: { kcal: 520, proteinG: 20, carbsG: 65, fatG: 19, fibreG: 3 },
  },
  {
    id: "mandi",
    name: "Mandi",
    aliases: ["chicken mandi"],
    unitLabel: "1 plate (300g)",
    perUnit: { kcal: 560, proteinG: 26, carbsG: 60, fatG: 22, fibreG: 2.5 },
  },
  {
    id: "sambar",
    name: "Sambar",
    aliases: [],
    unitLabel: "1 bowl (150ml)",
    perUnit: { kcal: 95, proteinG: 4.5, carbsG: 13, fatG: 2.8, fibreG: 3.5 },
  },
  {
    id: "coconut-chutney",
    name: "Coconut chutney",
    aliases: ["chutney"],
    unitLabel: "2 tbsp",
    perUnit: { kcal: 70, proteinG: 1.2, carbsG: 3, fatG: 6.2, fibreG: 1.5 },
  },
  {
    id: "avial",
    name: "Avial",
    aliases: [],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 140, proteinG: 3.5, carbsG: 14, fatG: 8, fibreG: 4 },
  },
  {
    id: "thoran",
    name: "Thoran",
    aliases: ["cabbage thoran", "beans thoran"],
    unitLabel: "1 bowl (100g)",
    perUnit: { kcal: 95, proteinG: 3, carbsG: 9, fatG: 5.5, fibreG: 3.5 },
  },
  {
    id: "egg-curry",
    name: "Egg curry",
    aliases: [],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 220, proteinG: 13, carbsG: 8, fatG: 15, fibreG: 1.5 },
  },
  {
    id: "boiled-egg",
    name: "Boiled egg",
    aliases: ["egg"],
    unitLabel: "1 piece",
    perUnit: { kcal: 78, proteinG: 6.3, carbsG: 0.6, fatG: 5.3 },
  },
  {
    id: "curd",
    name: "Curd",
    aliases: ["yogurt", "dahi"],
    unitLabel: "1 bowl (100g)",
    perUnit: { kcal: 60, proteinG: 3.5, carbsG: 4.7, fatG: 3.3 },
  },
  {
    id: "banana",
    name: "Banana",
    aliases: [],
    unitLabel: "1 medium",
    perUnit: { kcal: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, fibreG: 3.1 },
  },
  {
    id: "mixed-vegetables",
    name: "Mixed vegetables",
    aliases: ["vegetable curry", "veg curry"],
    unitLabel: "1 bowl (150g)",
    perUnit: { kcal: 120, proteinG: 3.5, carbsG: 14, fatG: 5.5, fibreG: 4 },
  },
];

export function findFoodByName(query: string): SeedFood | undefined {
  const q = query.trim().toLowerCase();
  return SEED_FOODS.find(
    (f) =>
      f.name.toLowerCase() === q ||
      f.aliases.some((a) => a.toLowerCase() === q) ||
      f.name.toLowerCase().includes(q) ||
      q.includes(f.name.toLowerCase())
  );
}

export function sumNutrition(items: NutritionEstimate[]): NutritionEstimate {
  return items.reduce(
    (acc, cur) => ({
      kcal: acc.kcal + cur.kcal,
      proteinG: acc.proteinG + cur.proteinG,
      carbsG: acc.carbsG + cur.carbsG,
      fatG: acc.fatG + cur.fatG,
      fibreG: (acc.fibreG ?? 0) + (cur.fibreG ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 } as NutritionEstimate
  );
}
