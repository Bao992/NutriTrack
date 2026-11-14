
import {
  calculateMealRequirements,
} from "./mealCalculator";

import { reconcileDelivery } from "./deliveryReconciler";

import { investigateShortages } from "./shortageInvestigator";

import {
  reviewAndCorrectWorkflow,
  type DailyOperationsInput,
} from "./reviewCorrectionEngine";

export function runDailyOperationsWorkflow(
  input: DailyOperationsInput
) {
  const taskLog: {
    agent: string;
    task: string;
    status: "COMPLETED" | "REQUIRES_REVIEW";
  }[] = [];

  // Agent 1: Operations Planner
  taskLog.push({
    agent: "Operations Planner",
    task: "Received daily school operations data and coordinated the workflow.",
    status: "COMPLETED",
  });

  // Agent 2: Meal Planning Agent
  const mealResults = calculateMealRequirements({
    learnersPresent: input.learnersPresent,
    ingredients: input.ingredients,
  });

  taskLog.push({
    agent: "Meal Planning Agent",
    task: "Calculated ingredient requirements and identified stock shortages.",
    status: "COMPLETED",
  });

  // Agent 3: Inventory and Supply Agent
  const deliveryResults = reconcileDelivery(input.deliveries);

  taskLog.push({
    agent: "Inventory and Supply Agent",
    task: "Compared ordered and received delivery quantities.",
    status: "COMPLETED",
  });

  // Agent 4: Investigation Agent
  const shortages = mealResults.ingredients
    .filter((item) => item.shortage > 0)
    .map((item) => ({
      ingredientId: item.ingredientId,
      name: item.name,
      shortage: item.shortage,
      unit: item.unit,
    }));

  const investigationResults = investigateShortages(
    shortages,
    input.deliveries
  );

  taskLog.push({
    agent: "Investigation Agent",
    task: "Investigated shortages against available delivery evidence.",
    status: "COMPLETED",
  });

  // Agent 5: Independent Reviewer and Correction Agent
  const reviewed = reviewAndCorrectWorkflow(input, {
    mealResults,
    deliveryResults,
    investigationResults,
  });

  const automatedReviewPassed =
    reviewed.review.finalStatus === "VERIFIED" ||
    reviewed.review.finalStatus === "CORRECTED_AND_VERIFIED";

  taskLog.push({
    agent: "Reviewer Agent",
    task: reviewed.review.firstReviewPassed
      ? "Independently verified calculations and investigation evidence."
      : "Rejected submitted results because verification checks failed.",
    status: automatedReviewPassed
      ? "COMPLETED"
      : "REQUIRES_REVIEW",
  });

  if (reviewed.review.correctionAttempted) {
    taskLog.push({
      agent: "Correction Agent",
      task: reviewed.review.correctionAction,
      status: "COMPLETED",
    });

    taskLog.push({
      agent: "Reviewer Agent - Second Review",
      task: reviewed.review.secondReviewPassed
        ? "Verified corrected results against the original school records."
        : "Corrected results failed the second review and were escalated.",
      status: reviewed.review.secondReviewPassed
        ? "COMPLETED"
        : "REQUIRES_REVIEW",
    });
  }

  const humanApprovalRequired =
    !automatedReviewPassed ||
    reviewed.investigationResults.investigations.some(
      (item) => item.requiresHumanReview
    );

  const workflowStatus = !automatedReviewPassed
    ? "REVIEW_REQUIRED"
    : humanApprovalRequired
      ? "COMPLETED_PENDING_HUMAN_APPROVAL"
      : "COMPLETED";

  return {
    workflowStatus,

    schoolOperations: {
      learnersPresent: input.learnersPresent,
      mealsRequired: reviewed.mealResults.mealsRequired,
    },

    mealResults: reviewed.mealResults,
    deliveryResults: reviewed.deliveryResults,
    investigationResults: reviewed.investigationResults,

    review: {
      ...reviewed.review,
      automatedReviewPassed,
      humanApprovalRequired,
      approvedForAutomaticAction: false,
    },

    taskLog,
    completedAt: new Date().toISOString(),
  };
}
