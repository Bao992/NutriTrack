
export interface IngredientRequirement {
  ingredientId: string;
  name: string;
  quantityPerMeal: number;
  unit: string;
  availableStock: number;
}

export interface MealCalculationInput {
  learnersPresent: number;
  ingredients: IngredientRequirement[];
}

export interface IngredientResult {
  ingredientId: string;
  name: string;
  requiredQuantity: number;
  availableStock: number;
  shortage: number;
  surplus: number;
  unit: string;
  status: "SHORTAGE" | "SUFFICIENT";
}

export interface MealCalculationResult {
  learnersPresent: number;
  mealsRequired: number;
  ingredients: IngredientResult[];
  shortagesDetected: number;
  status: "SHORTAGE_DETECTED" | "STOCK_SUFFICIENT";
}

/**
 * Rounds quantities to three decimal places
 * to avoid JavaScript floating-point precision issues.
 */
const roundQuantity = (value: number): number =>
  Number(value.toFixed(3));

/**
 * Calculates daily meal requirements and identifies
 * ingredient shortages based on available inventory.
 */
export function calculateMealRequirements(
  input: MealCalculationInput
): MealCalculationResult {
  const { learnersPresent, ingredients } = input;

  if (!Number.isInteger(learnersPresent) || learnersPresent < 0) {
    throw new Error(
      "Learners present must be a non-negative integer."
    );
  }

  const results: IngredientResult[] = ingredients.map(
    (ingredient) => {
      if (
        !Number.isFinite(ingredient.quantityPerMeal) ||
        ingredient.quantityPerMeal < 0 ||
        !Number.isFinite(ingredient.availableStock) ||
        ingredient.availableStock < 0
      ) {
        throw new Error(
          `Invalid quantity for ingredient: ${ingredient.name}`
        );
      }

      const requiredQuantity = roundQuantity(
        learnersPresent * ingredient.quantityPerMeal
      );

      const shortage = roundQuantity(
        Math.max(
          0,
          requiredQuantity - ingredient.availableStock
        )
      );

      const surplus = roundQuantity(
        Math.max(
          0,
          ingredient.availableStock - requiredQuantity
        )
      );

      return {
        ingredientId: ingredient.ingredientId,
        name: ingredient.name,
        requiredQuantity,
        availableStock: ingredient.availableStock,
        shortage,
        surplus,
        unit: ingredient.unit,
        status:
          shortage > 0 ? "SHORTAGE" : "SUFFICIENT",
      };
    }
  );

  const shortagesDetected = results.filter(
    (ingredient) => ingredient.status === "SHORTAGE"
  ).length;

  return {
    learnersPresent,
    mealsRequired: learnersPresent,
    ingredients: results,
    shortagesDetected,
    status:
      shortagesDetected > 0
        ? "SHORTAGE_DETECTED"
        : "STOCK_SUFFICIENT",
  };
}
