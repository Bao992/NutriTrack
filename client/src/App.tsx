
import { useEffect, useState } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API_URL = `${API_BASE_URL}/workflows`;
const APPROVALS_API_URL = `${API_BASE_URL}/approvals`;
const AI_INSIGHTS_API_URL = `${API_BASE_URL}/workflows/ai-insights`;

const demoInput = {
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

interface WorkflowResult {
  workflowStatus: string;
  schoolOperations: {
    learnersPresent: number;
    mealsRequired: number;
  };
  mealResults: {
    ingredients: {
      ingredientId: string;
      name: string;
      requiredQuantity: number;
      availableStock: number;
      shortage: number;
      surplus: number;
      unit: string;
      status: string;
    }[];
  };
  deliveryResults: {
    items: {
      ingredientId: string;
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
      ingredientId: string;
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
    firstReviewPassed: boolean;
    correctionAttempted: boolean;
    secondReviewPassed: boolean;
    finalStatus: string;
    automatedReviewPassed: boolean;
    humanApprovalRequired: boolean;
    approvedForAutomaticAction: boolean;
    rejectionReasons: string[];
  };
  taskLog: {
    agent: string;
    task: string;
    status: string;
  }[];
}

interface AIInsightsResponse {
  insights: string;
  generatedAt: string;
  model: string;
}

interface ApprovalDecision {
  id: string;
  decision: "APPROVED" | "REJECTED";
  coordinatorName: string;
  coordinatorRole: string;
  reason: string;
  workflowStatus: string;
  automatedReviewPassed: boolean;
  createdAt: string;
}

interface CorrectionDemoResult {
  demonstration: string;
  warning: string;
  injectedError: {
    ingredient: string;
    correctRequiredQuantity: number;
    incorrectRequiredQuantity: number;
    errorIntroduced: number;
    unit: string;
  };
  review: {
    firstReviewPassed: boolean;
    correctionAttempted: boolean;
    secondReviewPassed: boolean;
    finalStatus: string;
    rejectionReasons: string[];
    correctionAction: string;
    secondReviewRejectionReasons: string[];
  };
  correctedResult: {
    ingredient: string;
    requiredQuantity: number;
    unit: string;
  };
  correctionHistory: {
    agent: string;
    action: string;
    status: string;
  }[];
}

function readableStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function App() {
    const [activePage, setActivePage] = useState<
    "Overview" | "Inventory" | "Deliveries" | "Investigations" | "AI colleagues"
  >("Overview");
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsightsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [demoResult, setDemoResult] =
    useState<CorrectionDemoResult | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorRole, setCoordinatorRole] = useState("School coordinator");
  const [decisionReason, setDecisionReason] = useState("");
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalDecision[]>([]);
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalHistoryLoading, setApprovalHistoryLoading] = useState(true);
  const [approvalError, setApprovalError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApprovalHistory() {
      try {
        const response = await fetch(APPROVALS_API_URL);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Could not load approval history.");
        }

        if (!cancelled) {
          setApprovalHistory(payload.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setApprovalError(
            err instanceof Error
              ? `Approval history unavailable: ${err.message}`
              : "Approval history is unavailable."
          );
        }
      } finally {
        if (!cancelled) setApprovalHistoryLoading(false);
      }
    }

    loadApprovalHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  async function recordApprovalDecision(decision: "APPROVED" | "REJECTED") {
    setApprovalError("");

    if (!result) {
      setApprovalError("Run daily operations before making a decision.");
      return;
    }

    if (!result.review.automatedReviewPassed) {
      setApprovalError("The automated review must pass before a decision can be recorded.");
      return;
    }

    if (!coordinatorName.trim() || !coordinatorRole.trim()) {
      setApprovalError("Enter the coordinator's name and role.");
      return;
    }

    if (decision === "REJECTED" && decisionReason.trim().length < 3) {
      setApprovalError("Enter a rejection reason of at least 3 characters.");
      return;
    }

    setApprovalSaving(true);

    try {
      const response = await fetch(APPROVALS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          coordinatorName: coordinatorName.trim(),
          coordinatorRole: coordinatorRole.trim(),
          reason: decisionReason.trim(),
          workflowStatus: result.review.finalStatus,
          automatedReviewPassed: result.review.automatedReviewPassed,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "The decision could not be saved.");
      }

      const savedDecision = payload.data as ApprovalDecision;
      setApprovalDecision(savedDecision);
      setApprovalHistory((current) => [savedDecision, ...current]);
    } catch (err) {
      setApprovalError(
        err instanceof Error
          ? err.message
          : "Unable to save the decision to the backend."
      );
    } finally {
      setApprovalSaving(false);
    }
  }

  
async function runWorkflow() {
  setLoading(true);
  setError("");
  setAiInsights(null);
  setAiError("");
  setAiLoading(false);

  try {
    const response = await fetch(`${API_URL}/daily-operations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(demoInput),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.message || "The operations workflow could not run."
      );
    }

    const workflowResult = payload.data as WorkflowResult;

    setResult(workflowResult);
    setApprovalDecision(null);
    setApprovalError("");
    setDecisionReason("");

    if (workflowResult.review.automatedReviewPassed) {
      setAiLoading(true);

      try {
        const aiResponse = await fetch(AI_INSIGHTS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workflowResult),
        });

        const aiPayload = await aiResponse.json();

        if (!aiResponse.ok || !aiPayload.success) {
          throw new Error(
            aiPayload.message || "AI insights could not be generated."
          );
        }

        setAiInsights(aiPayload.data as AIInsightsResponse);
      } catch (aiErr) {
        setAiError(
          aiErr instanceof Error
            ? aiErr.message
            : "The AI Operations Coordinator is unavailable."
        );
      } finally {
        setAiLoading(false);
      }
    } else {
      setAiError(
        "AI insights are unavailable because automated verification did not pass."
      );
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to connect to the NutriTrack API."
    );
  } finally {
    setLoading(false);
  }
}


  async function runCorrectionDemo() {
    setDemoLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/demo-correction`, {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || "Correction demonstration failed."
        );
      }

      setDemoResult(payload.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run the correction demonstration."
      );
    } finally {
      setDemoLoading(false);
    }
  }

  const investigations =
    result?.investigationResults.investigations ?? [];

  const ingredientResults =
    result?.mealResults.ingredients ??
    demoInput.ingredients.map((item) => {
      const requiredQuantity =
        demoInput.learnersPresent * item.quantityPerMeal;

      const shortage = Math.max(
        0,
        requiredQuantity - item.availableStock
      );

      return {
        ingredientId: item.ingredientId,
        name: item.name,
        requiredQuantity,
        availableStock: item.availableStock,
        shortage,
        surplus: Math.max(0, item.availableStock - requiredQuantity),
        unit: item.unit,
        status: shortage > 0 ? "SHORTAGE" : "SUFFICIENT",
      };
    });

  return (
    <main className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <h1>NutriTrack</h1>
            <span>School nutrition intelligence</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
  type="button"
  className={`nav-item ${activePage === "Overview" ? "active" : ""}`}
  onClick={() => setActivePage("Overview")}
>
  ▦ <span>Overview</span>
</button>

<button
  type="button"
  className={`nav-item ${activePage === "Inventory" ? "active" : ""}`}
  onClick={() => setActivePage("Inventory")}
>
  ◫ <span>Inventory</span>
</button>

<button
  type="button"
  className={`nav-item ${activePage === "Deliveries" ? "active" : ""}`}
  onClick={() => setActivePage("Deliveries")}
>
  ⇄ <span>Deliveries</span>
</button>

<button
  type="button"
  className={`nav-item ${activePage === "Investigations" ? "active" : ""}`}
  onClick={() => setActivePage("Investigations")}
>
  ◎ <span>Investigations</span>
</button>

<button
  type="button"
  className={`nav-item ${activePage === "AI colleagues" ? "active" : ""}`}
  onClick={() => setActivePage("AI colleagues")}
>
  ✳ <span>AI colleagues</span>
</button>

        <div className="sidebar-bottom">
          <div className="system-indicator"></div>
          <div>
            <strong>System ready</strong>
            <span>Local demonstration</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">SCHOOL OPERATIONS</span>
            <h2>Nutrition command centre</h2>
          </div>
          <div className="demo-tag">DEMO ENVIRONMENT</div>
        </header>

        {/* WELCOME AND ACTION BUTTONS */}
        {activePage === "Overview" && (
          <>
        <section className="welcome-section">
          <div>
            <span className="eyebrow">DAILY OPERATIONS</span>
            <h2>Making every school meal count.</h2>
            <p>
              Your digital colleagues coordinate meal planning,
              deliveries and shortage investigations.
            </p>
          </div>

          <div className="action-buttons">
            <button
              className="run-button"
              onClick={runWorkflow}
              disabled={loading}
            >
              {loading ? "Running colleagues..." : "▶ Run daily operations"}
            </button>

            <button
              className="demo-button"
              onClick={runCorrectionDemo}
              disabled={demoLoading}
            >
              {demoLoading
                ? "Simulating..."
                : "↻ Simulate agent error"}
            </button>
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        {/* OPERATIONAL METRICS */}
        <section className="metrics-grid">
          <article className="metric-card">
            <span>Learners present</span>
            <strong>
              {result?.schoolOperations.learnersPresent ?? 610}
            </strong>
            <small>Today's attendance</small>
          </article>

          <article className="metric-card">
            <span>Meals required</span>
            <strong>
              {result?.schoolOperations.mealsRequired ?? 610}
            </strong>
            <small>Based on attendance</small>
          </article>

          <article className="metric-card">
            <span>Stock shortages</span>
            <strong>
              {result
                ? result.mealResults.ingredients.filter(
                    (item) => item.shortage > 0
                  ).length
                : "—"}
            </strong>
            <small>Ingredients requiring attention</small>
          </article>

          <article className="metric-card">
            <span>Delivery discrepancies</span>
            <strong>
              {result
                ? result.deliveryResults.items.filter(
                    (item) => item.status !== "MATCHED"
                  ).length
                : "—"}
            </strong>
            <small>Order versus receipt</small>
          </article>
        </section>
          </>
)}

        {activePage === "Inventory" && (
  <>
    {/* INVENTORY */}
        <div className="section-heading">
          <div>
            <span className="eyebrow">OPERATIONAL INTELLIGENCE</span>
            <h3>Inventory and supply</h3>
          </div>
          <span className="muted-label">Illustrative school data</span>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h3>Ingredient position</h3>
            <span>Required vs available</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>INGREDIENT</th>
                  <th>REQUIRED</th>
                  <th>IN STOCK</th>
                  <th>SHORTAGE</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {ingredientResults.map((item) => (
                  <tr key={item.ingredientId}>
                    <td className="ingredient-name">{item.name}</td>
                    <td>
                      {item.requiredQuantity.toFixed(1)} {item.unit}
                    </td>
                    <td>
                      {item.availableStock} {item.unit}
                    </td>
                    <td>
                      {item.shortage.toFixed(1)} {item.unit}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          item.status === "SHORTAGE" ? "danger" : "good"
                        }`}
                      >
                        {readableStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

  </>

)}

{activePage === "Deliveries" && (
  <>
    {/* DELIVERIES */}
    <div className="section-heading">
      <div>
        <span className="eyebrow">SUPPLY CHAIN MONITORING</span>
        <h3>Delivery reconciliation</h3>
      </div>
      <span className="muted-label">Order vs actual receipt</span>
    </div>

    <section className="panel">
      <div className="panel-heading">
        <h3>Delivery records</h3>
        <span>
          {result
            ? `${result.deliveryResults.items.length} records verified`
            : "Illustrative delivery data"}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>INGREDIENT</th>
              <th>ORDERED</th>
              <th>RECEIVED</th>
              <th>DIFFERENCE</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {(result?.deliveryResults.items ??
              demoInput.deliveries.map((item) => ({
                ...item,
                discrepancyQuantity: Math.abs(
                  item.orderedQuantity - item.receivedQuantity
                ),
                status:
                  item.receivedQuantity === item.orderedQuantity
                    ? "MATCHED"
                    : item.receivedQuantity < item.orderedQuantity
                      ? "UNDER_DELIVERED"
                      : "OVER_DELIVERED",
              }))
            ).map((item) => (
              <tr key={item.ingredientId}>
                <td className="ingredient-name">{item.name}</td>
                <td>
                  {item.orderedQuantity} {item.unit}
                </td>
                <td>
                  {item.receivedQuantity} {item.unit}
                </td>
                <td>
                  {item.discrepancyQuantity} {item.unit}
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      item.status === "MATCHED"
                        ? "good"
                        : "warning"
                    }`}
                  >
                    {readableStatus(item.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>
)}

{/* AI OPERATIONS COORDINATOR */}

{activePage === "AI colleagues" && (
<section className="panel ai-insights-panel">
  <div className="panel-heading">
    <div>
      <span className="eyebrow">INTELLIGENT OPERATIONS</span>
      <h3>AI Operations Coordinator</h3>
    </div>
    <span className="status-pill good">
      {aiLoading
        ? "Generating insights"
        : aiInsights
          ? "Analysis ready"
          : "Awaiting workflow"}
    </span>
  </div>

  {aiLoading ? (
    <div className="empty-state">
      <strong>AI colleague is analysing operations...</strong>
      <p>Reviewing verified school nutrition data and identifying priorities.</p>
    </div>
  ) : aiError ? (
    <div className="simulation-warning">
      <strong>AI insights unavailable</strong>
      <p>{aiError}</p>
    </div>
 ) : aiInsights ? (
  <>
    {result && (
      <div className="ai-operational-indicators">
        {result.mealResults.ingredients
          .filter((item) => item.shortage > 0)
          .map((item) => {
            const delivery = result.deliveryResults.items.find(
              (entry) => entry.ingredientId === item.ingredientId
            );

            return (
              <div className="operational-alert-card" key={item.ingredientId}>
                <div>
                  <span className="eyebrow">STOCK SHORTAGE</span>
                  <h4>{item.name}</h4>
                  <p>
                    {item.availableStock} {item.unit} available against{" "}
                    {item.requiredQuantity} {item.unit} required.
                  </p>
                </div>
                <strong>
                  {item.shortage} {item.unit} short
                </strong>

                {delivery && delivery.discrepancyQuantity > 0 && (
                  <p className="delivery-discrepancy">
                    Delivery discrepancy: {delivery.discrepancyQuantity}{" "}
                    {delivery.unit} under-delivered.
                  </p>
                )}
              </div>
            );
          })}

        <div className="human-review-indicator">
          <span className="eyebrow">AUTHORISATION STATUS</span>
          <strong>
            {result.review.humanApprovalRequired &&
            !result.review.approvedForAutomaticAction
              ? "Human approval pending"
              : "Review status recorded"}
          </strong>
          <p>
            Automated review:{" "}
            {result.review.automatedReviewPassed ? "Passed" : "Not passed"}
          </p>
          <p>No automatic purchasing or supplier payment is authorised.</p>
        </div>
      </div>
    )}

    <div className="ai-insights-content">
        <ReactMarkdown>{aiInsights.insights}</ReactMarkdown>
      </div>
      <div className="ai-insights-footer">
        <span>Model: {aiInsights.model}</span>
        <span>
          Generated: {new Date(aiInsights.generatedAt).toLocaleString()}
        </span>
      </div>
    </>
  ) : (
    <div className="empty-state">
      <span className="empty-icon">✳</span>
      <strong>Your AI colleague is ready.</strong>
      <p>Run daily operations to receive intelligent operational insights.</p>
    </div>
  )}
</section>
)}

        {/* AGENT ACTIVITY AND INVESTIGATIONS */}
        <section className="two-column">
          {activePage === "AI colleagues" && (
          <article className="panel">
            <div className="panel-heading">
              <h3>Agent activity</h3>
              <span>
                {result ? `${result.taskLog.length} tasks` : "Awaiting run"}
              </span>
            </div>

            {!result ? (
              <div className="empty-state">
                <span className="empty-icon">✳</span>
                <strong>Your colleagues are ready.</strong>
                <p>Run daily operations to start the agent workflow.</p>
              </div>
            ) : (
              <div className="agent-list">
                {result.taskLog.map((task, index) => (
                  <div
                    className="agent-row"
                    key={`${task.agent}-${index}`}
                  >
                    <div className="agent-number">{index + 1}</div>

                    <div className="agent-details">
                      <strong>{task.agent}</strong>
                      <p>{task.task}</p>
                    </div>

                    <span className="status-pill good">
                      {readableStatus(task.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
          )}

          {activePage === "Investigations" && (
  <article className="panel">
  <div className="panel-heading">
    <h3>Investigation findings</h3>
              <span>{investigations.length} findings</span>
            </div>

            {investigations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">◎</span>
                <strong>No investigation yet.</strong>
                <p>Run the workflow to investigate stock shortages.</p>
              </div>
            ) : (
              investigations.map((item) => (
                <div className="finding-card" key={item.ingredientId}>
                  <span className="eyebrow">POSSIBLE SUPPLY ISSUE</span>
                  <h4>{item.name}</h4>

                  <div className="finding-numbers">
                    <div>
                      <strong>
                        {item.stockShortage} {item.unit}
                      </strong>
                      <span>Stock shortage</span>
                    </div>

                    <div>
                      <strong>
                        {item.underDeliveredQuantity} {item.unit}
                      </strong>
                      <span>Under-delivered</span>
                    </div>
                  </div>

                  <span className="status-pill warning">
                    {readableStatus(item.finding)}
                  </span>

                  <p>{item.explanation}</p>
                </div>
              ))
            )}
                   </article>
        )}

        </section>

        {activePage === "Overview" && (
          <>

        {/* SELF-CORRECTION DEMONSTRATION */}
        {demoResult && (
          <section className="panel correction-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">
                  AUTONOMOUS SELF-CORRECTION
                </span>
                <h3>Agent review and correction history</h3>
              </div>

              <span className="status-pill good">
                {readableStatus(demoResult.review.finalStatus)}
              </span>
            </div>

            <div className="simulation-warning">
              <strong>Simulation only</strong>
              <p>{demoResult.warning}</p>
            </div>

            <div className="correction-comparison">
              <div className="comparison-card rejected-result">
                <span>INCORRECT SUBMISSION</span>
                <strong>
                  {demoResult.injectedError.incorrectRequiredQuantity}{" "}
                  {demoResult.injectedError.unit}
                </strong>
                <small>
                  Error introduced: +
                  {demoResult.injectedError.errorIntroduced}{" "}
                  {demoResult.injectedError.unit}
                </small>
              </div>

              <div className="comparison-arrow">→</div>

              <div className="comparison-card verified-result">
                <span>VERIFIED CORRECTION</span>
                <strong>
                  {demoResult.correctedResult.requiredQuantity}{" "}
                  {demoResult.correctedResult.unit}
                </strong>
                <small>Verified against original records</small>
              </div>
            </div>

            <div className="correction-timeline">
              {demoResult.correctionHistory.map((entry, index) => (
                <div
                  className="correction-event"
                  key={`${entry.agent}-${index}`}
                >
                  <div
                    className={`timeline-marker ${
                      entry.status === "REJECTED"
                        ? "rejected"
                        : "verified"
                    }`}
                  >
                    {entry.status === "REJECTED" ? "!" : "✓"}
                  </div>

                  <div className="correction-event-content">
                    <div className="correction-event-heading">
                      <strong>{entry.agent}</strong>

                      <span
                        className={`status-pill ${
                          entry.status === "REJECTED"
                            ? "danger"
                            : entry.status === "ERROR_INJECTED"
                              ? "warning"
                              : "good"
                        }`}
                      >
                        {readableStatus(entry.status)}
                      </span>
                    </div>

                    <p>{entry.action}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="final-verification">
              <strong>
                {demoResult.review.secondReviewPassed
                  ? "Correction independently verified"
                  : "Correction requires further review"}
              </strong>

              <p>
                {demoResult.review.secondReviewPassed
                  ? "The corrected result passed the second review. No further rejection reasons were found."
                  : demoResult.review.secondReviewRejectionReasons.join(" ")}
              </p>
            </div>
          </section>
        )}

        {/* HUMAN APPROVAL */}
        <section className="approval-panel approval-panel-expanded">
          <div className="approval-intro">
            <span className="eyebrow">
              GOVERNANCE AND ACCOUNTABILITY
            </span>

            <h3>Human approval checkpoint</h3>

            <p>
              NutriTrack can investigate and recommend. A school coordinator
              retains authority over consequential decisions.
            </p>

            <div className="approval-guardrails">
              <div>
                <span className="guardrail-label">Automated verification</span>
                <strong>
                  {result
                    ? result.review.automatedReviewPassed
                      ? "Passed"
                      : "Not passed"
                    : "Awaiting workflow"}
                </strong>
              </div>
              <div>
                <span className="guardrail-label">Human decision</span>
                <strong>
                  {approvalDecision
                    ? approvalDecision.decision === "APPROVED"
                      ? "Approved"
                      : "Rejected"
                    : "Pending"}
                </strong>
              </div>
              <div>
                <span className="guardrail-label">Procurement authority</span>
                <strong>Not authorised by this prototype</strong>
              </div>
            </div>
          </div>

          <div className="approval-form">
            {!result && (
              <p className="approval-help">
                Run daily operations first. The coordinator can review the
                recommendation after the automated checks have completed.
              </p>
            )}

            {result && !result.review.automatedReviewPassed && (
              <p className="approval-warning">
                Approval is disabled because automated verification has not passed.
              </p>
            )}

            <label htmlFor="coordinator-name">Coordinator name</label>
            <input
              id="coordinator-name"
              type="text"
              value={coordinatorName}
              onChange={(event) => setCoordinatorName(event.target.value)}
              placeholder="Enter the coordinator's name"
              disabled={Boolean(approvalDecision)}
            />

            <label htmlFor="coordinator-role">Role</label>
            <input
              id="coordinator-role"
              type="text"
              value={coordinatorRole}
              onChange={(event) => setCoordinatorRole(event.target.value)}
              placeholder="e.g. School nutrition coordinator"
              disabled={Boolean(approvalDecision)}
            />

            <label htmlFor="decision-reason">
              Decision note
              <span className="optional-label">
                (required when rejecting)
              </span>
            </label>
            <textarea
              id="decision-reason"
              value={decisionReason}
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder="Add a reason or note for the decision..."
              rows={3}
              disabled={Boolean(approvalDecision)}
            />

            {approvalError && (
              <p className="approval-error" role="alert">
                {approvalError}
              </p>
            )}

            {approvalDecision ? (
              <div className="decision-record">
                <strong>
                  Decision recorded:{" "}
                  {approvalDecision.decision === "APPROVED"
                    ? "APPROVED"
                    : "REJECTED"}
                </strong>
                <p>
                  {approvalDecision.coordinatorName} ·{" "}
                  {approvalDecision.coordinatorRole}
                </p>
                {approvalDecision.reason && (
                  <p>Note: {approvalDecision.reason}</p>
                )}
                <small>
                  Saved to backend · {new Date(approvalDecision.createdAt).toLocaleString()}
                </small>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setApprovalDecision(null);
                    setApprovalError("");
                    setDecisionReason("");
                  }}
                >
                  Start a new decision
                </button>
              </div>
            ) : (
              <div className="approval-actions">
                <button
                  type="button"
                  className="approve-button"
                  onClick={() => recordApprovalDecision("APPROVED")}
                  disabled={
                    !result ||
                    !result.review.automatedReviewPassed ||
                    !result.review.humanApprovalRequired ||
                    approvalSaving
                  }
                >
                  {approvalSaving ? "Saving..." : "Approve recommendation"}
                </button>
                <button
                  type="button"
                  className="reject-button"
                  onClick={() => recordApprovalDecision("REJECTED")}
                  disabled={
                    !result ||
                    !result.review.automatedReviewPassed ||
                    !result.review.humanApprovalRequired ||
                    approvalSaving
                  }
                >
                  {approvalSaving ? "Saving..." : "Reject recommendation"}
                </button>
              </div>
            )}

            <p className="prototype-disclaimer">
              Demonstration only: saving a decision does not place an order,
              contact a supplier, change stock records or authorise a purchase.
              Decisions are stored in the local prototype backend.
            </p>
          </div>

          <div className="approval-history">
            <div className="panel-heading">
              <h3>Saved approval history</h3>
              <span>{approvalHistory.length} records</span>
            </div>

            {approvalHistoryLoading ? (
              <p className="approval-help">Loading saved decisions...</p>
            ) : approvalHistory.length === 0 ? (
              <p className="approval-help">No decisions have been saved yet.</p>
            ) : (
              <div className="approval-history-list">
                {approvalHistory.map((record) => (
                  <div className="decision-record" key={record.id}>
                    <strong>
                      {record.decision} · {record.coordinatorName}
                    </strong>
                    <p>{record.coordinatorRole}</p>
                    {record.reason && <p>Note: {record.reason}</p>}
                    <small>
                      {new Date(record.createdAt).toLocaleString()} · Workflow:{" "}
                      {readableStatus(record.workflowStatus)}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

          </>
    )}

        <footer>
          <span>NutriTrack · Making every school meal count.</span>
          <span>Hackathon prototype · Synthetic demonstration data</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
