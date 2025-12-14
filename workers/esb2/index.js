/**
 * ESB2 - Enterprise Service Bus for Commercial, Marketing & IT
 * Port: 3002
 * 
 * Endpoints:
 *   - POST /api/propose-promotion - Generate promo code, format dates
 *   - POST /api/prepare-instore - Validate store IDs
 *   - POST /api/update-physical-prices - Count summary and completion rate
 *   - POST /api/prepare-materials - Prioritize channels, estimate reach
 *   - POST /api/update-prices - Batch systems, add sync timestamp
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.ESB2_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Helper to generate promo code
function generatePromoCode(discount, duration) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomPart = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PROMO${discount}${randomPart}${duration}D`;
}

// Helper to format date to locale
function formatDateLocale(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * POST /api/propose-promotion
 * 
 * Transforms promotion proposal data:
 * - Generate unique promotion code
 * - Format start/end dates to locale
 */
app.post('/api/propose-promotion', (req, res) => {
  const { discount, promoText, durationDays } = req.body;

  const discountValue = parseInt(discount) || 20;
  const duration = parseInt(durationDays) || 7;
  const now = new Date();
  const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  const promotionCode = generatePromoCode(discountValue, duration);

  const response = {
    success: true,
    original: {
      discount,
      promoText,
      durationDays
    },
    transformed: {
      promotionCode,
      discountPercentage: discountValue,
      promotionText: promoText || `${discountValue}% OFF!`,
      formattedStartDate: formatDateLocale(now),
      formattedEndDate: formatDateLocale(endDate),
      startDateISO: now.toISOString(),
      endDateISO: endDate.toISOString(),
      durationDays: duration,
      generatedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'propose-promotion'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/prepare-instore
 * 
 * Transforms in-store preparation data:
 * - Validate and normalize store IDs
 * - Add preparation timestamp
 */
app.post('/api/prepare-instore', (req, res) => {
  const { storeIds, labelsReady } = req.body;

  // Parse store IDs
  let stores = [];
  if (typeof storeIds === 'string') {
    stores = storeIds.split(',').map(s => s.trim()).filter(s => s);
  } else if (Array.isArray(storeIds)) {
    stores = storeIds;
  }

  // Validate store IDs (must start with 'S' or be numeric)
  const validatedStores = stores.map(store => {
    const normalized = store.toUpperCase();
    const isValid = /^S\d+$/.test(normalized) || /^\d+$/.test(store);
    return {
      id: normalized.startsWith('S') ? normalized : `S${normalized.padStart(3, '0')}`,
      originalId: store,
      valid: isValid || true, // For demo, mark all as valid
      status: labelsReady ? 'ready' : 'pending'
    };
  });

  const response = {
    success: true,
    original: {
      storeIds: stores,
      labelsReady
    },
    transformed: {
      validatedStores,
      storeCount: validatedStores.length,
      allValid: validatedStores.every(s => s.valid),
      labelsStatus: labelsReady ? 'READY' : 'PENDING',
      preparedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'prepare-instore'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/update-physical-prices
 * 
 * Transforms physical price update data:
 * - Calculate update summary
 * - Compute completion rate
 */
app.post('/api/update-physical-prices', (req, res) => {
  const { labelsUpdated, allStoresCompleted, storeCount } = req.body;

  const labels = parseInt(labelsUpdated) || 0;
  const stores = parseInt(storeCount) || 10;
  const completed = allStoresCompleted === true || allStoresCompleted === 'true';

  const completionRate = completed ? 100 : Math.min(95, Math.round((labels / (stores * 50)) * 100));

  const response = {
    success: true,
    original: {
      labelsUpdated,
      allStoresCompleted,
      storeCount
    },
    transformed: {
      updateSummary: {
        totalLabelsUpdated: labels,
        estimatedStores: stores,
        averageLabelsPerStore: stores > 0 ? Math.round(labels / stores) : 0
      },
      completionRate: `${completionRate}%`,
      completionStatus: completionRate === 100 ? 'COMPLETE' : completionRate > 75 ? 'NEARLY_COMPLETE' : 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'update-physical-prices'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/prepare-materials
 * 
 * Transforms marketing materials data:
 * - Prioritize channels by reach
 * - Estimate campaign reach
 * - Generate campaign ID
 */
app.post('/api/prepare-materials', (req, res) => {
  const { flyerQty, digitalChannels, posterQty, headline } = req.body;

  // Parse digital channels
  let channels = [];
  if (typeof digitalChannels === 'string') {
    channels = digitalChannels.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
  } else if (Array.isArray(digitalChannels)) {
    channels = digitalChannels.map(c => c.toLowerCase());
  }

  // Channel reach multipliers
  const channelReach = {
    email: 5000,
    social_media: 10000,
    website: 3000,
    mobile_app: 2000,
    facebook: 8000,
    instagram: 7000,
    twitter: 4000
  };

  // Calculate estimated reach
  const flyerReach = (parseInt(flyerQty) || 0) * 2; // Each flyer reaches ~2 people
  const posterReach = (parseInt(posterQty) || 0) * 50; // Each poster seen by ~50 people
  const digitalReach = channels.reduce((sum, ch) => sum + (channelReach[ch] || 1000), 0);
  const totalReach = flyerReach + posterReach + digitalReach;

  // Prioritize channels
  const channelPriority = channels
    .map(ch => ({ channel: ch, reach: channelReach[ch] || 1000 }))
    .sort((a, b) => b.reach - a.reach)
    .map((item, idx) => ({ ...item, priority: idx + 1 }));

  const campaignId = `CAMP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const response = {
    success: true,
    original: {
      flyerQty,
      digitalChannels: channels,
      posterQty,
      headline
    },
    transformed: {
      channelPriority,
      estimatedReach: {
        total: totalReach,
        breakdown: {
          flyers: flyerReach,
          posters: posterReach,
          digital: digitalReach
        }
      },
      campaignId,
      headline: headline || 'Special Promotion!',
      materialsSummary: {
        flyerCount: parseInt(flyerQty) || 0,
        posterCount: parseInt(posterQty) || 0,
        digitalChannelCount: channels.length
      },
      preparedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'prepare-materials'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/update-prices
 * 
 * Transforms system price update data:
 * - Batch systems with status
 * - Add sync timestamp and batch ID
 */
app.post('/api/update-prices', (req, res) => {
  const { posUpdated, erpUpdated, ecomUpdated, inventoryUpdated, terminalCount } = req.body;

  const toBool = (val) => val === true || val === 'true' || val === 'yes';

  const systems = [
    { name: 'POS', updated: toBool(posUpdated), terminals: parseInt(terminalCount) || 0 },
    { name: 'ERP', updated: toBool(erpUpdated) },
    { name: 'E-Commerce', updated: toBool(ecomUpdated) },
    { name: 'Inventory', updated: toBool(inventoryUpdated) }
  ];

  const updatedSystems = systems.filter(s => s.updated).length;
  const totalSystems = systems.length;

  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const response = {
    success: true,
    original: {
      posUpdated,
      erpUpdated,
      ecomUpdated,
      inventoryUpdated,
      terminalCount
    },
    transformed: {
      syncTimestamp: new Date().toISOString(),
      batchId,
      systemStatuses: systems.map(s => ({
        system: s.name,
        status: s.updated ? 'SYNCED' : 'PENDING',
        ...(s.terminals !== undefined && { terminals: s.terminals })
      })),
      summary: {
        totalSystems,
        updatedSystems,
        pendingSystems: totalSystems - updatedSystems,
        syncPercentage: `${Math.round((updatedSystems / totalSystems) * 100)}%`
      },
      esb: 'ESB2',
      endpoint: 'update-prices'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

// ============================================================================
// STOCK MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/create-replenishment
 */
app.post('/api/create-replenishment', (req, res) => {
  const { productId, productName, orderQuantity, priority, notes } = req.body;
  
  const response = {
    success: true,
    transformed: {
      requestId: `REQ-${Date.now()}`,
      productId,
      productName,
      orderQuantity: parseInt(orderQuantity) || 100,
      priority: priority || 'medium',
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'create-replenishment'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/verify-stock
 */
app.post('/api/verify-stock', (req, res) => {
  const { physicalCount, currentStock, location, verified } = req.body;
  
  const response = {
    success: true,
    transformed: {
      stockVerified: verified === true || verified === 'yes',
      physicalStockCount: parseInt(physicalCount) || 0,
      systemStockCount: parseInt(currentStock) || 0,
      discrepancy: Math.abs((parseInt(physicalCount) || 0) - (parseInt(currentStock) || 0)),
      stockLocation: location || 'Warehouse A',
      verifiedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'verify-stock'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/process-replenishment
 */
app.post('/api/process-replenishment', (req, res) => {
  const { supplier, supplierId, orderQuantity, totalCost, shippingMethod, estimatedDelivery } = req.body;
  
  const poNumber = `PO-${Date.now()}`;
  const tracking = `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const response = {
    success: true,
    transformed: {
      purchaseOrderNumber: poNumber,
      trackingNumber: tracking,
      supplierId: supplierId || 'SUP-001',
      supplierName: supplier || 'Default Supplier',
      poStatus: 'issued',
      shippingMethod: shippingMethod || 'standard',
      estimatedDeliveryDate: estimatedDelivery || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'process-replenishment'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/check-delivery
 */
app.post('/api/check-delivery', (req, res) => {
  const { receivedQty, damagedQty, qualityScore, conforming } = req.body;
  
  const received = parseInt(receivedQty) || 0;
  const damaged = parseInt(damagedQty) || 0;
  
  const response = {
    success: true,
    transformed: {
      deliveryConforming: conforming === true || conforming === 'yes',
      quantityReceived: received,
      quantityAccepted: received - damaged,
      quantityDamaged: damaged,
      qualityScore: parseInt(qualityScore) || 8,
      inspectedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'check-delivery'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/handle-return
 */
app.post('/api/handle-return', (req, res) => {
  const { returnReason, refundRequested, replacementRequested, quantityReturned, notes } = req.body;
  
  const response = {
    success: true,
    transformed: {
      rmaNumber: `RMA-${Date.now()}`,
      returnReason: returnReason || 'quality',
      refundRequested: refundRequested === true || refundRequested === 'yes',
      replacementRequested: replacementRequested === true || replacementRequested === 'yes',
      quantityReturned: parseInt(quantityReturned) || 0,
      returnStatus: 'initiated',
      processedAt: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'handle-return'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/update-stock-systems
 */
app.post('/api/update-stock-systems', (req, res) => {
  const { erpUpdated, wmsUpdated, posUpdated, previousStock, quantityAdded, newStockLevel } = req.body;
  
  const toBool = (val) => val === true || val === 'true' || val === 'yes';
  
  const response = {
    success: true,
    transformed: {
      systemUpdateStatus: 'success',
      systemsUpdated: {
        erp: toBool(erpUpdated) ? 'updated' : 'pending',
        wms: toBool(wmsUpdated) ? 'updated' : 'pending',
        pos: toBool(posUpdated) ? 'synchronized' : 'pending'
      },
      stockLevels: {
        previousStock: parseInt(previousStock) || 0,
        quantityAdded: parseInt(quantityAdded) || 0,
        newStockLevel: parseInt(newStockLevel) || 0
      },
      syncTimestamp: new Date().toISOString(),
      esb: 'ESB2',
      endpoint: 'update-stock-systems'
    }
  };
  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', esb: 'ESB2', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    🔌 ESB2 - Commercial, Marketing, IT, Logistics, Merch     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║                                                              ║');
  console.log('║  Promotion Endpoints:                                        ║');
  console.log('║    POST /api/propose-promotion                               ║');
  console.log('║    POST /api/prepare-instore                                 ║');
  console.log('║    POST /api/update-physical-prices                          ║');
  console.log('║    POST /api/prepare-materials                               ║');
  console.log('║    POST /api/update-prices                                   ║');
  console.log('║                                                              ║');
  console.log('║  Stock Endpoints:                                            ║');
  console.log('║    POST /api/create-replenishment                            ║');
  console.log('║    POST /api/verify-stock                                    ║');
  console.log('║    POST /api/process-replenishment                           ║');
  console.log('║    POST /api/check-delivery                                  ║');
  console.log('║    POST /api/handle-return                                   ║');
  console.log('║    POST /api/update-stock-systems                            ║');
  console.log('║    GET  /health                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
