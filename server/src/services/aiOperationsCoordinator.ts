
import OpenAI from "openai";


export interface AIWorkflowSummary {
  schoolOperations: {
    learnersPresent: number;
    mealsRequired: number;
  };
  mealResults: {
    ingredients: {
      name: string;
      requiredQuantity: number;
      availableStock: number;
      shortage: number;
      unit: string;
      status: string;
    }[];
  };
  deliveryResults: {
    items: {
      name: string;
      orderedQuantity: number;
      receivedQuantity: number;
      discrepancyQuantity: number;
      unit: string;
      status: string;
    }[];
  };
  investigationResults: {
    investigations: {
      name: string;
      stockShortage: number;
      underDeliveredQuantity: number;
      unit: string;
      finding: string;
      explanation: string;
      requiresHumanReview: boolean;
    }[];
  };
  review: {
    automatedReviewPassed: boolean;
    humanApprovalRequired: boolean;
    approvedForAutomaticAction: boolean;
    finalStatus: string;
  };
}

export async function generateOperationsInsights(
  workflow: AIWorkflowSummary
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-6-luna",

    instructions: `
You are NutriTrack's AI Operations Coordinator.

Your responsibility is to interpret verified school nutrition
operations data and help the school coordinator make informed
decisions.

Rules:
- Use only the supplied operational evidence.
- Never invent quantities, deliveries or missing information.
- Do not independently recalculate or override verified results.
- Distinguish confirmed discrepancies from possible explanations.
- Never claim that a delivery discrepancy caused a shortage
  unless the evidence establishes that fact.
- Prioritise risks to meal preparation and continuity.
- Recommend practical actions for human coordinators.
- Never authorise purchases, supplier payments or procurement.
- Respect the independent review and human approval status.

Present your response using these headings:

OPERATIONAL SUMMARY
PRIORITY ALERTS
WHAT THE EVIDENCE SHOWS
RECOMMENDED ACTIONS
HUMAN REVIEW REQUIRED

Keep the response clear, concise and suitable for a school
nutrition programme coordinator.
`,

    input: JSON.stringify(workflow),

    max_output_tokens: 700,
  });

  const insights = response.output_text?.trim();

  if (!insights) {
    throw new Error("The AI coordinator returned an empty response.");
  }

  return insights;
}
