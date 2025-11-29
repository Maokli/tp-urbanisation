/**
 * Start a new Process Instance
 * 
 * Use this script to start a new promotion workflow instance.
 * Usage: node scripts/start-process.js
 */

require('dotenv').config();
const { Camunda8 } = require('@camunda8/sdk');

async function startProcess() {
  console.log('🚀 Starting new Product Promotion Process...\n');
  
  const c8 = new Camunda8();
  const zeebe = c8.getZeebeGrpcApiClient();
  
  try {
    const result = await zeebe.createProcessInstance({
      bpmnProcessId: 'ProductPromotionWorkflow',
      variables: {
        initiator: 'API Gateway',
        requestTimestamp: new Date().toISOString(),
        reason: 'Monthly promotion cycle'
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
