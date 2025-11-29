/**
 * Interactive Data & Analysis Department Worker
 * 
 * Job Type: identify-products
 * This worker prompts the user to input which products to target for promotion.
 */

require('dotenv').config({ path: '../.env' });
const { Camunda8 } = require('@camunda8/sdk');
const readline = require('readline');

const c8 = new Camunda8();
const zeebe = c8.getZeebeGrpcApiClient();

// Helper to prompt user for input
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
console.log('║       🔬 DATA & ANALYSIS DEPARTMENT - Interactive Worker     ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: identify-products                                 ║');
console.log('║  You will be asked to identify products for promotion        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'identify-products',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Identify Products for Promotion               ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log(`   Process Instance: ${job.processInstanceKey}`);
    console.log('');

    // Interactive prompts
    console.log('📊 Please provide product analysis data:\n');
    
    const productIds = await prompt('   Enter product IDs to promote (comma-separated, e.g., P123,P456,P789): ');
    const reason = await prompt('   Reason for promotion (e.g., expiring, low sales, overstock): ');
    const urgency = await prompt('   Urgency level (low/medium/high): ');

    const products = productIds.split(',').map(p => p.trim()).filter(p => p);
    
    const result = {
      targetProducts: products,
      productDetails: products.map((id, index) => ({
        id: id,
        name: `Product ${id}`,
        reason: reason || 'General promotion',
        currentStock: Math.floor(Math.random() * 200) + 50
      })),
      analysisTimestamp: new Date().toISOString(),
      urgency: urgency || 'medium',
      department: 'Data & Analysis',
      analyst: 'Interactive User'
    };

    console.log('\n   ✅ Analysis submitted!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Data & Analysis worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
