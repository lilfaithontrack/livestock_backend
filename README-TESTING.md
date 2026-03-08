# Seller Platform API Testing

This directory contains test scripts to verify all seller delivery management API endpoints are working correctly.

## Setup

1. Install dependencies:
```bash
npm install axios
```

2. Set environment variables:
```bash
export BASE_URL="http://localhost:3000/api/v1"  # or your production URL
export JWT_TOKEN="your-seller-jwt-token-here"
```

3. Get a JWT token by logging in as a seller user.

## Test Scripts

### 1. Delivery Agents Test
Tests the complete seller delivery agent management flow:
- Register new delivery agent
- List all agents
- Get agent details
- Update agent info
- Toggle availability
- Get agent stats
- Track deliveries
- Assign agent to order
- Deactivate agent

```bash
# Run delivery agents test
node test-seller-delivery-agents.js

# Or using npm script
npm run test:delivery-agents
```

### 2. Earnings & Bank Accounts Test
Tests seller earnings and bank account management:
- Get wallet/earnings summary
- List bank accounts
- Add new bank account
- Get bank account details
- Update bank account
- Set primary account
- Verify bank account
- Delete bank account
- Get/update seller settings

```bash
# Run earnings & bank test
node test-seller-earnings-bank.js

# Or using npm script
npm run test:earnings-bank
```

### 3. Run All Tests
```bash
npm run test:all
```

## Expected Results

Each test will output:
- ✅ Success status codes (200, 201)
- ✅ Response data structure
- 📍 Created resource IDs
- ⚠️ Warnings for skipped tests (e.g., no paid orders available)
- ❌ Errors if any endpoint fails

## Test Coverage

### Delivery Agents API Endpoints
- `POST /seller/delivery-agents` - Register agent
- `GET /seller/delivery-agents` - List agents
- `GET /seller/delivery-agents/:id` - Get agent details
- `PUT /seller/delivery-agents/:id` - Update agent
- `DELETE /seller/delivery-agents/:id` - Deactivate agent
- `PUT /seller/delivery-agents/:id/availability` - Toggle availability
- `GET /seller/delivery-agents/:id/stats` - Get agent stats
- `POST /seller/orders/:orderId/assign-agent` - Assign agent to order
- `GET /seller/delivery-tracking` - Get delivery tracking

### Earnings & Bank Accounts API Endpoints
- `GET /seller/earnings` - Get wallet summary
- `GET /seller/bank-accounts` - List bank accounts
- `POST /seller/bank-accounts` - Add bank account
- `GET /seller/bank-accounts/:id` - Get bank account
- `PUT /seller/bank-accounts/:id` - Update bank account
- `PUT /seller/bank-accounts/:id/primary` - Set primary account
- `PUT /seller/bank-accounts/:id/verify` - Verify account
- `DELETE /seller/bank-accounts/:id` - Delete account
- `GET /seller/settings` - Get seller settings
- `PUT /seller/settings` - Update seller settings

## Troubleshooting

### JWT Token Issues
- Make sure you're using a valid seller JWT token
- Token should have `role: "Seller"` claim
- Token must not be expired

### Environment Variables
- `BASE_URL`: Should point to your API server (include `/api/v1`)
- `JWT_TOKEN`: Must be a valid authentication token

### Common Errors
- **401 Unauthorized**: Invalid or expired JWT token
- **403 Forbidden**: User is not a seller
- **404 Not Found**: Endpoint not implemented or incorrect URL
- **500 Server Error**: Database connection or server issues

## Production Testing

For production testing, update the BASE_URL:
```bash
export BASE_URL="https://api.shegergebeya.com/api/v1"
```

Make sure to use a test seller account (not production data) when running tests on production.
