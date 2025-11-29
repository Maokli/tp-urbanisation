/**
 * Interactive Finance & Accounting Department Worker
 * 
 * Job Type: evaluate-profitability
 * 
 * IMPORTANT: This is where the user decides to APPROVE or REJECT the promotion!
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
console.log('║     💰 FINANCE & ACCOUNTING DEPT - Interactive Worker        ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: evaluate-profitability                            ║');
console.log('║  ⚠️  YOU DECIDE: Approve or Reject the promotion!            ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'evaluate-profitability',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Financial Feasibility Evaluation              ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    // Display current promotion details
    console.log('   📋 PROMOTION DETAILS:');
    console.log(`      • Products: ${JSON.stringify(job.variables.targetProducts || 'N/A')}`);
    console.log(`      • Discount: ${job.variables.discountPercentage || 'N/A'}%`);
    console.log(`      • Promo Text: "${job.variables.promotionText || 'N/A'}"`);
    console.log(`      • Duration: ${job.variables.durationDays || 'N/A'} days`);
    console.log('');

    console.log('💵 Please complete financial evaluation:\n');
    
    const marginInput = await prompt('   Expected margin after promotion (%): ');
    const revenueImpact = await prompt('   Expected revenue impact (e.g., +15% or -5%): ');
    const riskLevel = await prompt('   Risk level (low/medium/high): ');
    
    console.log('');
    console.log('   ╔═══════════════════════════════════════════════════════╗');
    console.log('   ║  ⚠️  DECISION TIME: Should we approve this promotion? ║');
    console.log('   ╚═══════════════════════════════════════════════════════╝');
    const approvalInput = await prompt('   APPROVE this promotion? (yes/no): ');

    const approved = approvalInput.toLowerCase() === 'yes' || approvalInput.toLowerCase() === 'y';
    const margin = parseFloat(marginInput) || (approved ? 18.5 : -2.3);

    const result = {
      approved: approved,
      marginAfterPromo: margin,
      originalMargin: 35.0,
      revenueImpact: revenueImpact || (approved ? '+12%' : '-5%'),
      riskLevel: riskLevel || 'medium',
      financialSummary: approved 
        ? 'Promotion approved by Finance department. Proceed with marketing and implementation.'
        : 'Promotion rejected by Finance department. Financial metrics do not meet requirements.',
      analysisTimestamp: new Date().toISOString(),
      department: 'Finance & Accounting',
      approvedBy: 'Interactive User'
    };

    console.log('');
    if (approved) {
      console.log('   ✅ PROMOTION APPROVED! Proceeding to Marketing...');
    } else {
      console.log('   ❌ PROMOTION REJECTED! Process will end.');
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
