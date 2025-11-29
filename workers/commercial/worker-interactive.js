/**
 * Interactive Commercial & Purchasing Department Worker
 * 
 * Job Types:
 *   - propose-promotion: Set discount percentage and promotional text
 *   - prepare-instore-update: Confirm store preparation
 *   - update-physical-prices: Confirm physical label updates
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');
const readline = require('readline');

const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║    🛒 COMMERCIAL & PURCHASING DEPT - Interactive Worker      ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Types: propose-promotion, prepare-instore-update,       ║');
console.log('║             update-physical-prices                           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

// Worker 1: Propose Promotion Strategy
const proposalWorker = zeebe.createWorker({
  taskType: 'propose-promotion',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Propose Discount/Promotion Strategy           ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log(`   Products to promote: ${JSON.stringify(job.variables.targetProducts || [])}`);
    console.log('');

    console.log('💰 Please define the promotion strategy:\n');
    
    const discount = await prompt('   Enter discount percentage (e.g., 30): ');
    const promoText = await prompt('   Enter promotional text (e.g., "30% OFF THIS WEEK!"): ');
    const duration = await prompt('   Promotion duration in days (e.g., 7): ');

    const result = {
      discountPercentage: parseInt(discount) || 30,
      promotionText: promoText || `${discount}% OFF!`,
      promotionType: 'percentage_discount',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + (parseInt(duration) || 7) * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: parseInt(duration) || 7,
      department: 'Commercial & Purchasing'
    };

    console.log('\n   ✅ Promotion strategy proposed!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

// Worker 2: Prepare In-Store Updates
const prepareWorker = zeebe.createWorker({
  taskType: 'prepare-instore-update',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Prepare In-Store Price Updates                ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log(`   Products: ${JSON.stringify(job.variables.targetProducts || [])}`);
    console.log('');

    console.log('🏪 Confirm store preparation:\n');
    
    const stores = await prompt('   Enter store IDs to notify (comma-separated, e.g., S001,S002,S003): ');
    const labelsReady = await prompt('   Are price labels printed and ready? (yes/no): ');

    const storeList = stores.split(',').map(s => s.trim()).filter(s => s);

    const result = {
      preparationStatus: labelsReady.toLowerCase() === 'yes' ? 'ready' : 'pending',
      labelsGenerated: labelsReady.toLowerCase() === 'yes',
      storesNotified: storeList.length > 0 ? storeList : ['Store-001', 'Store-002'],
      preparationTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing'
    };

    console.log('\n   ✅ In-store preparation recorded!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

// Worker 3: Update Physical Prices
const physicalUpdateWorker = zeebe.createWorker({
  taskType: 'update-physical-prices',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Update Physical Price Labels                  ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log(`   Stores: ${JSON.stringify(job.variables.storesNotified || [])}`);
    console.log('');

    console.log('🏷️  Confirm physical label update:\n');
    
    const labelsUpdated = await prompt('   Number of labels updated: ');
    const allComplete = await prompt('   All stores completed? (yes/no): ');

    const result = {
      physicalUpdateStatus: allComplete.toLowerCase() === 'yes' ? 'labels updated' : 'in progress',
      updatedLabels: parseInt(labelsUpdated) || 0,
      storesCompleted: job.variables.storesNotified || [],
      updateTimestamp: new Date().toISOString(),
      department: 'Commercial & Purchasing'
    };

    console.log('\n   ✅ Physical update recorded!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Commercial & Purchasing workers...');
  await proposalWorker.close();
  await prepareWorker.close();
  await physicalUpdateWorker.close();
  await zeebe.close();
  process.exit(0);
});
