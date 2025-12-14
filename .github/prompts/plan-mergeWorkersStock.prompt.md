# Plan: Merge workers-stock into workers

## Overview

The `workers-stock` project handles a **Stock Replenishment Workflow** (`StockReplenishmentWorkflow`) which is separate from the existing **Product Promotion Workflow** (`ProductPromotionWorkflow`). The departments have the same names but handle different job types.

**Goal**: Add the stock management job handlers to existing UIs (Data Analysis, Finance, IT) and create 2 new UIs (Logistics, Merchandising). Extend ESBs with new endpoints for stock data transformations. Both workflows will run in parallel.

## Port Assignments

| Component | Port | Purpose |
|-----------|------|---------|
| ESB1 | 3001 | Data Analysis & Finance endpoints (existing + stock) |
| ESB2 | 3002 | Commercial, Marketing, IT, Logistics, Merchandising endpoints |
| UI - Data Analysis | 4001 | `identify-products` + `compute-replenishment-quantity` |
| UI - Commercial | 4002 | `propose-promotion`, `prepare-instore-update`, `update-physical-prices` |
| UI - Finance | 4003 | `evaluate-profitability` + `analyze-replenishment` |
| UI - Marketing | 4004 | `prepare-promotion-material` |
| UI - IT | 4005 | `update-system-prices` + `update-stock-systems` |
| UI - Logistics | 4006 | `process-replenishment`, `check-delivery`, `handle-return` (NEW) |
| UI - Merchandising | 4007 | `create-replenishment-request`, `verify-stock` (NEW) |

## Job Types Summary

### Existing (Product Promotion Workflow)
- `identify-products` → Data Analysis
- `propose-promotion`, `prepare-instore-update`, `update-physical-prices` → Commercial
- `evaluate-profitability` → Finance (approval decision)
- `prepare-promotion-material` → Marketing
- `update-system-prices` → IT

### New (Stock Replenishment Workflow)
- `compute-replenishment-quantity` → Data Analysis
- `create-replenishment-request`, `verify-stock` → Merchandising
- `analyze-replenishment` → Finance (approval decision)
- `process-replenishment`, `check-delivery`, `handle-return` → Logistics
- `update-stock-systems` → IT

---

## Step 1: Add Stock Endpoints to `esb1/index.js`

Add before the health check endpoint:

```javascript
/**
 * POST /api/compute-replenishment
 * 
 * Transforms replenishment quantity calculation:
 * - Calculate reorder point based on lead time and safety stock
 * - Generate recommended order quantity
 */
app.post('/api/compute-replenishment', (req, res) => {
  const { productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays } = req.body;

  const dailySales = parseFloat(avgDailySales) || 10;
  const leadTime = parseInt(leadTimeDays) || 7;
  const safetyDays = parseInt(safetyStockDays) || 5;
  const current = parseInt(currentStock) || 0;

  const reorderPoint = dailySales * (leadTime + safetyDays);
  const recommendedQty = Math.max(0, Math.ceil(reorderPoint - current + (dailySales * 14)));

  const response = {
    success: true,
    original: { productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays },
    transformed: {
      productId: productId || 'SKU-UNKNOWN',
      reorderPoint: Math.ceil(reorderPoint),
      recommendedQuantity: recommendedQty,
      calculationMethod: 'Safety Stock + Lead Time + 2-Week Buffer',
      projectedDaysOfStock: current > 0 ? Math.ceil(current / dailySales) : 0,
      urgencyLevel: current < reorderPoint ? 'high' : current < reorderPoint * 1.5 ? 'medium' : 'low',
      calculatedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'compute-replenishment'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/analyze-replenishment
 */
app.post('/api/analyze-replenishment', (req, res) => {
  const { unitCost, budget, moq, orderQuantity, paymentTerms, approved } = req.body;

  const cost = parseFloat(unitCost) || 10;
  const qty = parseInt(orderQuantity) || 100;
  const totalCost = cost * qty;
  const availableBudget = parseFloat(budget) || 10000;
  const withinBudget = totalCost <= availableBudget;

  const response = {
    success: true,
    original: { unitCost, budget, moq, orderQuantity, paymentTerms, approved },
    transformed: {
      totalOrderCost: totalCost,
      budgetRemaining: availableBudget - totalCost,
      withinBudget,
      financialScore: withinBudget ? 'FAVORABLE' : 'UNFAVORABLE',
      recommendation: approved ? 'PROCEED_WITH_ORDER' : 'ORDER_REJECTED',
      analyzedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'analyze-replenishment'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});
```

---

## Step 2: Add Stock Endpoints to `esb2/index.js`

Add before the health check endpoint:

```javascript
/**
 * POST /api/create-replenishment
 */
app.post('/api/create-replenishment', (req, res) => {
  const { productId, productName, orderQuantity, priority, notes } = req.body;
  
  const response = {
    success: true,
    transformed: {
      requestId: `REQ-${Date.now()}`,
      productId,
      productName,
      orderQuantity: parseInt(orderQuantity) || 100,
      priority: priority || 'medium',
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'create-replenishment'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/verify-stock
 */
app.post('/api/verify-stock', (req, res) => {
  const { physicalCount, currentStock, location, verified } = req.body;
  
  const response = {
    success: true,
    transformed: {
      stockVerified: verified === true || verified === 'yes',
      physicalStockCount: parseInt(physicalCount) || 0,
      systemStockCount: parseInt(currentStock) || 0,
      discrepancy: Math.abs((parseInt(physicalCount) || 0) - (parseInt(currentStock) || 0)),
      stockLocation: location || 'Warehouse A',
      verifiedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'verify-stock'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/process-replenishment
 */
app.post('/api/process-replenishment', (req, res) => {
  const { supplier, supplierId, orderQuantity, totalCost, shippingMethod, estimatedDelivery } = req.body;
  
  const poNumber = `PO-${Date.now()}`;
  const tracking = `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const response = {
    success: true,
    transformed: {
      purchaseOrderNumber: poNumber,
      trackingNumber: tracking,
      supplierId: supplierId || 'SUP-001',
      supplierName: supplier || 'Default Supplier',
      poStatus: 'issued',
      shippingMethod: shippingMethod || 'standard',
      estimatedDeliveryDate: estimatedDelivery || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'process-replenishment'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/check-delivery
 */
app.post('/api/check-delivery', (req, res) => {
  const { receivedQty, damagedQty, qualityScore, conforming } = req.body;
  
  const received = parseInt(receivedQty) || 0;
  const damaged = parseInt(damagedQty) || 0;
  
  const response = {
    success: true,
    transformed: {
      deliveryConforming: conforming === true || conforming === 'yes',
      quantityReceived: received,
      quantityAccepted: received - damaged,
      quantityDamaged: damaged,
      qualityScore: parseInt(qualityScore) || 8,
      inspectedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'check-delivery'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/handle-return
 */
app.post('/api/handle-return', (req, res) => {
  const { returnReason, refundRequested, replacementRequested, quantityReturned, notes } = req.body;
  
  const response = {
    success: true,
    transformed: {
      rmaNumber: `RMA-${Date.now()}`,
      returnReason: returnReason || 'quality',
      refundRequested: refundRequested === true || refundRequested === 'yes',
      replacementRequested: replacementRequested === true || replacementRequested === 'yes',
      quantityReturned: parseInt(quantityReturned) || 0,
      returnStatus: 'initiated',
      processedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'handle-return'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/update-stock-systems
 */
app.post('/api/update-stock-systems', (req, res) => {
  const { erpUpdated, wmsUpdated, posUpdated, previousStock, quantityAdded, newStockLevel } = req.body;
  
  const toBool = (val) => val === true || val === 'true' || val === 'yes';
  
  const response = {
    success: true,
    transformed: {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        erp: toBool(erpUpdated) ? 'updated' : 'pending',
        wms: toBool(wmsUpdated) ? 'updated' : 'pending',
        pos: toBool(posUpdated) ? 'synchronized' : 'pending'
      },
      stockLevels: {
        previousStock: parseInt(previousStock) || 0,
        quantityAdded: parseInt(quantityAdded) || 0,
        newStockLevel: parseInt(newStockLevel) || 0
      },
      syncTimestamp: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'update-stock-systems'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});
```

---

## Step 3: Update `ui-common/esb-client.js`

Add the new endpoints to the routing map:

```javascript
const endpointToESB = {
  // Existing promotion endpoints
  '/api/identify-products': ESB1_URL,
  '/api/evaluate-profitability': ESB1_URL,
  '/api/propose-promotion': ESB2_URL,
  '/api/prepare-instore': ESB2_URL,
  '/api/update-physical-prices': ESB2_URL,
  '/api/prepare-materials': ESB2_URL,
  '/api/update-prices': ESB2_URL,
  // Stock management endpoints
  '/api/compute-replenishment': ESB1_URL,
  '/api/analyze-replenishment': ESB1_URL,
  '/api/create-replenishment': ESB2_URL,
  '/api/verify-stock': ESB2_URL,
  '/api/process-replenishment': ESB2_URL,
  '/api/check-delivery': ESB2_URL,
  '/api/handle-return': ESB2_URL,
  '/api/update-stock-systems': ESB2_URL
};
```

---

## Step 4: Update `ui-data-analysis/server.js`

Add second worker for stock and a "Start Stock Workflow" endpoint.

### Add `/start-stock-workflow` endpoint:

```javascript
app.post('/start-stock-workflow', async (req, res) => {
  try {
    const result = await zeebe.createProcessInstance({
      bpmnProcessId: 'StockReplenishmentWorkflow',
      variables: {
        initiator: 'Data Analysis Web UI',
        requestTimestamp: new Date().toISOString(),
        reason: req.body.reason || 'Stock replenishment triggered from Web UI'
      }
    });
    
    console.log('\n📦 New stock workflow started!');
    console.log('   Process Instance Key:', result.processInstanceKey);
    
    io.emit('workflow-started', {
      processInstanceKey: result.processInstanceKey,
      bpmnProcessId: result.bpmnProcessId,
      workflowType: 'stock'
    });
    
    res.json({ success: true, processInstanceKey: result.processInstanceKey, bpmnProcessId: result.bpmnProcessId });
  } catch (error) {
    console.error('Failed to start stock workflow:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Add `/complete-stock-task` endpoint:

```javascript
app.post('/complete-stock-task', async (req, res) => {
  const { jobKey, productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const esbResponse = await callESB('/api/compute-replenishment', {
      productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays
    });

    const dailySales = parseFloat(avgDailySales) || 10;
    const leadTime = parseInt(leadTimeDays) || 7;
    const safetyDays = parseInt(safetyStockDays) || 5;
    const current = parseInt(currentStock) || 0;
    const reorderPoint = dailySales * (leadTime + safetyDays);
    const recommendedQty = Math.max(0, Math.ceil(reorderPoint - current + (dailySales * 14)));

    const result = {
      productId: productId || 'SKU-UNKNOWN',
      productName: productName || 'Unknown Product',
      currentStock: current,
      averageDailySales: dailySales,
      leadTimeDays: leadTime,
      safetyStockDays: safetyDays,
      reorderPoint: Math.ceil(reorderPoint),
      recommendedQuantity: recommendedQty,
      calculationMethod: 'Safety Stock + Lead Time + 2-Week Buffer',
      analysisTimestamp: new Date().toISOString(),
      department: 'Data & Analytics',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing stock task:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Add second Zeebe worker:

```javascript
const stockWorker = zeebe.createWorker({
  taskType: 'compute-replenishment-quantity',
  taskHandler: async (job) => {
    console.log(`\n📦 New STOCK task received: ${job.key}`);
    pendingTasks.set(job.key, { job, receivedAt: new Date().toISOString() });
    io.emit('new-task', { jobKey: job.key, variables: job.variables, taskType: 'compute-replenishment-quantity' });
    return job.forward();
  }
});
```

### Update graceful shutdown:

```javascript
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Data & Analysis UI...');
  await worker.close();
  await stockWorker.close();
  await zeebe.close();
  server.close();
  process.exit(0);
});
```

### Update `ui-data-analysis/views/index.ejs`:

Add "Start Stock Workflow" button next to existing button in header, and add stock task form.

---

## Step 5: Update `ui-finance/server.js`

Add worker for `analyze-replenishment` job type with approval/rejection decision.

### Add `/complete-stock-task` endpoint with approval logic
### Add second Zeebe worker for `analyze-replenishment`
### Update view with stock analysis form (budget, unit cost, MOQ, approve/reject)

---

## Step 6: Update `ui-it/server.js`

Add worker for `update-stock-systems` job type for ERP/WMS/POS updates.

### Add `/complete-stock-task` endpoint
### Add second Zeebe worker for `update-stock-systems`
### Update view with stock system update form (ERP, WMS, POS checkboxes)

---

## Step 7: Create `ui-logistics/` (Port 4006)

Create new folder `workers/ui-logistics/` with:

### `package.json`:
```json
{
  "name": "ui-logistics",
  "version": "1.0.0",
  "description": "Logistics & Procurement Department UI - Stock Management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {}
}
```

### `server.js`:
- Handle job types: `process-replenishment`, `check-delivery`, `handle-return`
- Port: 4006
- Three Zeebe workers
- Three form handlers

### `views/index.ejs`:
- Orange/amber theme (🚚 emoji)
- Forms for: PO issuance, delivery inspection (accept/reject decision), returns handling

---

## Step 8: Create `ui-merchandising/` (Port 4007)

Create new folder `workers/ui-merchandising/` with:

### `package.json`:
```json
{
  "name": "ui-merchandising",
  "version": "1.0.0",
  "description": "Merchandising Department UI - Stock Management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {}
}
```

### `server.js`:
- Handle job types: `create-replenishment-request`, `verify-stock`
- Port: 4007
- Two Zeebe workers
- Two form handlers

### `views/index.ejs`:
- Purple theme (🏪 emoji)
- Forms for: replenishment request creation, stock verification (confirmation decision)

---

## Step 9: Update `package.json` scripts

```json
{
  "scripts": {
    "install:uis": "cd ui-data-analysis && npm install && cd ../ui-commercial && npm install && cd ../ui-finance && npm install && cd ../ui-marketing && npm install && cd ../ui-it && npm install && cd ../ui-logistics && npm install && cd ../ui-merchandising && npm install",
    "ui:logistics": "cd ui-logistics && node server.js",
    "ui:merchandising": "cd ui-merchandising && node server.js",
    "ui:all": "concurrently \"npm:ui:data-analysis\" \"npm:ui:commercial\" \"npm:ui:finance\" \"npm:ui:marketing\" \"npm:ui:it\" \"npm:ui:logistics\" \"npm:ui:merchandising\""
  }
}
```

---

## Step 10: Update `.env.example`

Add new environment variables:

```
UI_LOGISTICS_PORT=4006
UI_MERCHANDISING_PORT=4007
```

---

## Checklist

- [ ] ESB1: Add `/api/compute-replenishment` endpoint
- [ ] ESB1: Add `/api/analyze-replenishment` endpoint
- [ ] ESB2: Add `/api/create-replenishment` endpoint
- [ ] ESB2: Add `/api/verify-stock` endpoint
- [ ] ESB2: Add `/api/process-replenishment` endpoint
- [ ] ESB2: Add `/api/check-delivery` endpoint
- [ ] ESB2: Add `/api/handle-return` endpoint
- [ ] ESB2: Add `/api/update-stock-systems` endpoint
- [ ] ui-common/esb-client.js: Add stock endpoint routing
- [ ] ui-data-analysis: Add stock worker + form + "Start Stock Workflow" button
- [ ] ui-finance: Add stock worker + form (approval decision)
- [ ] ui-it: Add stock worker + form
- [ ] ui-logistics: Create new UI (port 4006)
- [ ] ui-merchandising: Create new UI (port 4007)
- [ ] package.json: Add new scripts
- [ ] .env.example: Add new port variables
- [ ] Test full stock workflow end-to-end
