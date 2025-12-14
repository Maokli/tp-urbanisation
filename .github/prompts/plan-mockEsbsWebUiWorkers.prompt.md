# Plan: Mock ESBs + Web UI Workers with Real-Time Notifications

Create 2 Express.js ESB servers with data transformations, and refactor workers to use per-department web UIs with real-time Socket.io notifications and Tailwind CSS via CDN.

## Steps

1. **Create `workers/esb1/` folder** (port 3001) - Express server for Data Analysis & Finance:
   - `index.js` - Main server with logging middleware
   - `POST /api/identify-products` - Transform: add `analysisScore`, uppercase product IDs, add `enrichedAt`
   - `POST /api/evaluate-profitability` - Transform: calculate `marginImpact`, classify `riskCategory`

2. **Create `workers/esb2/` folder** (port 3002) - Express server for Commercial, Marketing & IT:
   - `index.js` - Main server with logging middleware
   - `POST /api/propose-promotion` - Transform: generate `promotionCode`, format dates to locale
   - `POST /api/prepare-instore`, `POST /api/update-physical-prices` - Commercial endpoints
   - `POST /api/prepare-materials` - Transform: add `channelPriority`
   - `POST /api/update-prices` - Transform: add `syncTimestamp`, `batchId`

3. **Create 5 separate department UI apps** in `workers/ui-{department}/` folders:
   - `workers/ui-data-analysis/` (port 4001)
   - `workers/ui-commercial/` (port 4002)
   - `workers/ui-finance/` (port 4003)
   - `workers/ui-marketing/` (port 4004)
   - `workers/ui-it/` (port 4005)
   - Each contains: `server.js`, `views/index.ejs`, `public/` folder

4. **Each department UI includes**:
   - Express + EJS + Socket.io server
   - Zeebe worker subscribing to department-specific job type(s)
   - Real-time push to browser when new task arrives via `io.emit('new-task', job)`
   - Form tailored to that department's input fields
   - On submit: call ESB endpoint via axios, complete Zeebe job, emit `task-completed`

5. **Create shared layout template** in `workers/ui-common/`:
   - `layout.ejs` - Base HTML with Tailwind CDN (`<script src="https://cdn.tailwindcss.com">`), Socket.io client, common styles
   - `esb-client.js` - Shared axios wrapper routing to ESB1/ESB2 based on endpoint

6. **Update `workers/.env.example`** - Add ESB URLs and UI ports:
   ```
   ESB1_URL=http://localhost:3001
   ESB2_URL=http://localhost:3002
   ```

7. **Update `workers/package.json`** - Add dependencies and scripts:
   - Dependencies: `express`, `ejs`, `axios`, `socket.io`
   - Scripts: `esb1`, `esb2`, `ui:data-analysis`, `ui:commercial`, `ui:finance`, `ui:marketing`, `ui:it`, `start:all`

## Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │        Department UIs               │
                                    │  ┌───────────┐  ┌───────────┐       │
┌──────────────┐      gRPC          │  │Data Anal. │  │Commercial │  ...  │
│   Camunda    │◄─────────────────►│  │  :4001    │  │  :4002    │       │
│    Zeebe     │                    │  └─────┬─────┘  └─────┬─────┘       │
└──────────────┘                    │        │ Socket.io    │             │
                                    │        ▼              ▼             │
                                    │  ┌─────────────────────────────────┐│
                                    │  │   Browser (Tailwind + Forms)    ││
                                    │  └─────────────────────────────────┘│
                                    └──────────────┬──────────────────────┘
                                                   │ HTTP (axios)
                          ┌────────────────────────┴────────────────────────┐
                          ▼                                                  ▼
                 ┌─────────────────┐                              ┌─────────────────┐
                 │  ESB1 (:3001)   │                              │  ESB2 (:3002)   │
                 │  Data Analysis  │                              │  Commercial     │
                 │  Finance        │                              │  Marketing      │
                 └─────────────────┘                              │  IT             │
                                                                  └─────────────────┘
```

## Port Assignments

| Component | Port | Purpose |
|-----------|------|---------|
| ESB1 | 3001 | Data Analysis & Finance endpoints |
| ESB2 | 3002 | Commercial, Marketing & IT endpoints |
| UI - Data Analysis | 4001 | `identify-products` form |
| UI - Commercial | 4002 | `propose-promotion`, `prepare-instore-update`, `update-physical-prices` forms |
| UI - Finance | 4003 | `evaluate-profitability` form |
| UI - Marketing | 4004 | `prepare-promotion-material` form |
| UI - IT | 4005 | `update-system-prices` form |

## Real-Time Flow

1. Zeebe job arrives → Worker stores in memory queue
2. Server emits `io.emit('new-task', { jobKey, variables })`
3. Browser receives event → Shows notification toast + updates task list
4. User fills form → Submits via POST to `/complete-task`
5. Server calls ESB endpoint → Gets transformed response
6. Server completes Zeebe job → Emits `io.emit('task-completed', { jobKey })`
7. Browser updates UI → Removes task from pending list

## Data Transformations by ESB

### ESB1 (Data Analysis & Finance)

| Endpoint | Input | Transformation | Output Added |
|----------|-------|----------------|--------------|
| `/api/identify-products` | `productIds`, `reason`, `urgency` | Uppercase IDs, score calculation | `analysisScore`, `normalizedIds`, `enrichedAt` |
| `/api/evaluate-profitability` | `margin`, `revenueImpact`, `riskLevel`, `approved` | Calculate margin impact | `marginImpact`, `riskCategory`, `recommendation` |

### ESB2 (Commercial, Marketing & IT)

| Endpoint | Input | Transformation | Output Added |
|----------|-------|----------------|--------------|
| `/api/propose-promotion` | `discount`, `promoText`, `durationDays` | Generate promo code, format dates | `promotionCode`, `formattedStartDate`, `formattedEndDate` |
| `/api/prepare-instore` | `storeIds`, `labelsReady` | Validate store IDs | `validatedStores`, `preparedAt` |
| `/api/update-physical-prices` | `labelsUpdated`, `allStoresCompleted` | Count summary | `updateSummary`, `completionRate` |
| `/api/prepare-materials` | `flyerQty`, `digitalChannels`, `posterQty`, `headline` | Prioritize channels | `channelPriority`, `estimatedReach`, `campaignId` |
| `/api/update-prices` | `posUpdated`, `erpUpdated`, `ecomUpdated`, `inventoryUpdated`, `terminalCount` | Batch systems | `syncTimestamp`, `batchId`, `systemStatuses` |

## Form Fields by Department UI

### Data Analysis (port 4001)
- Product IDs (textarea, comma-separated)
- Reason for promotion (select: expiring, low_sales, overstock, seasonal)
- Urgency level (radio: low, medium, high)

### Commercial (port 4002)
**propose-promotion:**
- Discount percentage (range slider 5-50%)
- Promotional text (textarea)
- Duration in days (number input)

**prepare-instore-update:**
- Store IDs (textarea, comma-separated)
- Labels ready (checkbox)

**update-physical-prices:**
- Number of labels updated (number)
- All stores completed (checkbox)

### Finance (port 4003)
- Expected margin % (number)
- Revenue impact (number, can be negative)
- Risk level (select: low, medium, high)
- **Approve promotion** (checkbox) - Critical workflow decision

### Marketing (port 4004)
- Flyer quantity (number)
- Digital channels (checkboxes: email, social_media, website, mobile_app)
- Poster quantity (number)
- Campaign headline (text input)

### IT (port 4005)
- POS updated (checkbox)
- Number of POS terminals (number, shown if POS checked)
- ERP updated (checkbox)
- E-commerce updated (checkbox)
- Inventory updated (checkbox)

## File Structure

```
workers/
├── .env.example          # Updated with ESB URLs
├── package.json          # Updated with new deps & scripts
├── esb1/
│   ├── package.json
│   └── index.js          # Data Analysis & Finance ESB
├── esb2/
│   ├── package.json
│   └── index.js          # Commercial, Marketing & IT ESB
├── ui-common/
│   ├── esb-client.js     # Shared axios wrapper
│   └── views/
│       ├── layout.ejs    # Base template with Tailwind CDN
│       └── partials/
│           ├── header.ejs
│           ├── notification.ejs
│           └── task-card.ejs
├── ui-data-analysis/
│   ├── package.json
│   ├── server.js
│   └── views/
│       └── index.ejs
├── ui-commercial/
│   ├── package.json
│   ├── server.js
│   └── views/
│       └── index.ejs
├── ui-finance/
│   ├── package.json
│   ├── server.js
│   └── views/
│       └── index.ejs
├── ui-marketing/
│   ├── package.json
│   ├── server.js
│   └── views/
│       └── index.ejs
└── ui-it/
    ├── package.json
    ├── server.js
    └── views/
        └── index.ejs
```

## Implementation Notes

- Keep existing `worker.js` and `worker-interactive.js` files as fallback/reference
- Each UI server is self-contained with its own Zeebe worker
- Socket.io handles real-time task notifications (no polling)
- ESB responses are logged with transformations applied
- Error handling: show toast notification on ESB failure, allow retry
