/**
 * Logistics Department UI Server
 * Port: 4006
 * Job Types: 
 *   - process-replenishment (Stock Replenishment Workflow)
 *   - check-delivery (Stock Replenishment Workflow)
 *   - handle-return (Stock Replenishment Workflow)
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
const PORT = process.env.UI_LOGISTICS_PORT || 4006;

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
    title: 'Logistics',
    deptName: 'Logistics & Warehouse Department',
    deptIcon: '🚚',
    deptColor: 'purple',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

// Process replenishment order
app.post('/complete-replenishment', async (req, res) => {
  const { jobKey, supplierId, orderQuantity, expedited, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/process-replenishment', {
      productId: task.job.variables.productId,
      supplierId,
      orderQuantity: parseInt(orderQuantity),
      expedited: expedited === 'true' || expedited === true
    });

    const result = {
      orderPlaced: true,
      orderId: esbResponse.transformed?.orderId || `PO-${Date.now()}`,
      supplierId: supplierId || 'SUP-001',
      orderQuantity: parseInt(orderQuantity) || task.job.variables.recommendedQuantity || 100,
      expedited: expedited === 'true' || expedited === true,
      estimatedDelivery: esbResponse.transformed?.estimatedDelivery || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      orderNotes: notes || 'Order placed via Logistics Web UI',
      processedAt: new Date().toISOString(),
      department: 'Logistics',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing replenishment task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check delivery status
app.post('/complete-delivery', async (req, res) => {
  const { jobKey, deliveryStatus, quantityReceived, damageReport, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isDelivered = deliveryStatus === 'delivered';
    const hasDamage = damageReport && damageReport.trim() !== '';
    const isConforming = isDelivered && !hasDamage;

    // Call ESB
    const esbResponse = await callESB('/api/check-delivery', {
      orderId: task.job.variables.orderId,
      deliveryStatus,
      quantityReceived: parseInt(quantityReceived),
      hasDamage
    });

    const result = {
      deliveryConforming: isConforming,  // Required by BPMN gateway condition
      deliveryStatus,
      deliveryComplete: isDelivered,
      quantityReceived: parseInt(quantityReceived) || task.job.variables.orderQuantity || 100,
      quantityExpected: task.job.variables.orderQuantity || 100,
      hasDamage,
      damageReport: damageReport || null,
      requiresReturn: hasDamage,
      checkedAt: new Date().toISOString(),
      checkedBy: 'Web UI User',
      deliveryNotes: notes || (isDelivered ? 'Delivery received and verified' : 'Delivery pending'),
      department: 'Logistics',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing delivery task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle return
app.post('/complete-return', async (req, res) => {
  const { jobKey, returnQuantity, returnReason, replacementRequested, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/handle-return', {
      orderId: task.job.variables.orderId,
      returnQuantity: parseInt(returnQuantity),
      returnReason,
      replacementRequested: replacementRequested === 'true' || replacementRequested === true
    });

    const result = {
      returnProcessed: true,
      returnId: esbResponse.transformed?.returnId || `RET-${Date.now()}`,
      returnQuantity: parseInt(returnQuantity) || 0,
      returnReason: returnReason || 'Damaged goods',
      replacementRequested: replacementRequested === 'true' || replacementRequested === true,
      replacementOrderId: esbResponse.transformed?.replacementOrderId || null,
      returnNotes: notes || 'Return processed via Logistics Web UI',
      processedAt: new Date().toISOString(),
      department: 'Logistics',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing return task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.emit('initial-tasks', Array.from(pendingTasks.values()).map(t => ({
    jobKey: t.job.key,
    variables: t.job.variables,
    taskType: t.taskType
  })));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Zeebe workers
const replenishmentWorker = zeebe.createWorker({
  taskType: 'process-replenishment',
  taskHandler: async (job) => {
    console.log(`\n📦 New replenishment task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'process-replenishment',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'process-replenishment'
    });
    
    return job.forward();
  }
});

const deliveryWorker = zeebe.createWorker({
  taskType: 'check-delivery',
  taskHandler: async (job) => {
    console.log(`\n🚚 New delivery check task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'check-delivery',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'check-delivery'
    });
    
    return job.forward();
  }
});

const returnWorker = zeebe.createWorker({
  taskType: 'handle-return',
  taskHandler: async (job) => {
    console.log(`\n↩️ New return task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'handle-return',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'handle-return'
    });
    
    return job.forward();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🚚 LOGISTICS & WAREHOUSE DEPT - Web UI                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types:                                                  ║');
  console.log('║    📦 process-replenishment                                  ║');
  console.log('║    🚚 check-delivery                                         ║');
  console.log('║    ↩️  handle-return                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Logistics UI...');
  await replenishmentWorker.close();
  await deliveryWorker.close();
  await returnWorker.close();
  await zeebe.close();
  process.exit(0);
});
