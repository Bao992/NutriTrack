
import { Router } from "express";
import { z } from "zod";
import { investigateShortages } from "../engines/shortageInvestigator";

const router = Router();

const investigationSchema = z.object({
  shortages: z.array(
    z.object({
      ingredientId: z.string().min(1),
      name: z.string().min(1),
      shortage: z.number().min(0),
      unit: z.string().min(1),
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

router.post("/shortages", (req, res) => {
  const validation = investigationSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid shortage investigation data.",
      errors: validation.error.issues,
    });
  }

  try {
    const result = investigateShortages(
      validation.data.shortages,
      validation.data.deliveries
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
          : "Shortage investigation failed.",
    });
  }
});

export default router;
