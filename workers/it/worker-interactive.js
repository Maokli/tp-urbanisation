/**
 * Interactive IT Department Worker
 * 
 * Job Type: update-system-prices
 * Prompts user to confirm system updates across POS, ERP, e-commerce, etc.
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
console.log('║          💻 IT DEPARTMENT - Interactive Worker               ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: update-system-prices                              ║');
console.log('║  Update prices in POS, ERP, e-commerce, and inventory        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'update-system-prices',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Update System Prices                          ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 UPDATE REQUIREMENTS:');
    console.log(`      • Products: ${JSON.stringify(job.variables.targetProducts || [])}`);
    console.log(`      • New Discount: ${job.variables.discountPercentage || 'N/A'}%`);
    console.log('');

    console.log('🖥️  Confirm system updates:\n');
    
    const posUpdated = await prompt('   POS terminals updated? (yes/no): ');
    const posTerminals = posUpdated.toLowerCase() === 'yes' ? await prompt('   Number of POS terminals: ') : '0';
    const erpUpdated = await prompt('   ERP system updated? (yes/no): ');
    const ecomUpdated = await prompt('   E-commerce platform updated? (yes/no): ');
    const inventoryUpdated = await prompt('   Inventory system updated? (yes/no): ');

    const targetProducts = job.variables.targetProducts || [];

    const result = {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        pos: {
          status: posUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          terminalsAffected: parseInt(posTerminals) || 0,
          updateTime: '0.3s'
        },
        erp: {
          status: erpUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          module: 'SAP_MM',
          priceListVersion: `PL-${Date.now()}`
        },
        ecommerce: {
          status: ecomUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          platforms: ['website', 'mobile_app'],
          productsUpdated: targetProducts.length
        },
        inventory: {
          status: inventoryUpdated.toLowerCase() === 'yes' ? 'updated' : 'pending',
          flaggedForPromotion: targetProducts.length,
          alertsConfigured: true
        }
      },
      productsUpdated: targetProducts,
      newDiscount: `${job.variables.discountPercentage || 0}%`,
      updateTimestamp: new Date().toISOString(),
      department: 'IT'
    };

    console.log('\n   ✅ System updates recorded!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down IT worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
