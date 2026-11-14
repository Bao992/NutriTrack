
import { Router } from "express";
import { z } from "zod";
import { calculateMealRequirements } from "../engines/mealCalculator";

const router = Router();

const mealCalculationSchema = z.object({
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
});

router.post("/requirements", (req, res) => {
  const validation = mealCalculationSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid meal calculation data.",
      errors: validation.error.issues,
    });
  }

  try {
    const result = calculateMealRequirements(validation.data);

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
          : "Meal calculation failed.",
    });
  }
});

export default router;
