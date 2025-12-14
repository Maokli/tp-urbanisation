/**
 * Merchandising Department UI Server
 * Port: 4007
 * Job Types: 
 *   - create-replenishment-request (Stock Replenishment Workflow - Entry Point)
 *   - verify-stock (Stock Replenishment Workflow - Final Step)
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
const PORT = process.env.UI_MERCHANDISING_PORT || 4007;

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
    title: 'Merchandising',
    deptName: 'Merchandising Department',
    deptIcon: '🏷️',
    deptColor: 'pink',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

// Create replenishment request
app.post('/complete-request', async (req, res) => {
  const { jobKey, urgencyLevel, requestedQuantity, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/create-replenishment', {
      productId: task.job.variables.productId,
      currentStock: task.job.variables.currentStock,
      requestedQuantity: parseInt(requestedQuantity),
      urgencyLevel
    });

    const result = {
      requestCreated: true,
      requestId: esbResponse.transformed?.requestId || `REQ-${Date.now()}`,
      productId: task.job.variables.productId,
      productName: task.job.variables.productName || 'Unknown Product',
      currentStock: task.job.variables.currentStock || 0,
      requestedQuantity: parseInt(requestedQuantity) || 100,
      urgencyLevel: urgencyLevel || 'normal',
      requestNotes: notes || 'Replenishment request created via Merchandising Web UI',
      createdAt: new Date().toISOString(),
      createdBy: 'Web UI User',
      department: 'Merchandising',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing request task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify stock levels after replenishment
app.post('/complete-verify', async (req, res) => {
  const { jobKey, verifiedStock, stockStatus, shelfLocation, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/verify-stock', {
      productId: task.job.variables.productId,
      verifiedStock: parseInt(verifiedStock),
      expectedStock: task.job.variables.expectedStock || 
                     (task.job.variables.currentStock || 0) + (task.job.variables.quantityReceived || 0),
      stockStatus
    });

    const isVerified = stockStatus === 'correct' || stockStatus === 'overstocked';

    const result = {
      stockVerified: isVerified,
      verifiedStock: parseInt(verifiedStock) || 0,
      expectedStock: task.job.variables.expectedStock || 100,
      stockStatus: stockStatus || 'correct',
      discrepancy: (parseInt(verifiedStock) || 0) - (task.job.variables.expectedStock || 100),
      shelfLocation: shelfLocation || 'A1-01',
      verificationNotes: notes || (isVerified 
        ? 'Stock levels verified and correct' 
        : 'Discrepancy found - investigation required'),
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Web UI User',
      department: 'Merchandising',
      workflowComplete: true,
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing verification task:', error);
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
const requestWorker = zeebe.createWorker({
  taskType: 'create-replenishment-request',
  taskHandler: async (job) => {
    console.log(`\n📋 New replenishment request task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'create-replenishment-request',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'create-replenishment-request'
    });
    
    return job.forward();
  }
});

const verifyWorker = zeebe.createWorker({
  taskType: 'verify-stock',
  taskHandler: async (job) => {
    console.log(`\n✅ New stock verification task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'verify-stock',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'verify-stock'
    });
    
    return job.forward();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🏷️ MERCHANDISING DEPARTMENT - Web UI                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types:                                                  ║');
  console.log('║    📋 create-replenishment-request (Entry Point)             ║');
  console.log('║    ✅ verify-stock (Final Step)                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Merchandising UI...');
  await requestWorker.close();
  await verifyWorker.close();
  await zeebe.close();
  process.exit(0);
});
