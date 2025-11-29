/**
 * Commercial & Purchasing Department Worker
 * 
 * Job Types:
 *   - propose-promotion: Propose discount/promotion strategy
 *   - prepare-instore-update: Prepare in-store price updates
 *   - update-physical-prices: Physically update price labels on shelves
 * 
 * This worker handles 3 tasks in the Product Promotion Workflow.
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');

// Initialize Camunda 8 client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

console.log('🛒 Commercial & Purchasing Worker Starting...');
console.log('📋 Handling job types: propose-promotion, prepare-instore-update, update-physical-prices');

// Worker 1: Propose Promotion Strategy
const proposalWorker = zeebe.createWorker({
  taskType: 'propose-promotion',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [PROPOSE-PROMOTION] Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const result = {
      discountPercentage: 30,
      promotionText: '30% OFF THIS WEEK ONLY!',
      promotionType: 'percentage_discount',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      targetAudience: 'all_customers',
      department: 'Commercial & Purchasing'
    };
    
    console.log('✅ Promotion strategy proposed!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Worker 2: Prepare In-Store Updates
const prepareWorker = zeebe.createWorker({
  taskType: 'prepare-instore-update',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [PREPARE-INSTORE-UPDATE] Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const result = {
      preparationStatus: 'ready',
      labelsGenerated: true,
      storesNotified: ['Store-001', 'Store-002', 'Store-003'],
      preparationTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing'
    };
    
    console.log('✅ In-store preparation complete!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Worker 3: Update Physical Prices
const physicalUpdateWorker = zeebe.createWorker({
  taskType: 'update-physical-prices',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [UPDATE-PHYSICAL-PRICES] Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const result = {
      physicalUpdateStatus: 'labels updated',
      updatedLabels: 45,
      storesCompleted: ['Store-001', 'Store-002', 'Store-003'],
      updateTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing'
    };
    
    console.log('✅ Physical price labels updated!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Commercial & Purchasing workers...');
  await proposalWorker.close();
  await prepareWorker.close();
  await physicalUpdateWorker.close();
  await zeebe.close();
  process.exit(0);
});

console.log('✅ All workers are running and polling for jobs...');
console.log('Press Ctrl+C to stop\n');
