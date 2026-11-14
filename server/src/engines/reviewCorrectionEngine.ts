
import {
  calculateMealRequirements,
  type MealCalculationResult,
} from "./mealCalculator";

import {
  reconcileDelivery,
  type DeliveryReconciliationResult,
} from "./deliveryReconciler";

import {
  investigateShortages,
  type InvestigationResult,
} from "./shortageInvestigator";

export interface DailyOperationsInput {
  learnersPresent: number;
  ingredients: {
    ingredientId: string;
    name: string;
    quantityPerMeal: number;
    unit: string;
    availableStock: number;
  }[];
  deliveries: {
    ingredientId: string;
    name: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unit: string;
  }[];
}

interface ProposedResults {
  mealResults: MealCalculationResult;
  deliveryResults: DeliveryReconciliationResult;
  investigationResults: InvestigationResult;
}

interface ReviewResult {
  passed: boolean;
  rejectionReasons: string[];
}

const roundQuantity = (value: number): number =>
  Number(value.toFixed(3));

const quantitiesMatch = (
  actual: number,
  expected: number
): boolean => Math.abs(actual - expected) < 0.001;

/**
 * Independently checks agent outputs against the original
 * school records rather than trusting the submitted results.
 */
function reviewOutputs(
  input: DailyOperationsInput,
  proposed: ProposedResults
): ReviewResult {
  const rejectionReasons: string[] = [];

  // Check 1: Independently verify meal calculations.
  if (
    proposed.mealResults.ingredients.length !==
    input.ingredients.length
  ) {
    rejectionReasons.push(
      "Meal calculation contains an incorrect number of ingredients."
    );
  }

  for (const ingredient of input.ingredients) {
    const actual = proposed.mealResults.ingredients.find(
      (item) => item.ingredientId === ingredient.ingredientId
    );

    if (!actual) {
      rejectionReasons.push(
        `Meal result missing for ${ingredient.name}.`
      );
      continue;
    }

    const expectedRequired = roundQuantity(
      input.learnersPresent * ingredient.quantityPerMeal
    );

    const expectedShortage = roundQuantity(
      Math.max(
        0,
        expectedRequired - ingredient.availableStock
      )
    );

    const expectedStatus =
      expectedShortage > 0 ? "SHORTAGE" : "SUFFICIENT";

    if (
      !quantitiesMatch(
        actual.requiredQuantity,
        expectedRequired
      ) ||
      !quantitiesMatch(
        actual.shortage,
        expectedShortage
      ) ||
      actual.status !== expectedStatus
    ) {
      rejectionReasons.push(
        `Meal calculation failed verification for ${ingredient.name}.`
      );
    }
  }

  // Check 2: Independently verify delivery reconciliation.
  if (
    proposed.deliveryResults.items.length !==
    input.deliveries.length
  ) {
    rejectionReasons.push(
      "Delivery reconciliation contains an incorrect number of items."
    );
  }

  for (const delivery of input.deliveries) {
    const actual = proposed.deliveryResults.items.find(
      (item) => item.ingredientId === delivery.ingredientId
    );

    if (!actual) {
      rejectionReasons.push(
        `Delivery result missing for ${delivery.name}.`
      );
      continue;
    }

    const expectedDiscrepancy = roundQuantity(
      Math.abs(
        delivery.orderedQuantity -
          delivery.receivedQuantity
      )
    );

    const expectedStatus =
      delivery.receivedQuantity < delivery.orderedQuantity
        ? "UNDER_DELIVERED"
        : delivery.receivedQuantity > delivery.orderedQuantity
          ? "OVER_DELIVERED"
          : "MATCHED";

    if (
      !quantitiesMatch(
        actual.discrepancyQuantity,
        expectedDiscrepancy
      ) ||
      actual.status !== expectedStatus
    ) {
      rejectionReasons.push(
        `Delivery reconciliation failed verification for ${delivery.name}.`
      );
    }
  }

  // Check 3: Independently verify shortage investigations.
  const expectedShortages = input.ingredients.filter(
    (ingredient) =>
      input.learnersPresent * ingredient.quantityPerMeal >
      ingredient.availableStock
  );

  if (
    proposed.investigationResults.investigations.length !==
    expectedShortages.length
  ) {
    rejectionReasons.push(
      "Investigation results do not cover the expected stock shortages."
    );
  }

  for (const ingredient of expectedShortages) {
    const expectedShortage = roundQuantity(
      Math.max(
        0,
        input.learnersPresent * ingredient.quantityPerMeal -
          ingredient.availableStock
      )
    );

    const actual =
      proposed.investigationResults.investigations.find(
        (item) => item.ingredientId === ingredient.ingredientId
      );

    if (!actual) {
      rejectionReasons.push(
        `Investigation missing for ${ingredient.name}.`
      );
      continue;
    }

    const delivery = input.deliveries.find(
      (item) => item.ingredientId === ingredient.ingredientId
    );

    let expectedFinding:
      | "DELIVERY_MAY_EXPLAIN_SHORTAGE"
      | "DELIVERY_PARTIALLY_EXPLAINS_SHORTAGE"
      | "NO_MATCHING_DELIVERY_DISCREPANCY"
      | "UNIT_MISMATCH_REQUIRES_REVIEW"
      | "NO_DELIVERY_RECORD_FOUND";

    let expectedUnderDelivery = 0;

    if (!delivery) {
      expectedFinding = "NO_DELIVERY_RECORD_FOUND";
    } else if (
      delivery.unit.trim().toLowerCase() !==
      ingredient.unit.trim().toLowerCase()
    ) {
      expectedFinding = "UNIT_MISMATCH_REQUIRES_REVIEW";
    } else {
      expectedUnderDelivery = roundQuantity(
        Math.max(
          0,
          delivery.orderedQuantity -
            delivery.receivedQuantity
        )
      );

      if (expectedUnderDelivery === 0) {
        expectedFinding = "NO_MATCHING_DELIVERY_DISCREPANCY";
      } else if (expectedUnderDelivery >= expectedShortage) {
        expectedFinding = "DELIVERY_MAY_EXPLAIN_SHORTAGE";
      } else {
        expectedFinding =
          "DELIVERY_PARTIALLY_EXPLAINS_SHORTAGE";
      }
    }

    if (
      actual.finding !== expectedFinding ||
      !quantitiesMatch(
        actual.stockShortage,
        expectedShortage
      ) ||
      !quantitiesMatch(
        actual.underDeliveredQuantity,
        expectedUnderDelivery
      )
    ) {
      rejectionReasons.push(
        `Shortage investigation failed verification for ${ingredient.name}.`
      );
    }
  }

  return {
    passed: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

/**
 * Reviews submitted agent results. If rejected, it regenerates
 * all three result sets from the original school records and
 * performs a second independent review.
 */
export function reviewAndCorrectWorkflow(
  input: DailyOperationsInput,
  proposed: ProposedResults
) {
  const firstReview = reviewOutputs(input, proposed);

  if (firstReview.passed) {
    return {
      mealResults: proposed.mealResults,
      deliveryResults: proposed.deliveryResults,
      investigationResults: proposed.investigationResults,
      review: {
        firstReviewPassed: true,
        correctionAttempted: false,
        secondReviewPassed: true,
        finalStatus: "VERIFIED",
        rejectionReasons: [],
        correctionAction: "No correction was necessary.",
      },
    };
  }

  // Correction Agent regenerates the results from source records.
  const correctedMealResults = calculateMealRequirements({
    learnersPresent: input.learnersPresent,
    ingredients: input.ingredients,
  });

  const correctedDeliveryResults = reconcileDelivery(
    input.deliveries
  );

  const correctedShortages = correctedMealResults.ingredients
    .filter((item) => item.shortage > 0)
    .map((item) => ({
      ingredientId: item.ingredientId,
      name: item.name,
      shortage: item.shortage,
      unit: item.unit,
    }));

  const correctedInvestigationResults = investigateShortages(
    correctedShortages,
    input.deliveries
  );

  const correctedResults: ProposedResults = {
    mealResults: correctedMealResults,
    deliveryResults: correctedDeliveryResults,
    investigationResults: correctedInvestigationResults,
  };

  const secondReview = reviewOutputs(input, correctedResults);

  return {
    ...correctedResults,
    review: {
      firstReviewPassed: false,
      correctionAttempted: true,
      secondReviewPassed: secondReview.passed,
      finalStatus: secondReview.passed
        ? "CORRECTED_AND_VERIFIED"
        : "ESCALATED_FOR_HUMAN_REVIEW",
      rejectionReasons: firstReview.rejectionReasons,
      correctionAction:
        "Regenerated meal, delivery and investigation results from the original school records.",
      secondReviewRejectionReasons: secondReview.rejectionReasons,
    },
  };
}
