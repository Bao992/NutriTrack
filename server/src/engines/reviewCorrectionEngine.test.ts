
import test from "node:test";
import assert from "node:assert/strict";

import { calculateMealRequirements } from "./mealCalculator";
import { reconcileDelivery } from "./deliveryReconciler";
import { investigateShortages } from "./shortageInvestigator";
import {
  reviewAndCorrectWorkflow,
  type DailyOperationsInput,
} from "./reviewCorrectionEngine";

test("rejects an incorrect result, corrects it, and passes the second review", () => {
  const input: DailyOperationsInput = {
    learnersPresent: 610,
    ingredients: [
      {
        ingredientId: "MAIZE-001",
        name: "Maize meal",
        quantityPerMeal: 0.08,
        unit: "kg",
        availableStock: 35,
      },
    ],
    deliveries: [
      {
        ingredientId: "MAIZE-001",
        name: "Maize meal",
        orderedQuantity: 50,
        receivedQuantity: 35,
        unit: "kg",
      },
    ],
  };

  const mealResults = calculateMealRequirements({
    learnersPresent: input.learnersPresent,
    ingredients: input.ingredients,
  });

  const deliveryResults = reconcileDelivery(input.deliveries);

  const investigationResults = investigateShortages(
    mealResults.ingredients
      .filter((item) => item.shortage > 0)
      .map((item) => ({
        ingredientId: item.ingredientId,
        name: item.name,
        shortage: item.shortage,
        unit: item.unit,
      })),
    input.deliveries
  );

  // Simulate an agent submitting an incorrect calculation.
  mealResults.ingredients[0].requiredQuantity += 5;

  const result = reviewAndCorrectWorkflow(input, {
    mealResults,
    deliveryResults,
    investigationResults,
  });

  assert.equal(result.review.firstReviewPassed, false);
  assert.equal(result.review.correctionAttempted, true);
  assert.equal(result.review.secondReviewPassed, true);
  assert.equal(
    result.review.finalStatus,
    "CORRECTED_AND_VERIFIED"
  );

  assert.equal(
    result.mealResults.ingredients[0].requiredQuantity,
    48.8
  );

  console.log("\nReview and correction test results:");
  console.log(result.review);
});
