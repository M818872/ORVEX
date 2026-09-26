# ORVEX

## AI Production Disruption & Recovery Copilot

### Tagline
> **Turn operational disruption into a recovery decision.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg)](https://react.dev)
[![Architecture](https://img.shields.io/badge/Manufacturing%20Graph-BOM%20%26%20Order%20Dependency-2563EB.svg)](https://github.com)
[![Industry](https://img.shields.io/badge/Industry-Electronics%20Manufacturing-4F46E5.svg)](https://github.com)

---

## 1. Product Vision & Industry Context

**ORVEX** is an AI-powered manufacturing operations copilot built specifically for **Electronics Manufacturing**.

In high-mix electronics assembly plants, a supplier disruption arrives through automated operational feeds or communication streams:
> *"Due to a logistics disruption during air freight consolidation in Singapore, shipment of MCU-742 on PO-8842 originally expected on October 12 is now expected on October 17."*

In traditional enterprise plants, the critical operational knowledge is fragmented across ERP tables, MES schedules, BOM trees, and customer sales commitments. A production planner or supply-chain manager is forced to spend hours manually cross-referencing spreadsheets to answer basic questions:
* *What changed?*
* *Which production orders rely on this batch?*
* *Will customer delivery commitments slip?*
* *What are our recovery options?*

**ORVEX automates this entire operational pipeline autonomously.**

The automated operating loop is:
```text
Synthetic company operational feed
        ↓
ORVEX automatically detects new event
        ↓
ORVEX ingestion pipeline
        ↓
Entity resolution
        ↓
Impact analysis
        ↓
Recovery generation
        ↓
Dashboard updates
```

---

## 2. Core Product Promise

When operational reality changes, ORVEX immediately answers five essential questions:

| # | Question | ORVEX Dynamic Output |
|---|---|---|
| **1** | **What changed?** | MicroTech Components delayed MCU-742 shipment by +5 days on PO-8842 (Oct 12 → Oct 17). |
| **2** | **What is affected?** | 3 Production Orders exposed, 500 Finished Units, 1 Customer Commitment, SMT Line 2. |
| **3** | **Why is it affected?** | MCU-742 is a critical active BOM component for the NovaCore Edge Controller AX42. |
| **4** | **What can we do?** | 3 Recovery Strategies generated: Expedite Air Freight, Qualify Alternate Supplier, or Reschedule SMT Line 2. |
| **5** | **Which option should we consider?** | Recommends **Option A (Expedite)** because it protects the Oct 20 delivery date at minimal incremental cost (₹42,000) and zero quality risk. |

> **Crucial Rule:** The final decision always remains with the human manager. ORVEX provides intelligence, evidence, and simulated execution upon approval.

---

## 3. Connected Data Sources & Operational Feed Architecture

To address the enterprise question *"Where does the dashboard data come from?"*, ORVEX connects directly to operational company feeds:

* **ERP / Orders**: Active production schedule, work centers, and customer sales orders
* **Inventory**: Live component inventory buffer, lead times, safety stocks
* **Production**: SMT assembly lines, batch staging, line capacity
* **Supplier Communications**: Live EDI, logistics, and supplier tracking feed

> **Note for Prototype:** The prototype uses a simulated synthetic enterprise feed based on real NovaCore electronics manufacturing data. In production deployment, this feed connects to SAP/Oracle ERP, MES, WMS, and supplier EDI webhooks.

### Endpoints
* `GET /api/company-feed/status` — Returns real-time connection status of all 4 sources, feed status (LIVE), last synchronization timestamp, and pending events.
* `POST /api/company-feed/process-next` — Autonomously executes the full ORVEX manufacturing pipeline for incoming operational events.
* `POST /api/company-feed/reset` — Resets feed state and restores the healthy baseline for demo repeatability.

---

## 4. Autonomous Activity & Data Lineage

During event ingestion, ORVEX produces an immutable, timestamped lineage trail:

```text
16:18:02 — Supplier signal received: MicroTech Components · PO-8842
16:18:03 — MCU-742 matched to material master (Part #MCU-742-32BIT)
16:18:04 — BOM dependency traced: AX42 Controller (SMT Line 2)
16:18:05 — Production impact calculated: 500 customer units potentially affected
16:18:06 — Recovery scenarios generated: 3 options (Option A Expedite Recommended)
```

---

## 5. Technology Stack

* **Frontend:** React 18, TypeScript, Vite, TanStack Query, Lucide Icons, Custom Enterprise Design System.
* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, Pydantic v2 schemas, Uvicorn ASGI.
* **Database:** SQLite (local zero-config database `actionos.db` / `orvex.db`) with full PostgreSQL schema compatibility.
* **AI Engine:** Configurable LLM integration with dynamic deterministic fallback reasoning for rock-solid demo execution.

---

## 6. Quickstart & Local Setup

### Prerequisites
* Python 3.10+
* Node.js 18+ & npm

### 1. Backend Setup
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation is live at: `http://localhost:8000/api/docs`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
*Web Application is live at: `http://localhost:5173`*

---

## 7. Exact Demo Steps

1. **Open Dashboard (`http://localhost:5173`)**:
   - The initial state is **HEALTHY** (Production Health: 94%, At-Risk Orders: 0, Material Risks: 0, Supplier Alerts: 0).
   - Point out the **CONNECTED DATA SOURCES** panel showing ERP, Inventory, Production, and Supplier Communications all `Connected`, Feed status `LIVE`, and the transparent prototype explanation.
2. **Autonomous Signal Detection (Within 5 Seconds)**:
   - Without clicking anything or uploading any document, the automated polling detects the synthetic company feed event.
   - The prominent **NEW OPERATIONAL SIGNAL** banner appears:
     *MicroTech Components · PO-8842 Delivery Delay (+5 Days)*.
3. **Autonomous Intelligence Pipeline Progression**:
   - ORVEX visually steps through:
     `READ` → `UNDERSTAND` → `CONNECT` → `TRACE` → `IMPACT` → `RECOVER`.
4. **Disruption & Impact Inspection**:
   - Production Health drops to 78% (At Risk), 3 orders exposed, 500 critical customer units affected.
   - Show the **Activity / Data Lineage** panel displaying the 5 timestamped stages from signal receipt to recovery generation.
   - Show the **Discovery Graph** and verified **Evidence** panel.
5. **Recovery Decision & Approval**:
   - Click `[View Recovery Options]` to open the Recovery Simulator.
   - Compare Option A (Expedite dedicated air freight - ₹42,000, 0 days customer delay), Option B (Alternate Supplier), and Option C (Reschedule).
   - Click `[Approve Recovery Plan]` on Option A to execute simulated ERP order adjustments and view the updated Audit Trail.
6. **Repeat / Reset**:
   - Click the subtle refresh icon in the top header to reset to the healthy baseline anytime.

---

## 8. Final Pitch

> **"ORVEX is an AI Production Disruption & Recovery Copilot for manufacturers. When an operational signal arrives, ORVEX automatically traces its impact from material to production to customer commitments, compares recovery strategies, and recommends a recovery plan for human approval."**

**Turn operational disruption into a recovery decision.**
