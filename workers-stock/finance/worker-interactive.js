/**
 * Interactive Finance & Accounting Department Worker - Stock Management
 * 
 * Job Type: analyze-replenishment
 * Purpose: Analyze budget, unit cost, MOQ, and financial feasibility
 * 
 * ⚠️  IMPORTANT: This is a KEY DECISION POINT - Finance approves or rejects!
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
console.log('║      💰 FINANCE & ACCOUNTING - Stock Management Worker       ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: analyze-replenishment                             ║');
console.log('║  ⚠️  KEY DECISION: Approve or Reject replenishment order!    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'analyze-replenishment',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Financial Analysis of Replenishment Request   ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 REPLENISHMENT REQUEST DETAILS:');
    console.log(`      • Request ID: ${job.variables.requestId || 'N/A'}`);
    console.log(`      • Product: ${job.variables.productName || 'N/A'} (${job.variables.productId || 'N/A'})`);
    console.log(`      • Order Quantity: ${job.variables.orderQuantity || 'N/A'} units`);
    console.log(`      • Priority: ${job.variables.priority || 'N/A'}`);
    console.log(`      • Physical Stock: ${job.variables.physicalStockCount || 'N/A'}`);
    console.log('');

    console.log('💵 Please complete financial analysis:\n');
    
    const unitCost = await prompt('   Unit cost ($): ');
    const budget = await prompt('   Available budget ($): ');
    const moq = await prompt('   Minimum Order Quantity (MOQ): ');
    const paymentTerms = await prompt('   Payment terms (e.g., Net 30, COD): ');

    const cost = parseFloat(unitCost) || 10;
    const qty = job.variables.orderQuantity || 100;
    const totalCost = cost * qty;
    const availableBudget = parseFloat(budget) || 10000;
    const withinBudget = totalCost <= availableBudget;

    console.log('');
    console.log(`   📊 FINANCIAL SUMMARY:`);
    console.log(`      • Total Order Cost: $${totalCost.toFixed(2)}`);
    console.log(`      • Available Budget: $${availableBudget.toFixed(2)}`);
    console.log(`      • Within Budget: ${withinBudget ? '✅ Yes' : '❌ No'}`);
    console.log('');
    
    console.log('   ╔═══════════════════════════════════════════════════════╗');
    console.log('   ║  ⚠️  DECISION TIME: Approve this replenishment order? ║');
    console.log('   ╚═══════════════════════════════════════════════════════╝');
    const approvalInput = await prompt('   APPROVE this replenishment? (yes/no): ');

    const financeApproved = approvalInput.toLowerCase() === 'yes' || approvalInput.toLowerCase() === 'y';

    const result = {
      financeApproved: financeApproved,
      unitCost: cost,
      totalOrderCost: totalCost,
      availableBudget: availableBudget,
      withinBudget: withinBudget,
      minimumOrderQuantity: parseInt(moq) || 1,
      paymentTerms: paymentTerms || 'Net 30',
      financialAnalysis: {
        costPerUnit: cost,
        quantity: qty,
        subtotal: totalCost,
        budgetRemaining: availableBudget - totalCost
      },
      approvalNotes: financeApproved 
        ? 'Replenishment approved. Budget allocated and PO authorized.'
        : 'Replenishment rejected. Budget constraints or financial concerns.',
      analysisTimestamp: new Date().toISOString(),
      approvedBy: financeApproved ? 'Finance Department' : null,
      department: 'Finance & Accounting'
    };

    console.log('');
    if (financeApproved) {
      console.log('   ✅ FINANCE APPROVED! Proceeding to Logistics...');
    } else {
      console.log('   ❌ FINANCE REJECTED! Process will terminate.');
    }
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Finance & Accounting worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
