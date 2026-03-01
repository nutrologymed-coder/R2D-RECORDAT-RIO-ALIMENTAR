import { Food, MeasureConversions, DailyTotals, FoodItem, DayRecord } from '../types';

export function calculateItemGrams(
  foodId: string,
  measure: string,
  quantity: number,
  conversions: MeasureConversions
): { grams: number; isFallback: boolean } {
  const qty = isNaN(quantity) ? 0 : quantity;
  const specific = conversions.specifics[foodId]?.[measure];
  if (specific !== undefined) {
    return { grams: specific * qty, isFallback: false };
  }

  const defaultValue = conversions.defaults[measure];
  if (defaultValue !== undefined) {
    return { grams: defaultValue * qty, isFallback: true };
  }

  // If no conversion found, assume quantity is already in grams/ml if the measure is 'g' or 'ml'
  if (measure === 'g' || measure === 'ml') {
    return { grams: qty, isFallback: false };
  }

  return { grams: qty, isFallback: true }; // Fallback to 1:1 if unknown
}

export function calculateDailyTotals(
  day: DayRecord,
  foods: Food[],
  conversions: MeasureConversions
): DailyTotals {
  const totals: DailyTotals = {
    kcal: 0,
    protein: 0,
    carb: 0,
    fat: 0,
    fiber: 0,
    sodium_mg: 0,
    topItems: [],
    warnings: [],
  };

  const allItemsWithKcal: { name: string; kcal: number }[] = [];

  day.meals.forEach((meal) => {
    if (meal.skipped) return;

    meal.items.forEach((item) => {
      const food = foods.find((f) => f.id === item.foodId);
      if (!food) return;

      const { grams, isFallback } = calculateItemGrams(
        item.foodId,
        item.measure,
        item.quantity,
        conversions
      );

      if (isFallback && item.measure !== 'g' && item.measure !== 'ml') {
        const warning = `Medida "${item.measure}" para "${food.name}" usou estimativa padrão.`;
        if (!totals.warnings.includes(warning)) {
          totals.warnings.push(warning);
        }
      }

      const factor = grams / 100;
      const itemKcal = food.kcal * factor;

      totals.kcal += itemKcal;
      totals.protein += food.protein * factor;
      totals.carb += food.carb * factor;
      totals.fat += food.fat * factor;
      totals.fiber += food.fiber * factor;
      totals.sodium_mg += food.sodium_mg * factor;

      allItemsWithKcal.push({ name: food.name, kcal: itemKcal });
    });
  });

  totals.topItems = allItemsWithKcal
    .sort((a, b) => b.kcal - a.kcal)
    .slice(0, 5);

  return totals;
}
