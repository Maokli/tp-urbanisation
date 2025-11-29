# 🛒 Product Promotion Workflow - Distributed System

A distributed BPMN workflow system for managing product promotions across multiple departments. Built with **Camunda 8 SaaS**, **Node.js Zeebe workers**, and designed for student projects where team members work from different locations.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [Setup Guide](#setup-guide)
- [Running the Workers](#running-the-workers)
- [Testing the Workflow](#testing-the-workflow)
- [Department Assignment](#department-assignment)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLOUD (Camunda 8 SaaS)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Zeebe Workflow Engine                        │   │
│  │         (Orchestrates the BPMN process, manages jobs)           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ gRPC (outbound only)
                                    │ Works behind NAT/firewall
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Student 1   │          │  Student 2   │          │  Student 3   │
│  Laptop      │          │  Laptop      │          │  Laptop      │
│              │          │              │          │              │
│ ┌──────────┐ │          │ ┌──────────┐ │          │ ┌──────────┐ │
│ │  Data &  │ │          │ │Commercial│ │          │ │ Finance  │ │
│ │ Analysis │ │          │ │& Purchase│ │          │ │& Account │ │
│ │  Worker  │ │          │ │  Worker  │ │          │ │  Worker  │ │
│ └──────────┘ │          │ └──────────┘ │          │ └──────────┘ │
└──────────────┘          └──────────────┘          └──────────────┘
     Paris                    Marseille                   Lyon
```

**Key Benefits:**
- ✅ Works from anywhere (home, university, coffee shop)
- ✅ No VPN or port forwarding needed
- ✅ Each student runs their worker independently
- ✅ Real-time progress visible in Camunda Operate

## 📦 Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Camunda 8 SaaS Account** (free) - [Sign up](https://camunda.com/get-started/)
3. **Git** (optional)

## ⚡ Quick Start (5 Minutes)

### Step 1: Create Camunda Cluster (ONE student does this)

1. Go to [Camunda Console](https://console.cloud.camunda.io)
2. Create a new cluster (free tier is fine)
3. Wait ~2 minutes for cluster to be ready
4. Go to **API** tab → **Create new client**
5. Select scopes: `Zeebe`, `Operate`, `Tasklist`
6. **Download** or copy the credentials

### Step 2: Share Credentials with Team

Share these values with your team (via Discord, WhatsApp, etc.):
- `ZEEBE_ADDRESS`
- `ZEEBE_CLIENT_ID`
- `ZEEBE_CLIENT_SECRET`

### Step 3: Configure Your Worker

```bash
cd workers
cp .env.example .env
```

Edit `.env` with the shared credentials:
```env
ZEEBE_ADDRESS=abc123.bru-2.zeebe.camunda.io:443
ZEEBE_CLIENT_ID=your-client-id
ZEEBE_CLIENT_SECRET=your-client-secret
```

### Step 4: Install & Run Your Worker

Each student runs their assigned worker:

```bash
# Example: If you're the Data & Analysis student
cd workers/data-analysis
npm install
npm start
```

### Step 5: Deploy & Start the Process

One student deploys the process and starts an instance:

```bash
cd workers
npm install  # Install root dependencies
node scripts/deploy-process.js
node scripts/start-process.js
```

## 🔧 Setup Guide

### Project Structure

```
services/
├── process-zeebe.bpmn          # BPMN process definition (Camunda 8 format)
├── process.xml                  # Original BPMN (reference)
├── spec.md                      # Technical specification
└── workers/
    ├── .env.example             # Template for credentials
    ├── .env                     # Your credentials (create this)
    ├── package.json             # Root package with scripts
    ├── scripts/
    │   ├── deploy-process.js    # Deploy BPMN to cluster
    │   └── start-process.js     # Start a process instance
    ├── data-analysis/           # Data & Analysis worker
    ├── commercial/              # Commercial & Purchasing worker (3 jobs)
    ├── finance/                 # Finance & Accounting worker
    ├── marketing/               # Marketing worker
    └── it/                      # IT worker
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ZEEBE_ADDRESS` | Cluster address with port | `abc123.bru-2.zeebe.camunda.io:443` |
| `ZEEBE_CLIENT_ID` | OAuth client ID | `Dxh~...` |
| `ZEEBE_CLIENT_SECRET` | OAuth client secret | `XPr...` |
| `ZEEBE_AUTHORIZATION_SERVER_URL` | OAuth server | `https://login.cloud.camunda.io/oauth/token` |

## 🏃 Running the Workers

### Individual Worker (Normal Mode)

Each student runs their department's worker:

```bash
# Data & Analysis
cd workers/data-analysis && npm install && npm start

# Commercial & Purchasing
cd workers/commercial && npm install && npm start

# Finance & Accounting
cd workers/finance && npm install && npm start

# Marketing
cd workers/marketing && npm install && npm start

# IT
cd workers/it && npm install && npm start
```

### All Workers (Demo Mode)

For testing or demos, run all workers on one machine:

```bash
cd workers
npm install
npm run install:all
npm run start:all
```

## 🧪 Testing the Workflow

### 1. Deploy the Process

```bash
cd workers
node scripts/deploy-process.js
```

Expected output:
```
🚀 Deploying BPMN Process to Camunda 8...

✅ Process deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Deployment Details:
   Key: 2251799813685249
   BPMN Process ID: ProductPromotionWorkflow
   Version: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Start a Process Instance

```bash
node scripts/start-process.js
```

### 3. Watch in Camunda Operate

1. Go to [Camunda Console](https://console.cloud.camunda.io)
2. Click **Operate** for your cluster
3. See the process instance moving through tasks
4. Watch worker console output as jobs are completed

### 4. Test the Rejection Path

Edit `workers/finance/worker.js`:
```javascript
const APPROVED = false;  // Change from true to false
```

Restart the finance worker and start a new process instance.

## 👥 Department Assignment

| Department | Job Types | Complexity |
|------------|-----------|------------|
| Data & Analysis | `identify-products` | ⭐ Easy |
| Commercial & Purchasing | `propose-promotion`, `prepare-instore-update`, `update-physical-prices` | ⭐⭐ Medium |
| Finance & Accounting | `evaluate-profitability` | ⭐⭐ Medium (controls approval) |
| Marketing | `prepare-promotion-material` | ⭐ Easy |
| IT | `update-system-prices` | ⭐ Easy |

## 🔍 Workflow Steps

```
1. START → Data & Analysis identifies products to promote
                    ↓
2. PARALLEL SPLIT → Commercial proposes discount strategy
                  → Commercial prepares in-store updates
                    ↓
3. JOIN → Finance evaluates profitability
                    ↓
4. DECISION → Approved? 
              → YES → Marketing publishes promotion
                      → IT updates all systems
                      → Commercial updates physical labels
                      → END (Promotion Live!)
              → NO  → END (Promotion Refused)
```

## 🐛 Troubleshooting

### "Connection refused" or "UNAVAILABLE"

- Check your `.env` file has correct credentials
- Ensure cluster is running (check Camunda Console)
- Verify `ZEEBE_ADDRESS` includes port `:443`

### "Invalid client credentials"

- Double-check `ZEEBE_CLIENT_ID` and `ZEEBE_CLIENT_SECRET`
- Credentials may have expired - create new ones in Console

### Worker not receiving jobs

- Ensure process is deployed (`node scripts/deploy-process.js`)
- Start a process instance (`node scripts/start-process.js`)
- Check that your worker's job type matches the BPMN task definition

### "Process definition not found"

- Deploy the process first before starting instances
- Check the BPMN file path in deploy script

## 📚 Additional Resources

- [Camunda 8 Documentation](https://docs.camunda.io/)
- [Zeebe Node.js Client](https://github.com/camunda/camunda-8-js-sdk)
- [BPMN 2.0 Specification](https://www.bpmn.org/)

## 🎓 For Professors

This project demonstrates:
- Distributed systems architecture
- BPMN workflow orchestration
- Microservices communication patterns
- Cloud-native design (works behind NAT)
- Real-world ESB integration concepts

---

Built with ❤️ for the Urbanisation course project
