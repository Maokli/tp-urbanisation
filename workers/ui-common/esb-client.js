/**
 * Shared ESB Client for Department UIs
 * Routes requests to the appropriate ESB based on endpoint
 */

const axios = require('axios');

const ESB1_URL = process.env.ESB1_URL || 'http://localhost:3001';
const ESB2_URL = process.env.ESB2_URL || 'http://localhost:3002';

// Endpoint to ESB mapping
const endpointMapping = {
  // ESB1 - Data Analysis & Finance (Promotion)
  '/api/identify-products': ESB1_URL,
  '/api/evaluate-profitability': ESB1_URL,
  
  // ESB2 - Commercial, Marketing & IT (Promotion)
  '/api/propose-promotion': ESB2_URL,
  '/api/prepare-instore': ESB2_URL,
  '/api/update-physical-prices': ESB2_URL,
  '/api/prepare-materials': ESB2_URL,
  '/api/update-prices': ESB2_URL,
  
  // ESB1 - Stock Management
  '/api/compute-replenishment': ESB1_URL,
  '/api/analyze-replenishment': ESB1_URL,
  
  // ESB2 - Stock Management (Merchandising, Logistics, IT)
  '/api/create-replenishment': ESB2_URL,
  '/api/verify-stock': ESB2_URL,
  '/api/process-replenishment': ESB2_URL,
  '/api/check-delivery': ESB2_URL,
  '/api/handle-return': ESB2_URL,
  '/api/update-stock-systems': ESB2_URL
};

/**
 * Call ESB endpoint with automatic routing
 * @param {string} endpoint - The API endpoint (e.g., '/api/identify-products')
 * @param {object} data - The request body data
 * @returns {Promise<object>} - The ESB response
 */
async function callESB(endpoint, data) {
  const baseUrl = endpointMapping[endpoint];
  
  if (!baseUrl) {
    throw new Error(`Unknown ESB endpoint: ${endpoint}`);
  }

  const url = `${baseUrl}${endpoint}`;
  
  console.log(`[ESB Client] Calling ${url}`);
  console.log(`[ESB Client] Request data:`, JSON.stringify(data, null, 2));

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`[ESB Client] Response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`[ESB Client] Error calling ${url}:`, error.message);
    throw error;
  }
}

/**
 * Check ESB health
 * @param {string} esb - 'esb1' or 'esb2'
 * @returns {Promise<object>} - Health check response
 */
async function checkHealth(esb) {
  const url = esb === 'esb1' ? `${ESB1_URL}/health` : `${ESB2_URL}/health`;
  
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.data;
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

module.exports = {
  callESB,
  checkHealth,
  ESB1_URL,
  ESB2_URL
};
