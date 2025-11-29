/**
 * Interactive Marketing Department Worker
 * 
 * Job Type: prepare-promotion-material
 * Prompts user to configure marketing channels and campaign details.
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
console.log('║        📢 MARKETING DEPARTMENT - Interactive Worker          ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Type: prepare-promotion-material                        ║');
console.log('║  Configure marketing channels and publish the campaign       ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

const worker = zeebe.createWorker({
  taskType: 'prepare-promotion-material',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Prepare & Publish Promotion Materials         ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 APPROVED PROMOTION:');
    console.log(`      • Text: "${job.variables.promotionText || 'N/A'}"`);
    console.log(`      • Discount: ${job.variables.discountPercentage || 'N/A'}%`);
    console.log(`      • Products: ${JSON.stringify(job.variables.targetProducts || [])}`);
    console.log('');

    console.log('📣 Configure marketing campaign:\n');
    
    const flyerQty = await prompt('   Number of flyers to print: ');
    const channels = await prompt('   Digital channels (comma-separated, e.g., website,email,facebook,instagram): ');
    const posterQty = await prompt('   Number of in-store posters: ');
    const headline = await prompt('   Campaign headline (or press Enter to use promo text): ');

    const digitalChannels = channels.split(',').map(c => c.trim()).filter(c => c);

    const result = {
      communicationStatus: 'published',
      channels: {
        flyers: {
          status: 'printed',
          quantity: parseInt(flyerQty) || 1000,
          distributionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        digital: {
          status: 'live',
          platforms: digitalChannels.length > 0 ? digitalChannels : ['website', 'email'],
          impressions: 0
        },
        inStore: {
          status: 'deployed',
          posters: parseInt(posterQty) || 50,
          shelfTalkers: Math.floor((parseInt(posterQty) || 50) * 2)
        }
      },
      campaignId: `PROMO-${Date.now()}`,
      headline: headline || job.variables.promotionText || 'Special Promotion!',
      publishTimestamp: new Date().toISOString(),
      department: 'Marketing'
    };

    console.log('\n   ✅ Marketing campaign published!');
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Marketing worker...');
  await worker.close();
  await zeebe.close();
  process.exit(0);
});
