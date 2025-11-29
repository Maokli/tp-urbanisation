/**
 * Marketing Department Worker
 * 
 * Job Type: prepare-promotion-material
 * Purpose: Prepare and publish promotion materials (flyers, digital, in-store)
 * 
 * This worker handles the marketing communication step of the
 * Product Promotion Workflow.
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');

// Initialize Camunda 8 client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

console.log('📢 Marketing Worker Starting...');
console.log('📋 Handling job type: prepare-promotion-material');

// Create worker for prepare-promotion-material job
const worker = zeebe.createWorker({
  taskType: 'prepare-promotion-material',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    // Simulate material preparation (700ms)
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const promotionText = job.variables.promotionText || '30% OFF THIS WEEK ONLY!';
    
    const result = {
      communicationStatus: 'published',
      channels: {
        flyers: {
          status: 'printed',
          quantity: 5000,
          distributionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        digital: {
          status: 'live',
          platforms: ['website', 'mobile_app', 'email', 'social_media'],
          impressions: 0  // Will be tracked
        },
        inStore: {
          status: 'deployed',
          posters: 150,
          shelfTalkers: 300
        }
      },
      campaignId: `PROMO-${Date.now()}`,
      headline: promotionText,
      publishTimestamp: new Date().toISOString(),
      department: 'Marketing'
    };
    
    console.log('✅ Marketing materials prepared and published!');
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Marketing worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});

console.log('✅ Worker is running and polling for jobs...');
console.log('Press Ctrl+C to stop\n');
