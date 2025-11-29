/**
 * Interactive IT Department Worker - Stock Management
 * 
 * Job Type: update-stock-systems
 * Purpose: Update stock levels in ERP, WMS, and POS systems
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
console.log('║          💻 IT DEPARTMENT - Stock Management Worker          ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: update-stock-systems                              ║');
console.log('║  Synchronize stock levels across ERP, WMS, and POS           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'update-stock-systems',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Update Stock in Systems                       ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 STOCK UPDATE DETAILS:');
    console.log(`      • Product: ${job.variables.productName || 'N/A'} (${job.variables.productId || 'N/A'})`);
    console.log(`      • PO Number: ${job.variables.purchaseOrderNumber || 'N/A'}`);
    console.log(`      • Quantity Accepted: ${job.variables.quantityAccepted || 'N/A'} units`);
    console.log(`      • Previous Stock: ${job.variables.physicalStockCount || job.variables.currentStock || 'N/A'}`);
    console.log('');

    console.log('🖥️  Confirm system updates:\n');
    
    const erpUpdated = await prompt('   ERP system updated? (yes/no): ');
    const wmsUpdated = await prompt('   WMS (Warehouse Management) updated? (yes/no): ');
    const posUpdated = await prompt('   POS systems synchronized? (yes/no): ');
    const newStockLevel = await prompt('   New total stock level: ');

    const previousStock = job.variables.physicalStockCount || job.variables.currentStock || 0;
    const quantityAdded = job.variables.quantityAccepted || 0;
    const newLevel = parseInt(newStockLevel) || (previousStock + quantityAdded);

    const result = {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        erp: {
          status: erpUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          module: 'Inventory Management',
          transactionId: `ERP-${Date.now()}`
        },
        wms: {
          status: wmsUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          warehouseId: 'WH-001',
          binLocation: 'A-15-03'
        },
        pos: {
          status: posUpdated.toLowerCase() === 'yes' ? 'synchronized' : 'pending',
          storesUpdated: 15,
          syncTime: '< 1 second'
        }
      },
      stockLevels: {
        previousStock: previousStock,
        quantityAdded: quantityAdded,
        newStockLevel: newLevel
      },
      productId: job.variables.productId,
      updateTimestamp: new Date().toISOString(),
      updatedBy: 'IT Department',
      department: 'IT'
    };

    console.log('\n   ✅ All systems updated!');
    console.log(`   📊 New Stock Level: ${newLevel} units`);
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n   🎉 STOCK REPLENISHMENT COMPLETE!\n');
    console.log('⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down IT worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
