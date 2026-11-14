
import { Router } from "express";
import { z } from "zod";
import { reconcileDelivery } from "../engines/deliveryReconciler";

const router = Router();

const deliverySchema = z.object({
  items: z.array(
    z.object({
      ingredientId: z.string().min(1),
      name: z.string().min(1),
      orderedQuantity: z.number().min(0),
      receivedQuantity: z.number().min(0),
      unit: z.string().min(1),
    })
  ),
});

router.post("/reconcile", (req, res) => {
  const validation = deliverySchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery reconciliation data.",
      errors: validation.error.issues,
    });
  }

  try {
    const result = reconcileDelivery(
      validation.data.items
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
          : "Delivery reconciliation failed.",
    });
  }
});

export default router;
