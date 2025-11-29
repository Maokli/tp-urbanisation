/**
 * Finance & Accounting Department Worker
 * 
 * Job Type: evaluate-profitability
 * Purpose: Evaluate financial feasibility and profitability of the promotion
 * 
 * IMPORTANT: This worker returns the 'approved' variable that determines
 * whether the promotion process continues or gets rejected.
 * 
 * Change APPROVED to false to test the rejection path!
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');

// ============================================
// 🎯 CHANGE THIS TO TEST REJECTION PATH
// ============================================
const APPROVED = true;  // Set to false to reject the promotion
// ============================================

// Initialize Camunda 8 client
const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

console.log('💰 Finance & Accounting Worker Starting...');
console.log('📋 Handling job type: evaluate-profitability');
console.log(`⚙️  Approval mode: ${APPROVED ? '✅ APPROVING' : '❌ REJECTING'} promotions`);

// Create worker for evaluate-profitability job
const worker = zeebe.createWorker({
  taskType: 'evaluate-profitability',
  taskHandler: async (job) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Received job:', job.key);
    console.log('📊 Input variables:', JSON.stringify(job.variables, null, 2));
    
    // Simulate financial analysis (800ms)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Calculate mock profitability metrics
    const discountPercentage = job.variables.discountPercentage || 30;
    const marginAfterPromo = APPROVED ? 18.5 : -2.3;
    
    const result = {
      approved: APPROVED,
      marginAfterPromo: marginAfterPromo,
      originalMargin: 35.0,
      revenueImpact: APPROVED ? '+12%' : '-5%',
      riskLevel: APPROVED ? 'low' : 'high',
      financialSummary: APPROVED 
        ? 'Promotion financially viable. Expected to increase revenue and reduce waste.'
        : 'Promotion not financially viable. Margin too low after discount.',
      analysisTimestamp: new Date().toISOString(),
      department: 'Finance & Accounting'
    };
    
    console.log(`✅ Financial analysis complete - ${APPROVED ? 'APPROVED' : 'REJECTED'}!`);
    console.log('📤 Output:', JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return job.complete(result);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Finance & Accounting worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});

console.log('✅ Worker is running and polling for jobs...');
console.log('Press Ctrl+C to stop\n');
