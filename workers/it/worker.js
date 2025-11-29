/**
 * IT Department Worker
 * 
 * Job Type: update-system-prices
 * Purpose: Update promotional prices in POS, ERP, e-commerce, and inventory systems
 * 
 * This worker handles the IT system update step of the
 * Product Promotion Workflow.
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');

// Initialize Camunda 8 client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

console.log('💻 IT Worker Starting...');
console.log('📋 Handling job type: update-system-prices');

// Create worker for update-system-prices job
const worker = zeebe.createWorker({
  taskType: 'update-system-prices',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    // Simulate system updates (900ms)
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const targetProducts = job.variables.targetProducts || ['P123', 'P456', 'P789'];
    const discountPercentage = job.variables.discountPercentage || 30;
    
    const result = {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        pos: {
          status: 'updated',
          terminalsAffected: 45,
          updateTime: '0.3s'
        },
        erp: {
          status: 'updated',
          module: 'SAP_MM',
          priceListVersion: `PL-${Date.now()}`
        },
        ecommerce: {
          status: 'updated',
          platforms: ['website', 'mobile_app'],
          productsUpdated: targetProducts.length
        },
        inventory: {
          status: 'updated',
          flaggedForPromotion: targetProducts.length,
          alertsConfigured: true
        }
      },
      productsUpdated: targetProducts,
      newDiscount: `${discountPercentage}%`,
      updateTimestamp: new Date().toISOString(),
      department: 'IT'
    };
    
    console.log('✅ All systems updated successfully!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down IT worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});

console.log('✅ Worker is running and polling for jobs...');
console.log('Press Ctrl+C to stop\n');
