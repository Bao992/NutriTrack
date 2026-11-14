
import { Router } from "express";
import {
  generateOperationsInsights,
  type AIWorkflowSummary,
} from "../services/aiOperationsCoordinator";
import { z } from "zod";

import { runDailyOperationsWorkflow } from "../engines/workflowOrchestrator";
import { calculateMealRequirements } from "../engines/mealCalculator";
import { reconcileDelivery } from "../engines/deliveryReconciler";
import { investigateShortages } from "../engines/shortageInvestigator";
import {
  reviewAndCorrectWorkflow,
  type DailyOperationsInput,
} from "../engines/reviewCorrectionEngine";

const router = Router();

const workflowSchema = z.object({
  learnersPresent: z.number().int().min(0),

  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1),
      name: z.string().min(1),
      quantityPerMeal: z.number().min(0),
      unit: z.string().min(1),
      availableStock: z.number().min(0),
    })
  ),

  deliveries: z.array(
    z.object({
      ingredientId: z.string().min(1),
      name: z.string().min(1),
      orderedQuantity: z.number().min(0),
      receivedQuantity: z.number().min(0),
      unit: z.string().min(1),
    })
  ),
});

router.post("/daily-operations", (req, res) => {
  const validation = workflowSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid daily operations data.",
      errors: validation.error.issues,
    });
  }

  try {
    const result = runDailyOperationsWorkflow(
      validation.data
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Daily operations workflow failed.",
    });
  }
});

// Controlled demonstration: deliberately corrupt an agent result.
router.post("/demo-correction", (_req, res) => {
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
      {
        ingredientId: "BEANS-001",
        name: "Beans",
        quantityPerMeal: 0.04,
        unit: "kg",
        availableStock: 30,
      },
      {
        ingredientId: "OIL-001",
        name: "Cooking oil",
        quantityPerMeal: 0.01,
        unit: "litres",
        availableStock: 8,
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
      {
        ingredientId: "BEANS-001",
        name: "Beans",
        orderedQuantity: 30,
        receivedQuantity: 30,
        unit: "kg",
      },
      {
        ingredientId: "OIL-001",
        name: "Cooking oil",
        orderedQuantity: 10,
        receivedQuantity: 12,
        unit: "litres",
      },
    ],
  };

  try {
    const mealResults = calculateMealRequirements({
      learnersPresent: input.learnersPresent,
      ingredients: input.ingredients,
    });

    const deliveryResults = reconcileDelivery(input.deliveries);

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

    // Deliberately introduce a fictional 5 kg calculation error.
    const correctRequiredQuantity =
      mealResults.ingredients[0].requiredQuantity;

    mealResults.ingredients[0].requiredQuantity += 5;

    const incorrectRequiredQuantity =
      mealResults.ingredients[0].requiredQuantity;

    const reviewed = reviewAndCorrectWorkflow(input, {
      mealResults,
      deliveryResults,
      investigationResults,
    });

    return res.status(200).json({
      success: true,
      data: {
        demonstration: "SIMULATED_AGENT_ERROR",
        warning:
          "This is a controlled demonstration using synthetic data. No school inventory or supplier records were changed.",
        injectedError: {
          ingredient: "Maize meal",
          correctRequiredQuantity,
          incorrectRequiredQuantity,
          errorIntroduced: 5,
          unit: "kg",
        },
        review: reviewed.review,
        correctedResult: {
          ingredient: "Maize meal",
          requiredQuantity:
            reviewed.mealResults.ingredients.find(
              (item) => item.ingredientId === "MAIZE-001"
            )?.requiredQuantity,
          unit: "kg",
        },
        correctionHistory: [
          {
            agent: "Meal Planning Agent",
            action: "Submitted an intentionally incorrect maize meal requirement.",
            status: "ERROR_INJECTED",
          },
          {
            agent: "Reviewer Agent",
            action: reviewed.review.rejectionReasons.join(" "),
            status: reviewed.review.firstReviewPassed
              ? "PASSED"
              : "REJECTED",
          },
          {
            agent: "Correction Agent",
            action: reviewed.review.correctionAction,
            status: reviewed.review.correctionAttempted
              ? "CORRECTED"
              : "NOT_REQUIRED",
          },
          {
            agent: "Reviewer Agent - Second Review",
            action: "Checked the regenerated result against the original school records.",
            status: reviewed.review.secondReviewPassed
              ? "VERIFIED"
              : "ESCALATED",
          },
        ],
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Correction demonstration failed.",
    });
  }
});



router.post("/ai-insights", async (req, res) => {
  try {
    const workflow = req.body as AIWorkflowSummary;

    if (
      !workflow ||
      !workflow.schoolOperations ||
      !workflow.mealResults ||
      !workflow.deliveryResults ||
      !workflow.investigationResults ||
      !workflow.review
    ) {
      return res.status(400).json({
        success: false,
        message: "A complete verified workflow result is required.",
      });
    }

    if (!workflow.review.automatedReviewPassed) {
      return res.status(409).json({
        success: false,
        message: "AI insights require a workflow that passed automated review.",
      });
    }

    const insights = await generateOperationsInsights(workflow);

    return res.status(200).json({
      success: true,
      data: {
        insights,
        generatedAt: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || "gpt-6-luna",
      },
    });
  } catch (error) {
    console.error("AI insights error:", error);

    return res.status(502).json({
      success: false,
      message: "The AI Operations Coordinator is temporarily unavailable.",
    });
  }
});


export default router;
