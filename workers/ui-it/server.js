/**
 * IT Department UI Server
 * Port: 4005
 * Job Types: 
 *   - update-system-prices (Product Promotion Workflow)
 *   - update-stock-systems (Stock Replenishment Workflow)
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
const PORT = process.env.UI_IT_PORT || 4005;

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
    title: 'IT',
    deptName: 'IT Department',
    deptIcon: '💻',
    deptColor: 'blue',
    tasks: Array.from(pendingTasks.values())
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(pendingTasks.values()));
});

app.post('/complete-task', async (req, res) => {
  const { jobKey, posUpdated, terminalCount, erpUpdated, ecomUpdated, inventoryUpdated } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const toBool = (val) => val === 'true' || val === true || val === 'on';

    // Call ESB to transform data
    const esbResponse = await callESB('/api/update-prices', {
      posUpdated: toBool(posUpdated),
      terminalCount: parseInt(terminalCount) || 0,
      erpUpdated: toBool(erpUpdated),
      ecomUpdated: toBool(ecomUpdated),
      inventoryUpdated: toBool(inventoryUpdated)
    });

    const targetProducts = task.job.variables.targetProducts || [];

    const result = {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        pos: {
          status: toBool(posUpdated) ? 'updated' : 'pending',
          terminalsAffected: parseInt(terminalCount) || 0,
          updateTime: '0.3s'
        },
        erp: {
          status: toBool(erpUpdated) ? 'updated' : 'pending',
          module: 'SAP_MM',
          priceListVersion: `PL-${Date.now()}`
        },
        ecommerce: {
          status: toBool(ecomUpdated) ? 'updated' : 'pending',
          platforms: ['website', 'mobile_app'],
          productsUpdated: targetProducts.length
        },
        inventory: {
          status: toBool(inventoryUpdated) ? 'updated' : 'pending',
          flaggedForPromotion: targetProducts.length,
          alertsConfigured: true
        }
      },
      productsUpdated: targetProducts,
      newDiscount: `${task.job.variables.discountPercentage || 0}%`,
      updateTimestamp: new Date().toISOString(),
      department: 'IT',
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

// Complete stock systems update task
app.post('/complete-stock-task', async (req, res) => {
  const { jobKey, erpUpdated, wmsUpdated, posUpdated, notes } = req.body;
  
  try {
    const task = pendingTasks.get(jobKey);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const toBool = (val) => val === 'true' || val === true || val === 'on';

    // Call ESB to update stock systems
    const esbResponse = await callESB('/api/update-stock-systems', {
      productId: task.job.variables.productId,
      quantityReceived: task.job.variables.quantityReceived || task.job.variables.orderQuantity || 100,
      erpUpdated: toBool(erpUpdated),
      wmsUpdated: toBool(wmsUpdated),
      posUpdated: toBool(posUpdated)
    });

    const result = {
      stockSystemsUpdated: true,
      systemsUpdated: {
        erp: {
          status: toBool(erpUpdated) ? 'updated' : 'skipped',
          module: 'SAP_MM_STOCK',
          timestamp: new Date().toISOString()
        },
        wms: {
          status: toBool(wmsUpdated) ? 'updated' : 'skipped',
          warehouseId: 'WH-001',
          binLocation: esbResponse.transformed?.binLocation || 'A1-23'
        },
        pos: {
          status: toBool(posUpdated) ? 'updated' : 'skipped',
          newStockLevel: esbResponse.transformed?.newStockLevel || 'synced'
        }
      },
      productId: task.job.variables.productId,
      quantityAdded: task.job.variables.quantityReceived || task.job.variables.orderQuantity || 100,
      updateNotes: notes || 'Stock systems updated successfully',
      updateTimestamp: new Date().toISOString(),
      department: 'IT',
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
  taskType: 'update-system-prices',
  taskHandler: async (job) => {
    console.log(`\n📥 New promotion task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'update-system-prices',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'update-system-prices'
    });
    
    return job.forward();
  }
});

// Zeebe worker for Stock Replenishment workflow
const stockWorker = zeebe.createWorker({
  taskType: 'update-stock-systems',
  taskHandler: async (job) => {
    console.log(`\n📦 New stock systems task received: ${job.key}`);
    console.log(`   Variables:`, JSON.stringify(job.variables, null, 2));
    
    pendingTasks.set(job.key, {
      job,
      taskType: 'update-stock-systems',
      receivedAt: new Date().toISOString()
    });
    
    io.emit('new-task', {
      jobKey: job.key,
      variables: job.variables,
      taskType: 'update-stock-systems'
    });
    
    return job.forward();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           💻 IT DEPARTMENT - Web UI                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║  Job Types:                                                  ║');
  console.log('║    📊 update-system-prices (Promotion Workflow)              ║');
  console.log('║    📦 update-stock-systems (Stock Workflow)                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for tasks...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down IT UI...');
  await worker.close();
  await zeebe.close();
  server.close();
  process.exit(0);
});
