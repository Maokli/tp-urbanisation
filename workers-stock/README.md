# 📦 Stock Management Workflow - Distributed System

A distributed BPMN workflow system for managing stock replenishment across multiple departments. Built with **Camunda 8 SaaS** and **Node.js Zeebe workers**.

## 🔄 Workflow Overview

```
┌─────────────────┐
│  Out of Stock   │
│    Detected     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Data & Analytics│  ← Compute optimal replenishment quantity
│ compute-quantity│
└────────┬────────┘
         ▼
┌─────────────────┐
│  Merchandising  │  ← Create replenishment request
│ create-request  │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Merchandising  │  ← Verify physical stock level
│  verify-stock   │
└────────┬────────┘
         ▼
    ┌────────┐
    │Stock OK│
    └────┬───┘
    YES  │  NO → ❌ Process Terminated
         ▼
┌─────────────────┐
│    Finance      │  ← Analyze budget, cost, feasibility
│analyze-request │
└────────┬────────┘
         ▼
    ┌────────┐
    │Approved│
    └────┬───┘
    YES  │  NO → ❌ Replenishment Refused
         ▼
┌─────────────────┐
│   Logistics     │  ← Issue PO, select supplier
│process-request │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Logistics     │  ← Receive & inspect delivery
│ check-delivery  │
└────────┬────────┘
         ▼
    ┌─────────┐
    │Conforming│
    └────┬────┘
    YES  │  NO → 📦 handle-return → ❌ Returned
         ▼
┌─────────────────┐
│       IT        │  ← Update ERP, WMS, POS
│ update-systems  │
└────────┬────────┘
         ▼
┌─────────────────┐
│   ✅ SUCCESS    │
│Stock Replenished│
└─────────────────┘
```

## 🚀 Quick Start

### 1. Setup Credentials

Copy the `.env` file from the promotion workers or create a new one:

```bash
cp ../workers/.env .env
# Or create new .env from template:
cp .env.example .env
# Edit .env with your Camunda credentials
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy the Process

```bash
npm run deploy
```

### 4. Start Workers (Each in separate terminal)

**Terminal 1 - Data & Analytics:**
```bash
npm run interactive:data
```

**Terminal 2 - Merchandising:**
```bash
npm run interactive:merchandising
```

**Terminal 3 - Finance:**
```bash
npm run interactive:finance
```

**Terminal 4 - Logistics:**
```bash
npm run interactive:logistics
```

**Terminal 5 - IT:**
```bash
npm run interactive:it
```

### 5. Start a Process Instance

**Terminal 6:**
```bash
npm run start
```

## 📋 Job Types by Department

| Department | Job Type | Description |
|------------|----------|-------------|
| Data & Analytics | `compute-replenishment-quantity` | Calculate optimal order quantity |
| Merchandising | `create-replenishment-request` | Create the order request |
| Merchandising | `verify-stock` | Physical stock verification (**Decision Point**) |
| Finance | `analyze-replenishment` | Budget/cost analysis (**Decision Point**) |
| Logistics | `process-replenishment` | Issue PO to supplier |
| Logistics | `check-delivery` | Inspect received goods (**Decision Point**) |
| Logistics | `handle-return` | Process returns (if delivery rejected) |
| IT | `update-stock-systems` | Update ERP, WMS, POS |

## ⚠️ Decision Points

The workflow has **3 decision points** where the process can take different paths:

1. **Stock Verification** (Merchandising)
   - `stockVerified = true` → Continue to Finance
   - `stockVerified = false` → Process terminated

2. **Finance Approval** (Finance)
   - `financeApproved = true` → Continue to Logistics
   - `financeApproved = false` → Replenishment refused

3. **Delivery Conformity** (Logistics)
   - `deliveryConforming = true` → Continue to IT
   - `deliveryConforming = false` → Handle return

## 🧪 Test Scenarios

### Happy Path (Full Success)
1. Answer `yes` at stock verification
2. Answer `yes` at finance approval
3. Answer `yes` at delivery check
4. Complete IT system updates
5. **Result:** Stock successfully replenished ✅

### Rejection at Finance
1. Answer `yes` at stock verification
2. Answer `no` at finance approval
3. **Result:** Replenishment refused ❌

### Non-Conforming Delivery
1. Answer `yes` at stock verification
2. Answer `yes` at finance approval
3. Complete logistics PO processing
4. Answer `no` at delivery check
5. Complete return handling
6. **Result:** Delivery returned ❌

## 👥 Student Assignment

| Student | Department | Job Types | Complexity |
|---------|------------|-----------|------------|
| Student 1 | Data & Analytics | compute-replenishment-quantity | ⭐ Easy |
| Student 2 | Merchandising | create-replenishment-request, verify-stock | ⭐⭐ Medium |
| Student 3 | Finance | analyze-replenishment | ⭐⭐ Medium (decision) |
| Student 4 | Logistics | process-replenishment, check-delivery, handle-return | ⭐⭐⭐ Complex |
| Student 5 | IT | update-stock-systems | ⭐ Easy |

## 📁 Project Structure

```
workers-stock/
├── .env.example           # Credentials template
├── .env                   # Your credentials (create this)
├── package.json           # Root package with scripts
├── README.md              # This file
├── scripts/
│   ├── deploy-process.js  # Deploy BPMN to cluster
│   └── start-process.js   # Start process instance
├── data-analytics/        # compute-replenishment-quantity
├── merchandising/         # create-request, verify-stock
├── finance/               # analyze-replenishment
├── logistics/             # process, check-delivery, handle-return
└── it/                    # update-stock-systems
```

---

Built with ❤️ for the Urbanisation course project
