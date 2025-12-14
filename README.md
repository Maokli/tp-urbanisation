# 🏗️ Urbanisation Project - Distributed Workflow System

A comprehensive distributed system implementing **Product Promotion** and **Stock Replenishment** workflows using Camunda 8 (Zeebe), Enterprise Service Buses (ESBs), and Web UIs.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Components](#system-components)
- [ESB Layer](#esb-layer)
- [Web UI Layer](#web-ui-layer)
- [Workflows](#workflows)
- [Quick Start](#quick-start)
- [Port Reference](#port-reference)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD LAYER                                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     Camunda 8 SaaS (Zeebe)                                │  │
│  │              BPMN Workflow Engine & Orchestrator                          │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────────────┐    │  │
│  │  │ ProductPromotionWorkflow│  │ StockReplenishmentWorkflow          │    │  │
│  │  └─────────────────────────┘  └─────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ gRPC (Zeebe Protocol)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ESB LAYER (Mock)                                      │
│                                                                                  │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │        ESB1 (Port 3001)         │  │         ESB2 (Port 3002)            │  │
│  │   http://localhost:3001         │  │    http://localhost:3002            │  │
│  │                                 │  │                                     │  │
│  │  📊 Data Analysis Services      │  │  🛒 Commercial Services             │  │
│  │  💰 Finance Services            │  │  📢 Marketing Services              │  │
│  │  📦 Stock Analysis Services     │  │  💻 IT Services                     │  │
│  │                                 │  │  🚚 Logistics Services              │  │
│  │                                 │  │  🏷️ Merchandising Services          │  │
│  └─────────────────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTP REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            WEB UI LAYER                                          │
│                                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │  Data      │ │ Commercial │ │  Finance   │ │ Marketing  │ │    IT      │    │
│  │ Analysis   │ │ & Purchase │ │ & Account  │ │            │ │            │    │
│  │ Port 4001  │ │ Port 4002  │ │ Port 4003  │ │ Port 4004  │ │ Port 4005  │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                                  │
│  ┌────────────┐ ┌────────────┐                                                  │
│  │ Logistics  │ │Merchandis- │                                                  │
│  │ & Warehouse│ │   ing      │                                                  │
│  │ Port 4006  │ │ Port 4007  │                                                  │
│  └────────────┘ └────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 System Components

### BPMN Process Files

| File | Description |
|------|-------------|
| `process-zeebe.bpmn` | Product Promotion Workflow (Camunda 8 format) |
| `process-zeebe-interactive.bpmn` | Interactive version with user tasks |
| `stock-management-zeebe.bpmn` | Stock Replenishment Workflow |

---

## 🔀 ESB Layer

The ESB (Enterprise Service Bus) layer provides a unified API gateway for all department services. Each ESB groups related services by domain.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 ESB ROUTING                                      │
│                                                                                  │
│   ┌─────────────────────────────────┐    ┌─────────────────────────────────┐   │
│   │         ESB1 (Port 3001)        │    │         ESB2 (Port 3002)        │   │
│   │    http://localhost:3001        │    │    http://localhost:3002        │   │
│   │                                 │    │                                 │   │
│   │  ┌───────────────────────────┐  │    │  ┌───────────────────────────┐  │   │
│   │  │   📊 DATA ANALYSIS        │  │    │  │   🛒 COMMERCIAL           │  │   │
│   │  │   /api/identify-products  │  │    │  │   /api/propose-promotion  │  │   │
│   │  │   /api/compute-           │  │    │  │   /api/prepare-instore    │  │   │
│   │  │      replenishment        │  │    │  │   /api/update-physical-   │  │   │
│   │  └───────────────────────────┘  │    │  │      prices               │  │   │
│   │                                 │    │  └───────────────────────────┘  │   │
│   │  ┌───────────────────────────┐  │    │                                 │   │
│   │  │   💰 FINANCE              │  │    │  ┌───────────────────────────┐  │   │
│   │  │   /api/evaluate-          │  │    │  │   📢 MARKETING            │  │   │
│   │  │      profitability        │  │    │  │   /api/prepare-marketing  │  │   │
│   │  │   /api/analyze-           │  │    │  └───────────────────────────┘  │   │
│   │  │      replenishment        │  │    │                                 │   │
│   │  └───────────────────────────┘  │    │  ┌───────────────────────────┐  │   │
│   │                                 │    │  │   💻 IT                    │  │   │
│   └─────────────────────────────────┘    │  │   /api/update-prices      │  │   │
│                                          │  │   /api/update-stock-      │  │   │
│                                          │  │      systems              │  │   │
│                                          │  └───────────────────────────┘  │   │
│                                          │                                 │   │
│                                          │  ┌───────────────────────────┐  │   │
│                                          │  │   🚚 LOGISTICS            │  │   │
│                                          │  │   /api/process-           │  │   │
│                                          │  │      replenishment        │  │   │
│                                          │  │   /api/check-delivery     │  │   │
│                                          │  │   /api/handle-return      │  │   │
│                                          │  └───────────────────────────┘  │   │
│                                          │                                 │   │
│                                          │  ┌───────────────────────────┐  │   │
│                                          │  │   🏷️ MERCHANDISING        │  │   │
│                                          │  │   /api/create-            │  │   │
│                                          │  │      replenishment        │  │   │
│                                          │  │   /api/verify-stock       │  │   │
│                                          │  └───────────────────────────┘  │   │
│                                          │                                 │   │
│                                          └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### ESB1 - Data Analysis & Finance Services

**URL:** `http://localhost:3001`

**Services Hosted:**
- 📊 **Data Analysis Department** - Product identification & stock computation
- 💰 **Finance Department** - Profitability evaluation & budget analysis

| Endpoint | Method | Description | Department |
|----------|--------|-------------|------------|
| `/api/identify-products` | POST | Identify products for promotion | Data Analysis |
| `/api/evaluate-profitability` | POST | Evaluate promotion profitability | Finance |
| `/api/compute-replenishment` | POST | Calculate reorder quantities | Data Analysis |
| `/api/analyze-replenishment` | POST | Budget analysis for stock orders | Finance |
| `/health` | GET | Health check | System |

### ESB2 - Commercial, Marketing, IT, Logistics & Merchandising Services

**URL:** `http://localhost:3002`

**Services Hosted:**
- 🛒 **Commercial Department** - Discount proposals & price updates
- 📢 **Marketing Department** - Promotional materials
- 💻 **IT Department** - System price & stock updates
- 🚚 **Logistics Department** - Order processing & delivery management
- 🏷️ **Merchandising Department** - Stock requests & verification

| Endpoint | Method | Description | Department |
|----------|--------|-------------|------------|
| `/api/propose-promotion` | POST | Propose discount strategy | Commercial |
| `/api/prepare-instore` | POST | Prepare in-store updates | Commercial |
| `/api/update-physical-prices` | POST | Update physical price labels | Commercial |
| `/api/prepare-marketing` | POST | Prepare marketing materials | Marketing |
| `/api/update-prices` | POST | Update system prices | IT |
| `/api/update-stock-systems` | POST | Update ERP/WMS/POS stock levels | IT |
| `/api/create-replenishment` | POST | Create replenishment request | Merchandising |
| `/api/verify-stock` | POST | Verify stock after replenishment | Merchandising |
| `/api/process-replenishment` | POST | Process supplier order | Logistics |
| `/api/check-delivery` | POST | Check delivery status | Logistics |
| `/api/handle-return` | POST | Process returns | Logistics |
| `/health` | GET | Health check | System |

---

## 🖥️ Web UI Layer

### Product Promotion Workflow UIs

| UI | Port | URL | Job Types |
|----|------|-----|-----------|
| 📊 Data Analysis | 4001 | http://localhost:4001 | `identify-products` |
| 🛒 Commercial | 4002 | http://localhost:4002 | `propose-promotion`, `prepare-instore-update`, `update-physical-prices` |
| 💰 Finance | 4003 | http://localhost:4003 | `evaluate-profitability` |
| 📢 Marketing | 4004 | http://localhost:4004 | `prepare-promotion-material` |
| 💻 IT | 4005 | http://localhost:4005 | `update-system-prices` |

### Stock Replenishment Workflow UIs

| UI | Port | URL | Job Types |
|----|------|-----|-----------|
| 📊 Data Analysis | 4001 | http://localhost:4001 | `compute-replenishment-quantity` |
| 💰 Finance | 4003 | http://localhost:4003 | `analyze-replenishment` |
| 💻 IT | 4005 | http://localhost:4005 | `update-stock-systems` |
| 🚚 Logistics | 4006 | http://localhost:4006 | `process-replenishment`, `check-delivery`, `handle-return` |
| 🏷️ Merchandising | 4007 | http://localhost:4007 | `create-replenishment-request`, `verify-stock` |

---

## 🔄 Workflows

### Product Promotion Workflow

```
START → Data Analysis (identify-products)
           ↓
    ┌──────┴──────┐ (Parallel)
    ↓             ↓
Commercial    Commercial
(propose)     (prepare-instore)
    ↓             ↓
    └──────┬──────┘
           ↓
    Finance (evaluate-profitability)
           ↓
    ┌── Approved? ──┐
    ↓ YES           ↓ NO
    ↓               END (Refused)
    ↓
┌───┴───┬───────────┐ (Parallel)
↓       ↓           ↓
Marketing  IT    Commercial
(prepare)  (update) (physical)
↓       ↓           ↓
└───────┴───────────┘
           ↓
    END (Promotion Live!)
```

### Stock Replenishment Workflow

```
START → Merchandising (create-replenishment-request)
           ↓
    Data Analysis (compute-replenishment-quantity)
           ↓
    Finance (analyze-replenishment)
           ↓
    ┌── Budget Approved? ──┐
    ↓ YES                  ↓ NO
    ↓                      END (Refused)
    ↓
    Logistics (process-replenishment)
           ↓
    Logistics (check-delivery)
           ↓
    ┌── Delivery OK? ──┐
    ↓ YES              ↓ NO
    ↓                  Logistics (handle-return)
    ↓                      ↓
    └──────────────────────┘
           ↓
    IT (update-stock-systems)
           ↓
    Merchandising (verify-stock)
           ↓
    END (Stock Replenished!)
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd workers
npm install
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Camunda 8 credentials
```

### 3. Deploy BPMN Processes

```bash
node scripts/deploy-process.js
```

### 4. Start All Services

```bash
# Start ESBs + All Web UIs (recommended)
npm run start:web
```

### 5. Access the UIs

- **Start Promotion Workflow:** http://localhost:4001 → Click "🚀 Start New Workflow"
- **Start Stock Workflow:** http://localhost:4001 → Click "📦 Start Stock Workflow"

---

## 📍 Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| ESB1 | 3001 | Data Analysis & Finance APIs |
| ESB2 | 3002 | Commercial, Marketing, IT, Logistics, Merchandising APIs |
| UI Data Analysis | 4001 | Entry point for both workflows |
| UI Commercial | 4002 | Commercial & Purchasing tasks |
| UI Finance | 4003 | Approval authority |
| UI Marketing | 4004 | Marketing preparation |
| UI IT | 4005 | System updates |
| UI Logistics | 4006 | Order processing & delivery |
| UI Merchandising | 4007 | Stock requests & verification |

---

## 📁 Project Structure

```
services/
├── README.md                        # This file
├── process-zeebe.bpmn               # Product Promotion BPMN
├── process-zeebe-interactive.bpmn   # Interactive version
├── stock-management-zeebe.bpmn      # Stock Replenishment BPMN
├── spec.md                          # Technical specification
│
├── workers/                         # All workers and UIs
│   ├── .env                         # Environment configuration
│   ├── package.json                 # Root package with scripts
│   │
│   ├── esb1/                        # ESB1 - Port 3001
│   │   └── index.js
│   ├── esb2/                        # ESB2 - Port 3002
│   │   └── index.js
│   ├── ui-common/                   # Shared utilities
│   │   └── esb-client.js            # ESB routing client
│   │
│   ├── ui-data-analysis/            # Port 4001
│   ├── ui-commercial/               # Port 4002
│   ├── ui-finance/                  # Port 4003
│   ├── ui-marketing/                # Port 4004
│   ├── ui-it/                       # Port 4005
│   ├── ui-logistics/                # Port 4006
│   ├── ui-merchandising/            # Port 4007
│   │
│   └── scripts/
│       ├── deploy-process.js        # Deploy BPMN to Zeebe
│       └── start-process.js         # Start workflow instance
│
└── workers-stock/                   # (Deprecated - merged into workers/)
```

---

## 🛠️ Technologies

- **Workflow Engine:** Camunda 8 SaaS (Zeebe)
- **Backend:** Node.js, Express.js
- **Real-time:** Socket.io
- **Templating:** EJS
- **Styling:** Tailwind CSS (CDN)
- **SDK:** @camunda8/sdk

---

Built with ❤️ for the Urbanisation course project
