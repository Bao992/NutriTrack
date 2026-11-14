
import { Router, Request, Response } from "express";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

const router = Router();

const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
const APPROVALS_FILE = path.join(DATA_DIRECTORY, "approvals.json");

const approvalSchema = z.object({
  coordinatorName: z.string().trim().min(2).max(100),
  coordinatorRole: z.string().trim().min(2).max(100),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(1000).optional().default(""),
  workflowStatus: z.string().trim().min(1).max(100),
  automatedReviewPassed: z.boolean(),
});

interface ApprovalRecord {
  id: string;
  coordinatorName: string;
  coordinatorRole: string;
  decision: "APPROVED" | "REJECTED";
  reason: string;
  workflowStatus: string;
  automatedReviewPassed: boolean;
  createdAt: string;
}

async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await fs.access(APPROVALS_FILE);
  } catch {
    await fs.writeFile(APPROVALS_FILE, "[]", "utf8");
  }
}

async function readApprovals(): Promise<ApprovalRecord[]> {
  await ensureStorage();

  const content = await fs.readFile(APPROVALS_FILE, "utf8");
  const records: unknown = JSON.parse(content);

  if (!Array.isArray(records)) {
    throw new Error("Approval storage contains invalid data.");
  }

  return records as ApprovalRecord[];
}

async function writeApprovals(
  records: ApprovalRecord[]
): Promise<void> {
  await ensureStorage();

  const temporaryFile = `${APPROVALS_FILE}.tmp`;

  await fs.writeFile(
    temporaryFile,
    JSON.stringify(records, null, 2),
    "utf8"
  );

  await fs.rename(temporaryFile, APPROVALS_FILE);
}

// Retrieve approval history
router.get("/", async (_req: Request, res: Response) => {
  try {
    const approvals = await readApprovals();

    return res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals,
    });
  } catch (error) {
    console.error("Unable to retrieve approvals:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve approval records.",
    });
  }
});

// Submit a human approval decision
router.post("/", async (req: Request, res: Response) => {
  try {
    const validation = approvalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval submission.",
        errors: validation.error.issues,
      });
    }

    const input = validation.data;

    if (!input.automatedReviewPassed) {
      return res.status(409).json({
        success: false,
        message:
          "Human approval cannot be recorded because automated verification has not passed.",
      });
    }

    if (
      input.decision === "REJECTED" &&
      input.reason.trim().length < 3
    ) {
      return res.status(400).json({
        success: false,
        message: "A reason of at least 3 characters is required for rejection.",
      });
    }

    const approvals = await readApprovals();

    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      coordinatorName: input.coordinatorName,
      coordinatorRole: input.coordinatorRole,
      decision: input.decision,
      reason: input.reason,
      workflowStatus: input.workflowStatus,
      automatedReviewPassed: input.automatedReviewPassed,
      createdAt: new Date().toISOString(),
    };

    approvals.push(record);

    await writeApprovals(approvals);

    return res.status(201).json({
      success: true,
      message: "Human decision recorded successfully.",
      data: record,
    });
  } catch (error) {
    console.error("Unable to save approval:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save the approval decision.",
    });
  }
});

export default router;
