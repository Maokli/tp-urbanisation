/**
 * Interactive Merchandising Department Worker - Stock Management
 * 
 * Job Types:
 *   - create-replenishment-request: Create the replenishment order request
 *   - verify-stock: Verify stock level is actually below threshold
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
console.log('║      🏪 MERCHANDISING - Stock Management Worker              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Types: create-replenishment-request, verify-stock       ║');
console.log('║  Create orders and verify physical stock levels              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

// Worker 1: Create Replenishment Request
const createRequestWorker = zeebe.createWorker({
  taskType: 'create-replenishment-request',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Create Replenishment Request                  ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 ANALYSIS RESULTS FROM DATA TEAM:');
    console.log(`      • Product: ${job.variables.productName || 'N/A'} (${job.variables.productId || 'N/A'})`);
    console.log(`      • Current Stock: ${job.variables.currentStock || 'N/A'}`);
    console.log(`      • Recommended Quantity: ${job.variables.recommendedQuantity || 'N/A'}`);
    console.log(`      • Reorder Point: ${job.variables.reorderPoint || 'N/A'}`);
    console.log('');

    console.log('📝 Create the replenishment request:\n');
    
    const orderQty = await prompt(`   Order Quantity (recommended: ${job.variables.recommendedQuantity || 'N/A'}): `);
    const priority = await prompt('   Priority (low/medium/high/urgent): ');
    const notes = await prompt('   Additional notes (or press Enter to skip): ');

    const quantity = parseInt(orderQty) || job.variables.recommendedQuantity || 100;

    const result = {
      requestId: `REQ-${Date.now()}`,
      productId: job.variables.productId,
      productName: job.variables.productName,
      orderQuantity: quantity,
      priority: priority || 'medium',
      notes: notes || '',
      requestedBy: 'Merchandising Department',
      requestTimestamp: new Date().toISOString(),
      status: 'pending_verification',
      department: 'Merchandising'
    };

    console.log('\n   ✅ Replenishment request created!');
    console.log(`   📋 Request ID: ${result.requestId}`);
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

// Worker 2: Verify Stock
const verifyStockWorker = zeebe.createWorker({
  taskType: 'verify-stock',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Verify Stock Level                            ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 REQUEST DETAILS:');
    console.log(`      • Request ID: ${job.variables.requestId || 'N/A'}`);
    console.log(`      • Product: ${job.variables.productName || 'N/A'}`);
    console.log(`      • System Stock: ${job.variables.currentStock || 'N/A'}`);
    console.log(`      • Order Quantity: ${job.variables.orderQuantity || 'N/A'}`);
    console.log('');

    console.log('🔍 Perform physical stock verification:\n');
    
    const physicalCount = await prompt('   Physical stock count: ');
    const location = await prompt('   Stock location verified (e.g., Warehouse A, Shelf B3): ');
    
    console.log('');
    console.log('   ╔═══════════════════════════════════════════════════════╗');
    console.log('   ║  ⚠️  DECISION: Does stock need replenishment?         ║');
    console.log('   ╚═══════════════════════════════════════════════════════╝');
    const verifiedInput = await prompt('   Confirm stock is below threshold and needs replenishment? (yes/no): ');

    const stockVerified = verifiedInput.toLowerCase() === 'yes' || verifiedInput.toLowerCase() === 'y';

    const result = {
      stockVerified: stockVerified,
      physicalStockCount: parseInt(physicalCount) || 0,
      stockLocation: location || 'Warehouse A',
      verificationTimestamp: new Date().toISOString(),
      verifiedBy: 'Merchandising Team',
      discrepancy: Math.abs((parseInt(physicalCount) || 0) - (job.variables.currentStock || 0)),
      verificationNotes: stockVerified 
        ? 'Stock verified below threshold. Replenishment approved to proceed.'
        : 'Stock level adequate or discrepancy found. Replenishment not needed.',
      department: 'Merchandising'
    };

    console.log('');
    if (stockVerified) {
      console.log('   ✅ STOCK VERIFICATION PASSED - Proceeding to Finance...');
    } else {
      console.log('   ❌ STOCK VERIFICATION FAILED - Process will terminate.');
    }
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Merchandising workers...');
  await createRequestWorker.close();
  await verifyStockWorker.close();
  await zeebe.close();
  process.exit(0);
});
