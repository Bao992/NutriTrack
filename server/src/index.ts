
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import mealRoutes from "./routes/mealRoutes";
import deliveryRoutes from "./routes/deliveryRoutes";
import investigationRoutes from "./routes/investigationRoutes";
import workflowRoutes from "./routes/workflowRoutes";
import approvalRoutes from "./routes/approvalRoutes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  process.env.CLIENT_URL,
].filter((origin): origin is string => Boolean(origin));

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NutriTrack API is running!",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/meals", mealRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/approvals", approvalRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`NutriTrack API running at http://localhost:${PORT}`);
});
