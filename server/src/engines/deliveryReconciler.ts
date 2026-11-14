
export interface DeliveryItem {
  ingredientId: string;
  name: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
}

export interface DeliveryItemResult {
  ingredientId: string;
  name: string;
  orderedQuantity: number;
  receivedQuantity: number;
  discrepancyQuantity: number;
  unit: string;
  status:
    | "MATCHED"
    | "UNDER_DELIVERED"
    | "OVER_DELIVERED";
}

export interface DeliveryReconciliationResult {
  totalItems: number;
  matchedItems: number;
  underDeliveredItems: number;
  overDeliveredItems: number;
  items: DeliveryItemResult[];
  overallStatus:
    | "DELIVERY_COMPLETE"
    | "DELIVERY_DISCREPANCY_FOUND";
}

export function reconcileDelivery(
  items: DeliveryItem[]
): DeliveryReconciliationResult {
  const ingredientIds = new Set<string>();

  const results = items.map((item) => {
    if (
      !item.ingredientId.trim() ||
      !item.name.trim() ||
      !item.unit.trim()
    ) {
      throw new Error(
        "Ingredient ID, name and unit are required."
      );
    }

    if (
      !Number.isFinite(item.orderedQuantity) ||
      !Number.isFinite(item.receivedQuantity) ||
      item.orderedQuantity < 0 ||
      item.receivedQuantity < 0
    ) {
      throw new Error(
        `Invalid delivery quantity for ${item.name}.`
      );
    }

    if (ingredientIds.has(item.ingredientId)) {
      throw new Error(
        `Duplicate delivery item: ${item.ingredientId}.`
      );
    }

    ingredientIds.add(item.ingredientId);

    const discrepancyQuantity = Number(
      Math.abs(
        item.orderedQuantity - item.receivedQuantity
      ).toFixed(3)
    );

    let status: DeliveryItemResult["status"] = "MATCHED";

    if (item.receivedQuantity < item.orderedQuantity) {
      status = "UNDER_DELIVERED";
    } else if (
      item.receivedQuantity > item.orderedQuantity
    ) {
      status = "OVER_DELIVERED";
    }

    return {
      ingredientId: item.ingredientId,
      name: item.name,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: item.receivedQuantity,
      discrepancyQuantity,
      unit: item.unit,
      status,
    };
  });

  const matchedItems = results.filter(
    (item) => item.status === "MATCHED"
  ).length;

  const underDeliveredItems = results.filter(
    (item) => item.status === "UNDER_DELIVERED"
  ).length;

  const overDeliveredItems = results.filter(
    (item) => item.status === "OVER_DELIVERED"
  ).length;

  const hasDiscrepancy =
    underDeliveredItems > 0 || overDeliveredItems > 0;

  return {
    totalItems: results.length,
    matchedItems,
    underDeliveredItems,
    overDeliveredItems,
    items: results,
    overallStatus: hasDiscrepancy
      ? "DELIVERY_DISCREPANCY_FOUND"
      : "DELIVERY_COMPLETE",
  };
}
