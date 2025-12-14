/**
 * Commercial Department UI Server
 * Port: 4002
 * Job Types: propose-promotion, prepare-instore-update, update-physical-prices
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
const PORT = process.env.UI_COMMERCIAL_PORT || 4002;

// Zeebe client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

// In-memory task queue (separated by type)
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
    title: 'Commercial',
    deptName: 'Commercial & Purchasing Department',
    deptIcon: '🛒',
    deptColor: 'amber',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

// Complete propose-promotion task
app.post('/complete-task/propose-promotion', async (req, res) => {
  const { jobKey, discount, promoText, durationDays } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/propose-promotion', {
      discount,
      promoText,
      durationDays
    });

    const result = {
      discountPercentage: parseInt(discount) || 30,
      promotionText: promoText || `${discount}% OFF!`,
      promotionType: 'percentage_discount',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + (parseInt(durationDays) || 7) * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: parseInt(durationDays) || 7,
      department: 'Commercial & Purchasing',
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

// Complete prepare-instore-update task
app.post('/complete-task/prepare-instore-update', async (req, res) => {
  const { jobKey, storeIds, labelsReady } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/prepare-instore', {
      storeIds,
      labelsReady: labelsReady === 'true' || labelsReady === true
    });

    const storeList = typeof storeIds === 'string' 
      ? storeIds.split(',').map(s => s.trim()).filter(s => s)
      : storeIds;

    const result = {
      preparationStatus: labelsReady === 'true' ? 'ready' : 'pending',
      labelsGenerated: labelsReady === 'true' || labelsReady === true,
      storesNotified: storeList.length > 0 ? storeList : ['Store-001', 'Store-002'],
      preparationTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing',
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

// Complete update-physical-prices task
app.post('/complete-task/update-physical-prices', async (req, res) => {
  const { jobKey, labelsUpdated, allStoresCompleted } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Call ESB
    const esbResponse = await callESB('/api/update-physical-prices', {
      labelsUpdated: parseInt(labelsUpdated),
      allStoresCompleted: allStoresCompleted === 'true' || allStoresCompleted === true
    });

    const result = {
      physicalUpdateStatus: allStoresCompleted === 'true' ? 'labels updated' : 'in progress',
      updatedLabels: parseInt(labelsUpdated) || 0,
      storesCompleted: task.job.variables.storesNotified || [],
      updateTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing',
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

// Create worker for each job type
function createTaskWorker(taskType) {
  return zeebe.createWorker({
    taskType,
    taskHandler: async (job) => {
      console.log(`\n📥 New ${taskType} task received: ${job.key}`);
      console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
      
      pendingTasks.set(job.key, {
        job,
        taskType,
        receivedAt: new Date().toISOString()
      });
      
      io.emit('new-task', {
        jobKey: job.key,
        variables: job.variables,
        taskType
      });
      
      return job.forward();
    }
  });
}

const workers = [
  createTaskWorker('propose-promotion'),
  createTaskWorker('prepare-instore-update'),
  createTaskWorker('update-physical-prices')
];

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🛒 COMMERCIAL & PURCHASING DEPT - Web UI                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types: propose-promotion, prepare-instore-update,       ║');
  console.log('║             update-physical-prices                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Commercial UI...');
  for (const worker of workers) {
    await worker.close();
  }
  await zeebe.close();
  server.close();
  process.exit(0);
});
