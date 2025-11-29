/**
 * Interactive Logistics & Procurement Department Worker - Stock Management
 * 
 * Job Types:
 *   - process-replenishment: Supplier selection, PO issuance, shipping
 *   - check-delivery: Receive and check supplier delivery quality
 *   - handle-return: Process returns for non-conforming goods
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
console.log('║     🚚 LOGISTICS & PROCUREMENT - Stock Management Worker     ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Job Types: process-replenishment, check-delivery,           ║');
console.log('║             handle-return                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Waiting for tasks...\n');

// Worker 1: Process Replenishment Request
const processWorker = zeebe.createWorker({
  taskType: 'process-replenishment',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Process Replenishment Order                   ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 APPROVED ORDER DETAILS:');
    console.log(`      • Request ID: ${job.variables.requestId || 'N/A'}`);
    console.log(`      • Product: ${job.variables.productName || 'N/A'}`);
    console.log(`      • Quantity: ${job.variables.orderQuantity || 'N/A'} units`);
    console.log(`      • Total Cost: $${job.variables.totalOrderCost || 'N/A'}`);
    console.log(`      • Payment Terms: ${job.variables.paymentTerms || 'N/A'}`);
    console.log('');

    console.log('📦 Process the purchase order:\n');
    
    const supplier = await prompt('   Supplier name: ');
    const supplierId = await prompt('   Supplier ID: ');
    const estimatedDelivery = await prompt('   Estimated delivery date (YYYY-MM-DD): ');
    const shippingMethod = await prompt('   Shipping method (standard/express/freight): ');
    const trackingNumber = await prompt('   Tracking number (or press Enter to generate): ');

    const poNumber = `PO-${Date.now()}`;
    const tracking = trackingNumber || `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = {
      purchaseOrderNumber: poNumber,
      supplierId: supplierId || 'SUP-001',
      supplierName: supplier || 'Default Supplier Inc.',
      orderQuantity: job.variables.orderQuantity,
      totalCost: job.variables.totalOrderCost,
      estimatedDeliveryDate: estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shippingMethod: shippingMethod || 'standard',
      trackingNumber: tracking,
      poStatus: 'issued',
      poIssuedTimestamp: new Date().toISOString(),
      department: 'Logistics & Procurement'
    };

    console.log('\n   ✅ Purchase Order issued!');
    console.log(`   📋 PO Number: ${poNumber}`);
    console.log(`   🚚 Tracking: ${tracking}`);
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

// Worker 2: Check Delivery
const checkDeliveryWorker = zeebe.createWorker({
  taskType: 'check-delivery',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Receive and Check Delivery                    ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 DELIVERY DETAILS:');
    console.log(`      • PO Number: ${job.variables.purchaseOrderNumber || 'N/A'}`);
    console.log(`      • Supplier: ${job.variables.supplierName || 'N/A'}`);
    console.log(`      • Expected Quantity: ${job.variables.orderQuantity || 'N/A'} units`);
    console.log(`      • Tracking: ${job.variables.trackingNumber || 'N/A'}`);
    console.log('');

    console.log('🔍 Perform delivery inspection:\n');
    
    const receivedQty = await prompt('   Quantity received: ');
    const damagedQty = await prompt('   Damaged/defective items: ');
    const qualityScore = await prompt('   Quality score (1-10): ');
    
    console.log('');
    console.log('   ╔═══════════════════════════════════════════════════════╗');
    console.log('   ║  ⚠️  DECISION: Is the delivery conforming?            ║');
    console.log('   ╚═══════════════════════════════════════════════════════╝');
    const conformingInput = await prompt('   Accept this delivery? (yes/no): ');

    const deliveryConforming = conformingInput.toLowerCase() === 'yes' || conformingInput.toLowerCase() === 'y';
    const received = parseInt(receivedQty) || 0;
    const damaged = parseInt(damagedQty) || 0;

    const result = {
      deliveryConforming: deliveryConforming,
      quantityReceived: received,
      quantityAccepted: received - damaged,
      quantityDamaged: damaged,
      qualityScore: parseInt(qualityScore) || 8,
      inspectionTimestamp: new Date().toISOString(),
      inspectedBy: 'Logistics Team',
      deliveryNotes: deliveryConforming 
        ? 'Delivery accepted. Quality standards met.'
        : 'Delivery rejected. Quality issues or quantity discrepancy.',
      department: 'Logistics & Procurement'
    };

    console.log('');
    if (deliveryConforming) {
      console.log('   ✅ DELIVERY ACCEPTED! Proceeding to IT for system update...');
    } else {
      console.log('   ❌ DELIVERY REJECTED! Proceeding to return process...');
    }
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

// Worker 3: Handle Return
const handleReturnWorker = zeebe.createWorker({
  taskType: 'handle-return',
  taskHandler: async (job) => {
    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📥 NEW TASK: Process Return for Non-Conforming Delivery    ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`   Job Key: ${job.key}`);
    console.log('');
    
    console.log('   📋 REJECTED DELIVERY DETAILS:');
    console.log(`      • PO Number: ${job.variables.purchaseOrderNumber || 'N/A'}`);
    console.log(`      • Supplier: ${job.variables.supplierName || 'N/A'}`);
    console.log(`      • Quality Score: ${job.variables.qualityScore || 'N/A'}/10`);
    console.log(`      • Damaged Items: ${job.variables.quantityDamaged || 'N/A'}`);
    console.log('');

    console.log('📦 Process the return:\n');
    
    const returnReason = await prompt('   Return reason (quality/damage/wrong-item/quantity): ');
    const refundRequested = await prompt('   Request refund? (yes/no): ');
    const replacementRequested = await prompt('   Request replacement? (yes/no): ');
    const returnNotes = await prompt('   Additional notes: ');

    const rmaNumber = `RMA-${Date.now()}`;

    const result = {
      rmaNumber: rmaNumber,
      returnReason: returnReason || 'quality',
      refundRequested: refundRequested.toLowerCase() === 'yes',
      replacementRequested: replacementRequested.toLowerCase() === 'yes',
      quantityReturned: job.variables.quantityReceived || 0,
      returnStatus: 'initiated',
      returnNotes: returnNotes || 'Non-conforming delivery returned to supplier.',
      returnTimestamp: new Date().toISOString(),
      processedBy: 'Logistics Team',
      department: 'Logistics & Procurement'
    };

    console.log('\n   ✅ Return processed!');
    console.log(`   📋 RMA Number: ${rmaNumber}`);
    console.log('   📤 Output:', JSON.stringify(result, null, 2));
    console.log('\n⏳ Waiting for next task...\n');

    return job.complete(result);
  }
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Logistics & Procurement workers...');
  await processWorker.close();
  await checkDeliveryWorker.close();
  await handleReturnWorker.close();
  await zeebe.close();
  process.exit(0);
});
