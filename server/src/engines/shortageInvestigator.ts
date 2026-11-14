
export interface StockShortage {
  ingredientId: string;
  name: string;
  shortage: number;
  unit: string;
}

export interface DeliveryEvidence {
  ingredientId: string;
  name: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
}

export interface ShortageInvestigation {
  ingredientId: string;
  name: string;
  stockShortage: number;
  underDeliveredQuantity: number;
  unit: string;
  finding:
    | "DELIVERY_MAY_EXPLAIN_SHORTAGE"
    | "DELIVERY_PARTIALLY_EXPLAINS_SHORTAGE"
    | "NO_MATCHING_DELIVERY_DISCREPANCY"
    | "UNIT_MISMATCH_REQUIRES_REVIEW"
    | "NO_DELIVERY_RECORD_FOUND";
  explanation: string;
  requiresHumanReview: boolean;
}

export interface InvestigationResult {
  totalShortagesInvestigated: number;
  possibleDeliveryLinks: number;
  partialDeliveryLinks: number;
  unresolvedShortages: number;
  investigations: ShortageInvestigation[];
}

const roundQuantity = (value: number): number =>
  Number(value.toFixed(3));

export function investigateShortages(
  shortages: StockShortage[],
  deliveries: DeliveryEvidence[]
): InvestigationResult {
  const shortageIds = new Set<string>();

  const investigations = shortages
    .filter((item) => item.shortage > 0)
    .map((shortage): ShortageInvestigation => {
      if (
        !shortage.ingredientId.trim() ||
        !shortage.name.trim() ||
        !shortage.unit.trim() ||
        !Number.isFinite(shortage.shortage) ||
        shortage.shortage < 0
      ) {
        throw new Error(
          `Invalid shortage record for ${shortage.name}.`
        );
      }

      if (shortageIds.has(shortage.ingredientId)) {
        throw new Error(
          `Duplicate shortage record: ${shortage.ingredientId}.`
        );
      }

      shortageIds.add(shortage.ingredientId);

      const matchingDelivery = deliveries.find(
        (delivery) =>
          delivery.ingredientId === shortage.ingredientId
      );

      if (!matchingDelivery) {
        return {
          ingredientId: shortage.ingredientId,
          name: shortage.name,
          stockShortage: shortage.shortage,
          underDeliveredQuantity: 0,
          unit: shortage.unit,
          finding: "NO_DELIVERY_RECORD_FOUND",
          explanation:
            "No matching delivery record was found. The cause of this shortage remains unconfirmed.",
          requiresHumanReview: true,
        };
      }

      if (
        !Number.isFinite(matchingDelivery.orderedQuantity) ||
        !Number.isFinite(matchingDelivery.receivedQuantity) ||
        matchingDelivery.orderedQuantity < 0 ||
        matchingDelivery.receivedQuantity < 0 ||
        !matchingDelivery.unit.trim()
      ) {
        throw new Error(
          `Invalid delivery evidence for ${matchingDelivery.name}.`
        );
      }

      if (
        matchingDelivery.unit.trim().toLowerCase() !==
        shortage.unit.trim().toLowerCase()
      ) {
        return {
          ingredientId: shortage.ingredientId,
          name: shortage.name,
          stockShortage: shortage.shortage,
          underDeliveredQuantity: 0,
          unit: shortage.unit,
          finding: "UNIT_MISMATCH_REQUIRES_REVIEW",
          explanation:
            "The shortage and delivery records use different units. They must be checked before quantities can be compared.",
          requiresHumanReview: true,
        };
      }

      const underDeliveredQuantity = roundQuantity(
        Math.max(
          0,
          matchingDelivery.orderedQuantity -
            matchingDelivery.receivedQuantity
        )
      );

      if (underDeliveredQuantity === 0) {
        return {
          ingredientId: shortage.ingredientId,
          name: shortage.name,
          stockShortage: shortage.shortage,
          underDeliveredQuantity: 0,
          unit: shortage.unit,
          finding: "NO_MATCHING_DELIVERY_DISCREPANCY",
          explanation:
            "The delivery record does not show an under-delivery. Another cause should be investigated.",
          requiresHumanReview: true,
        };
      }

      if (underDeliveredQuantity >= shortage.shortage) {
        return {
          ingredientId: shortage.ingredientId,
          name: shortage.name,
          stockShortage: shortage.shortage,
          underDeliveredQuantity,
          unit: shortage.unit,
          finding: "DELIVERY_MAY_EXPLAIN_SHORTAGE",
          explanation:
            "The recorded under-delivery is equal to or greater than the stock shortage. It may explain the shortage, but the delivery and stock records must be verified.",
          requiresHumanReview: true,
        };
      }

      return {
        ingredientId: shortage.ingredientId,
        name: shortage.name,
        stockShortage: shortage.shortage,
        underDeliveredQuantity,
        unit: shortage.unit,
        finding: "DELIVERY_PARTIALLY_EXPLAINS_SHORTAGE",
        explanation:
          "The recorded under-delivery accounts for part of the stock shortage. The remaining difference requires further investigation.",
        requiresHumanReview: true,
      };
    });

  return {
    totalShortagesInvestigated: investigations.length,
    possibleDeliveryLinks: investigations.filter(
      (item) =>
        item.finding === "DELIVERY_MAY_EXPLAIN_SHORTAGE"
    ).length,
    partialDeliveryLinks: investigations.filter(
      (item) =>
        item.finding === "DELIVERY_PARTIALLY_EXPLAINS_SHORTAGE"
    ).length,
    unresolvedShortages: investigations.filter(
      (item) =>
        item.finding !== "DELIVERY_MAY_EXPLAIN_SHORTAGE"
    ).length,
    investigations,
  };
}
