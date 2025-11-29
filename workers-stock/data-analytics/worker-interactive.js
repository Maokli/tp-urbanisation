/**
 * Interactive Data & Analytics Department Worker - Stock Management
 * 
 * Job Type: compute-replenishment-quantity
 * Purpose: Compute optimal replenishment quantity based on sales history,
 *          safety stock, lead times, and forecasts
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
console.log('║    📊 DATA & ANALYTICS - Stock Management Worker             ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: compute-replenishment-quantity                    ║');
console.log('║  Calculate optimal order quantities based on data analysis   ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'compute-replenishment-quantity',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Compute Optimal Replenishment Quantity        ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log(`   Process Instance: ${job.processInstanceKey}`);
    console.log('');
    
    // Display incoming data
    if (job.variables.productId) {
      console.log(`   📦 Product ID: ${job.variables.productId}`);
    }
    console.log('');

    console.log('📈 Please provide replenishment analysis data:\n');
    
    const productId = await prompt('   Product ID (e.g., SKU-12345): ');
    const productName = await prompt('   Product Name: ');
    const currentStock = await prompt('   Current Stock Level: ');
    const avgDailySales = await prompt('   Average Daily Sales: ');
    const leadTimeDays = await prompt('   Supplier Lead Time (days): ');
    const safetyStockDays = await prompt('   Safety Stock (days of coverage): ');

    // Calculate recommended quantity
    const dailySales = parseFloat(avgDailySales) || 10;
    const leadTime = parseInt(leadTimeDays) || 7;
    const safetyDays = parseInt(safetyStockDays) || 5;
    const current = parseInt(currentStock) || 0;
    
    const reorderPoint = dailySales * (leadTime + safetyDays);
    const recommendedQty = Math.max(0, Math.ceil(reorderPoint - current + (dailySales * 14))); // 2 weeks extra

    const result = {
      productId: productId || 'SKU-UNKNOWN',
      productName: productName || 'Unknown Product',
      currentStock: current,
      averageDailySales: dailySales,
      leadTimeDays: leadTime,
      safetyStockDays: safetyDays,
      reorderPoint: Math.ceil(reorderPoint),
      recommendedQuantity: recommendedQty,
      calculationMethod: 'Safety Stock + Lead Time + 2-Week Buffer',
      analysisTimestamp: new Date().toISOString(),
      department: 'Data & Analytics'
    };

    console.log('\n   ✅ Replenishment quantity calculated!');
    console.log(`   📊 Recommended Order Quantity: ${recommendedQty} units`);
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Data & Analytics worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
