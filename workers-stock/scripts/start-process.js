/**
 * Start a new Stock Management Process Instance
 * 
 * Use this script to start a new stock replenishment workflow instance.
 * Usage: node scripts/start-process.js
 */

require('dotenv').config();
const { Camunda8 } = require('@camunda8/sdk');
const readline = require('readline');

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

async function startProcess() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       📦 START STOCK REPLENISHMENT PROCESS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get initial input
  const productId = await prompt('   Product ID (e.g., SKU-12345): ');
  const alertSource = await prompt('   Alert source (manual/automatic/low-stock-alert): ');

  console.log('\n🚀 Starting new Stock Replenishment Process...\n');
  
  const c8 = new Camunda8();
  const zeebe = c8.getZeebeGrpcApiClient();
  
  try {
    const result = await zeebe.createProcessInstance({
      bpmnProcessId: 'StockReplenishmentWorkflow',
      variables: {
        productId: productId || 'SKU-UNKNOWN',
        alertSource: alertSource || 'manual',
        initiator: 'Stock Management System',
        requestTimestamp: new Date().toISOString(),
        triggerReason: 'Product out of stock detected'
      }
    });
    
    console.log('✅ Process instance started successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Instance Details:');
    console.log('   Process Instance Key:', result.processInstanceKey);
    console.log('   Process Definition Key:', result.processDefinitionKey);
    console.log('   BPMN Process ID:', result.bpmnProcessId);
    console.log('   Version:', result.version);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 View progress at: https://console.cloud.camunda.io');
    console.log('   Go to: Operate > Process Instances\n');
    
  } catch (error) {
    console.error('❌ Failed to start process:', error.message);
  } finally {
    await zeebe.close();
  }
}

startProcess();
