/**
 * Data & Analysis Department Worker
 * 
 * Job Type: identify-products
 * Purpose: Detect low-selling or expiring products and generate a target list
 * 
 * This worker connects to Camunda 8 SaaS and handles the first step of the 
 * Product Promotion Workflow.
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');

// Initialize Camunda 8 client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

console.log('🔬 Data & Analysis Worker Starting...');
console.log('📋 Handling job type: identify-products');

// Create worker for identify-products job
const worker = zeebe.createWorker({
  taskType: 'identify-products',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    // Simulate processing time (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hardcoded response - list of products to promote
    const result = {
      targetProducts: ['P123', 'P456', 'P789'],
      productDetails: [
        { id: 'P123', name: 'Organic Yogurt 500g', reason: 'Expiring in 5 days', currentStock: 150 },
        { id: 'P456', name: 'Whole Grain Bread', reason: 'Low sales this month', currentStock: 80 },
        { id: 'P789', name: 'Fresh Orange Juice 1L', reason: 'Seasonal overstock', currentStock: 200 }
      ],
      analysisTimestamp: new Date().toISOString(),
      department: 'Data & Analysis'
    };
    
    console.log('✅ Analysis complete!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Data & Analysis worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});

console.log('✅ Worker is running and polling for jobs...');
console.log('Press Ctrl+C to stop\n');
