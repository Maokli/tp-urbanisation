/**
 * ESB1 - Enterprise Service Bus for Data Analysis & Finance
 * Port: 3001
 * 
 * Endpoints:
 *   - POST /api/identify-products - Transform product data with analysis scoring
 *   - POST /api/evaluate-profitability - Calculate margin impact and risk categorization
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.ESB1_PORT || 3001;

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

/**
 * POST /api/identify-products
 * 
 * Transforms product identification data:
 * - Uppercase product IDs
 * - Calculate analysis score based on urgency and reason
 * - Add enrichment timestamp
 */
app.post('/api/identify-products', (req, res) => {
  const { productIds, reason, urgency } = req.body;

  // Parse product IDs (handle comma-separated string or array)
  let products = [];
  if (typeof productIds === 'string') {
    products = productIds.split(',').map(p => p.trim()).filter(p => p);
  } else if (Array.isArray(productIds)) {
    products = productIds;
  }

  // Normalize IDs to uppercase
  const normalizedIds = products.map(id => id.toUpperCase());

  // Calculate analysis score based on urgency and reason
  const urgencyScores = { high: 30, medium: 20, low: 10 };
  const reasonScores = {
    expiring: 40,
    low_sales: 30,
    overstock: 25,
    seasonal: 20
  };

  const urgencyScore = urgencyScores[urgency?.toLowerCase()] || 15;
  const reasonScore = reasonScores[reason?.toLowerCase()] || 15;
  const analysisScore = urgencyScore + reasonScore + (products.length * 2);

  const response = {
    success: true,
    original: {
      productIds: products,
      reason,
      urgency
    },
    transformed: {
      normalizedIds,
      analysisScore: Math.min(analysisScore, 100),
      productCount: normalizedIds.length,
      priority: analysisScore > 60 ? 'high' : analysisScore > 40 ? 'medium' : 'low',
      enrichedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'identify-products'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/evaluate-profitability
 * 
 * Transforms profitability evaluation data:
 * - Calculate margin impact percentage
 * - Classify risk category
 * - Generate recommendation based on approval
 */
app.post('/api/evaluate-profitability', (req, res) => {
  const { margin, revenueImpact, riskLevel, approved } = req.body;

  // Parse numeric values
  const marginValue = parseFloat(margin) || 0;
  const revenueValue = parseFloat(String(revenueImpact).replace('%', '').replace('+', '')) || 0;

  // Calculate margin impact
  const marginImpact = ((marginValue - 35) / 35 * 100).toFixed(2);

  // Classify risk category
  let riskCategory;
  const risk = riskLevel?.toLowerCase() || 'medium';
  if (risk === 'high' || marginValue < 10) {
    riskCategory = 'HIGH_RISK';
  } else if (risk === 'low' && marginValue > 20) {
    riskCategory = 'LOW_RISK';
  } else {
    riskCategory = 'MODERATE_RISK';
  }

  // Generate recommendation
  let recommendation;
  if (approved) {
    if (riskCategory === 'LOW_RISK') {
      recommendation = 'PROCEED_IMMEDIATELY';
    } else if (riskCategory === 'MODERATE_RISK') {
      recommendation = 'PROCEED_WITH_MONITORING';
    } else {
      recommendation = 'PROCEED_WITH_CAUTION';
    }
  } else {
    recommendation = 'PROMOTION_REJECTED';
  }

  const response = {
    success: true,
    original: {
      margin,
      revenueImpact,
      riskLevel,
      approved
    },
    transformed: {
      marginImpact: `${marginImpact}%`,
      riskCategory,
      recommendation,
      financialScore: Math.round((marginValue + revenueValue) / 2),
      approvalStatus: approved ? 'APPROVED' : 'REJECTED',
      evaluatedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'evaluate-profitability'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/compute-replenishment
 * 
 * Transforms replenishment quantity calculation:
 * - Calculate reorder point based on lead time and safety stock
 * - Generate recommended order quantity
 */
app.post('/api/compute-replenishment', (req, res) => {
  const { productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays } = req.body;

  const dailySales = parseFloat(avgDailySales) || 10;
  const leadTime = parseInt(leadTimeDays) || 7;
  const safetyDays = parseInt(safetyStockDays) || 5;
  const current = parseInt(currentStock) || 0;

  const reorderPoint = dailySales * (leadTime + safetyDays);
  const recommendedQty = Math.max(0, Math.ceil(reorderPoint - current + (dailySales * 14)));

  const response = {
    success: true,
    original: { productId, productName, currentStock, avgDailySales, leadTimeDays, safetyStockDays },
    transformed: {
      productId: productId || 'SKU-UNKNOWN',
      reorderPoint: Math.ceil(reorderPoint),
      recommendedQuantity: recommendedQty,
      calculationMethod: 'Safety Stock + Lead Time + 2-Week Buffer',
      projectedDaysOfStock: current > 0 ? Math.ceil(current / dailySales) : 0,
      urgencyLevel: current < reorderPoint ? 'high' : current < reorderPoint * 1.5 ? 'medium' : 'low',
      calculatedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'compute-replenishment'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

/**
 * POST /api/analyze-replenishment
 * 
 * Transforms financial analysis of replenishment request
 */
app.post('/api/analyze-replenishment', (req, res) => {
  const { unitCost, budget, moq, orderQuantity, paymentTerms, approved } = req.body;

  const cost = parseFloat(unitCost) || 10;
  const qty = parseInt(orderQuantity) || 100;
  const totalCost = cost * qty;
  const availableBudget = parseFloat(budget) || 10000;
  const withinBudget = totalCost <= availableBudget;

  const response = {
    success: true,
    original: { unitCost, budget, moq, orderQuantity, paymentTerms, approved },
    transformed: {
      totalOrderCost: totalCost,
      budgetRemaining: availableBudget - totalCost,
      withinBudget,
      financialScore: withinBudget ? 'FAVORABLE' : 'UNFAVORABLE',
      recommendation: approved ? 'PROCEED_WITH_ORDER' : 'ORDER_REJECTED',
      analyzedAt: new Date().toISOString(),
      esb: 'ESB1',
      endpoint: 'analyze-replenishment'
    }
  };

  console.log('  Response:', JSON.stringify(response.transformed, null, 2));
  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', esb: 'ESB1', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🔌 ESB1 - Data Analysis & Finance                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                    ║`);
  console.log('║                                                              ║');
  console.log('║  Endpoints:                                                  ║');
  console.log('║    POST /api/identify-products                               ║');
  console.log('║    POST /api/evaluate-profitability                          ║');
  console.log('║    POST /api/compute-replenishment      [STOCK]              ║');
  console.log('║    POST /api/analyze-replenishment      [STOCK]              ║');
  console.log('║    GET  /health                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
