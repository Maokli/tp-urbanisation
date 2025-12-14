/**
 * Finance Department UI Server
 * Port: 4003
 * Job Types: 
 *   - evaluate-profitability (Product Promotion Workflow)
 *   - analyze-replenishment (Stock Replenishment Workflow)
 * 
 * IMPORTANT: This is where the user decides to APPROVE or REJECT promotions and stock orders!
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
const PORT = process.env.UI_FINANCE_PORT || 4003;

// Zeebe client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

// In-memory task queue (stores both promotion and stock tasks)
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
    title: 'Finance',
    deptName: 'Finance & Accounting Department',
    deptIcon: '💰',
    deptColor: 'emerald',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

app.post('/complete-task', async (req, res) => {
  const { jobKey, margin, revenueImpact, riskLevel, approved } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB to transform data
    const esbResponse = await callESB('/api/evaluate-profitability', {
      margin: parseFloat(margin),
      revenueImpact,
      riskLevel,
      approved: approved === 'true' || approved === true
    });

    const isApproved = approved === 'true' || approved === true;
    const marginValue = parseFloat(margin) || (isApproved ? 18.5 : -2.3);

    const result = {
      approved: isApproved,
      marginAfterPromo: marginValue,
      originalMargin: 35.0,
      revenueImpact: revenueImpact || (isApproved ? '+12%' : '-5%'),
      riskLevel: riskLevel || 'medium',
      financialSummary: isApproved 
        ? 'Promotion approved by Finance department. Proceed with marketing and implementation.'
        : 'Promotion rejected by Finance department. Financial metrics do not meet requirements.',
      analysisTimestamp: new Date().toISOString(),
      department: 'Finance & Accounting',
      approvedBy: 'Web UI User',
      esbData: esbResponse.transformed
    };

    await task.job.complete(result);
    pendingTasks.delete(jobKey);
    io.emit('task-completed', { jobKey, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete stock replenishment analysis task
app.post('/complete-stock-task', async (req, res) => {
  const { jobKey, budgetApproved, budgetAmount, priorityLevel, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB to analyze replenishment financially
    const esbResponse = await callESB('/api/analyze-replenishment', {
      reorderQuantity: task.job.variables.recommendedQuantity || 100,
      unitCost: task.job.variables.unitCost || 25,
      budgetApproved: budgetApproved === 'true' || budgetApproved === true,
      budgetAmount: parseFloat(budgetAmount) || 0,
      priorityLevel
    });

    const isApproved = budgetApproved === 'true' || budgetApproved === true;

    const result = {
      financeApproved: isApproved,  // Required by BPMN gateway condition
      budgetApproved: isApproved,
      budgetAllocated: parseFloat(budgetAmount) || esbResponse.transformed?.estimatedCost || 2500,
      financialScore: esbResponse.transformed?.financialScore || 85,
      priorityLevel: priorityLevel || 'medium',
      financeNotes: notes || (isApproved 
        ? 'Budget approved for stock replenishment order.'
        : 'Budget request denied. Insufficient funds or low priority.'),
      analysisTimestamp: new Date().toISOString(),
      department: 'Finance & Accounting',
      approvedBy: 'Web UI User',
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
  
  socket.emit('initial-tasks', Array.from(pendingTasks.values()).map(t => ({
    jobKey: t.job.key,
    variables: t.job.variables,
    taskType: t.taskType
  })));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Zeebe worker for Product Promotion workflow
const worker = zeebe.createWorker({
  taskType: 'evaluate-profitability',
  taskHandler: async (job) => {
    console.log(`\n📥 New promotion task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'evaluate-profitability',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'evaluate-profitability'
    });
    
    return job.forward();
  }
});

// Zeebe worker for Stock Replenishment workflow
const stockWorker = zeebe.createWorker({
  taskType: 'analyze-replenishment',
  taskHandler: async (job) => {
    console.log(`\n📦 New stock replenishment task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'analyze-replenishment',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'analyze-replenishment'
    });
    
    return job.forward();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     💰 FINANCE & ACCOUNTING DEPT - Web UI                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types:                                                  ║');
  console.log('║    📊 evaluate-profitability (Promotion Workflow)            ║');
  console.log('║    📦 analyze-replenishment (Stock Workflow)                 ║');
  console.log('║  ⚠️  YOU DECIDE: Approve or Reject promotions & orders!      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Finance UI...');
  await worker.close();
  await zeebe.close();
  server.close();
  process.exit(0);
});
