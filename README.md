# NutriTrack

### The Autonomous School Nutrition Colleague

**Making every school meal count.**

NutriTrack is an AI-powered school nutrition operations platform designed to help schools coordinate meal planning, monitor food inventory, reconcile supplier deliveries, investigate operational problems and support informed decision-making.

Its goal is to move school nutrition management beyond simple record-keeping towards proactive, evidence-based operational coordination.

## The Problem

School nutrition programmes involve several interconnected activities, including learner attendance, meal planning, stock management, supplier deliveries and food preparation.

When these activities are managed separately, shortages, delivery discrepancies and operational problems can go unnoticed until they affect meal preparation.

NutriTrack brings these activities together and helps identify problems early.

## Key Features

- **Daily Operations:** Coordinates daily meal and nutrition operations.
- **Meal Planning:** Calculates ingredient requirements using learner attendance and meal plans.
- **Inventory Monitoring:** Identifies shortages and monitors available ingredients.
- **Delivery Reconciliation:** Compares ordered quantities against received quantities.
- **Shortage Investigation:** Examines operational evidence to identify possible causes of shortages.
- **AI Operations Coordinator:** Generates operational summaries, priority alerts and recommendations.
- **Agent Self-Correction:** Demonstrates how incorrect outputs can be detected, rejected, regenerated and independently verified.
- **Human Approval:** Allows a school coordinator to review and record approval or rejection decisions.

## AI Agent Architecture

NutriTrack uses five specialised operational agents:

1. Operations Planner
2. Meal Planning Agent
3. Inventory and Supply Agent
4. Investigation Agent
5. Reviewer and Correction Agent

An AI Operations Coordinator uses a hosted language model to interpret workflow results, prioritise alerts and communicate recommendations.

Calculations, delivery reconciliation and verification are handled through deterministic application logic.

## Safety and Human Oversight

NutriTrack is designed around responsible AI use.

- Operational recommendations are based on supplied evidence.
- Possible causes are distinguished from confirmed findings.
- Incorrect agent outputs must pass review and correction.
- Consequential decisions remain subject to human approval.
- The prototype does not authorise purchases, supplier payments or procurement.
- Demonstration data is synthetic and does not represent real school records.

## Technology Stack

**Frontend**
- React
- TypeScript
- Vite

**Backend**
- Node.js
- Express
- TypeScript

**AI Integration**
- OpenAI API

**Validation and Testing**
- TypeScript
- Automated Node.js tests

## Project Structure

```text
NutriTrack/
├── client/
│   ├── public/
│   └── src/
├── server/
│   └── src/
│       ├── engines/
│       ├── routes/
│       └── services/
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm
- An OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/Bao992/NutriTrack.git
cd NutriTrack
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` as a reference.

Configure your environment variables:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=your_supported_model
```

Use a valid model available to your OpenAI API account.

Never commit your `.env` file or expose your API key.

Start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local Vite address displayed in the terminal, normally:

http://localhost:5173/

## Testing

Backend production build:

```bash
cd server
npm run build
```

Backend automated tests:

```bash
npm test
```

Frontend production build:

```bash
cd client
npm run build
```

## Prototype Status

NutriTrack is a working prototype developed for the Colleague Zero hackathon.

It demonstrates coordinated operational workflows, AI-assisted interpretation, deterministic verification, error correction and human decision-making using synthetic school nutrition data.

It is not yet a production system for managing real school nutrition programmes.

## Project Repository

[GitHub – Bao992/NutriTrack](https://github.com/Bao992/NutriTrack)

**NutriTrack — Making every school meal count.**