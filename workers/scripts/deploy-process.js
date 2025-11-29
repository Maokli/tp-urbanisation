/**
 * Deploy BPMN Process to Camunda 8 SaaS
 * 
 * Run this script once to deploy the process definition to your cluster.
 * Usage: node scripts/deploy-process.js
 */

require('dotenv').config();
const { Camunda8 } = require('@camunda8/sdk');
const fs = require('fs');
const path = require('path');

async function deployProcess() {
  console.log('🚀 Deploying BPMN Process to Camunda 8...\n');
  
  const c8 = new Camunda8();
  const zeebe = c8.getZeebeGrpcApiClient();
  
  const bpmnPath = path.join(__dirname, '../../process-zeebe.bpmn');
  
  if (!fs.existsSync(bpmnPath)) {
    console.error('❌ BPMN file not found at:', bpmnPath);
    process.exit(1);
  }
  
  try {
    const result = await zeebe.deployResource({
      processFilename: bpmnPath
    });
    
    console.log('✅ Process deployed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Deployment Details:');
    console.log('   Key:', result.deployments[0].process.processDefinitionKey);
    console.log('   BPMN Process ID:', result.deployments[0].process.bpmnProcessId);
    console.log('   Version:', result.deployments[0].process.version);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
  } finally {
    await zeebe.close();
  }
}

deployProcess();
