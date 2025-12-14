/**
 * Data Analysis Department UI Server
 * Port: 4001
 * Job Types: identify-products (Promotion), compute-replenishment-quantity (Stock)
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Camunda8 } = require('@camunda8/sdk');
const { callESB } = require('../ui-common/esb-client');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.UI_DATA_ANALYSIS_PORT || 4001;

// Zeebe client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

// In-memory task queue
const pendingTasks = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Data Analysis',
    deptName: 'Data & Analysis Department',
    deptIcon: '🔬',
    deptColor: 'indigo',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

// Start a new Promotion workflow
app.post('/start-workflow', async (req, res) => {
  try {
    const result = await zeebe.createProcessInstance({
      bpmnProcessId: 'ProductPromotionWorkflow',
      variables: {
        initiator: 'Data Analysis Web UI',
        requestTimestamp: new Date().toISOString(),
        reason: req.body.reason || 'Triggered from Web UI'
      }
    });
    
    console.log('\n🚀 New PROMOTION workflow started!');
    console.log('   Process Instance Key:', result.processInstanceKey);
    
    io.emit('workflow-started', {
      processInstanceKey: result.processInstanceKey,
      bpmnProcessId: result.bpmnProcessId,
      version: result.version,
      workflowType: 'promotion'
    });
    
    res.json({
      success: true,
      processInstanceKey: result.processInstanceKey,
      bpmnProcessId: result.bpmnProcessId,
      version: result.version
    });
  } catch (error) {
    console.error('Failed to start workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start a new Stock Replenishment workflow
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
    
    console.log('\n📦 New STOCK workflow started!');
    console.log('   Process Instance Key:', result.processInstanceKey);
    
    io.emit('workflow-started', {
      processInstanceKey: result.processInstanceKey,
      bpmnProcessId: result.bpmnProcessId,
      version: result.version,
      workflowType: 'stock'
    });
    
    res.json({
      success: true,
      processInstanceKey: result.processInstanceKey,
      bpmnProcessId: result.bpmnProcessId,
      version: result.version
    });
  } catch (error) {
    console.error('Failed to start stock workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete Promotion task (identify-products)
app.post('/complete-task', async (req, res) => {
  const { jobKey, productIds, reason, urgency } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB to transform data
    const esbResponse = await callESB('/api/identify-products', {
      productIds,
      reason,
      urgency
    });

    // Prepare result for Zeebe
    const products = typeof productIds === 'string' 
      ? productIds.split(',').map(p => p.trim()).filter(p => p)
      : productIds;

    const result = {
      targetProducts: products,
      productDetails: products.map((id, index) => ({
        id: id.toUpperCase(),
        name: `Product ${id}`,
        reason: reason || 'General promotion',
        currentStock: Math.floor(Math.random() * 200) + 50
      })),
      analysisTimestamp: new Date().toISOString(),
      urgency: urgency || 'medium',
      department: 'Data & Analysis',
      analyst: 'Web UI User',
      esbData: esbResponse.transformed
    };

    // Complete the Zeebe job
    await task.job.complete(result);
    
    // Remove from pending tasks
    pendingTasks.delete(jobKey);
    
    // Notify all clients
    io.emit('task-completed', { jobKey, result });
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete Stock task (compute-replenishment-quantity)
app.post('/complete-stock-task', async (req, res) => {
  const { jobKey, productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB to transform data
    const esbResponse = await callESB('/api/compute-replenishment', {
      productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays
    });

    // Calculate values
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

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current tasks to new client
  socket.emit('initial-tasks', Array.from(pendingTasks.values()).map(t => ({
    jobKey: t.job.key,
    variables: t.job.variables,
    taskType: t.taskType || 'identify-products'
  })));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Zeebe worker for Promotion workflow
const worker = zeebe.createWorker({
  taskType: 'identify-products',
  taskHandler: async (job) => {
    console.log(`\n📥 New PROMOTION task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'identify-products',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'identify-products'
    });
    
    return job.forward();
  }
});

// Zeebe worker for Stock workflow
const stockWorker = zeebe.createWorker({
  taskType: 'compute-replenishment-quantity',
  taskHandler: async (job) => {
    console.log(`\n📦 New STOCK task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'compute-replenishment-quantity',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'compute-replenishment-quantity'
    });
    
    return job.forward();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       🔬 DATA & ANALYSIS DEPARTMENT - Web UI                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types:                                                  ║');
  console.log('║    - identify-products (Promotion)                           ║');
  console.log('║    - compute-replenishment-quantity (Stock)                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Data & Analysis UI...');
  await worker.close();
  await stockWorker.close();
  await zeebe.close();
  server.close();
  process.exit(0);
});
