# Seller Delivery Management System - Deployment Guide

## 📋 Overview
This guide covers the deployment of the advanced seller delivery management system to production.

## 🔧 Prerequisites
- cPanel access with MySQL database
- SSH/FTP access to server
- Node.js installed on server
- Git repository access

---

## 📦 Step 1: Database Migration

### Run Migration on cPanel MySQL

1. **Login to cPanel** → Navigate to phpMyAdmin
2. **Select your database**: `ethioltn_sheger`
3. **Open SQL tab**
4. **Copy and paste** the migration script from `migrations/add_seller_delivery_management.sql`
5. **Execute the migration**

### Verify Migration Success

Run this query to verify tables were created:

```sql
-- Check seller_settings table
SELECT COUNT(*) as settings_count FROM seller_settings;

-- Check deliveries table has new columns
SHOW COLUMNS FROM deliveries LIKE 'seller_assigned_by';
SHOW COLUMNS FROM deliveries LIKE 'assignment_type';

-- Verify indexes
SHOW INDEX FROM seller_settings;
SHOW INDEX FROM deliveries WHERE Key_name LIKE 'idx_%';
```

Expected results:
- `seller_settings` table exists with default settings for existing sellers
- `deliveries` table has 9 new columns
- Indexes created on both tables

---

## 🚀 Step 2: Deploy Backend Code

### Option A: Via Git (Recommended)

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to backend directory
cd /path/to/livestock/backend

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart the application
pm2 restart livestock-api
# OR if using other process manager
systemctl restart livestock-api
```

### Option B: Via FTP/cPanel File Manager

1. **Upload new/modified files**:
   - `controllers/sellerDeliveryController.js` ✨ NEW
   - `controllers/sellerSettingsController.js` ✨ NEW
   - `models/SellerSettings.js` ✨ NEW
   - `routes/sellerRoutes.js` ✨ NEW
   - `models/Delivery.js` ✏️ MODIFIED
   - `models/index.js` ✏️ MODIFIED
   - `routes/index.js` ✏️ MODIFIED

2. **Restart Node.js application** via cPanel or SSH

---

## 🧪 Step 3: Test the Deployment

### Quick Health Check

```bash
# Test API is running
curl https://api.shegergebeya.com/api/v1/health

# Expected response:
# {"success": true, "message": "API is running", "timestamp": "..."}
```

### Run Comprehensive Tests

```bash
# Navigate to backend directory
cd /path/to/livestock/backend

# Update test credentials in test-seller-delivery-system.js
# Edit TEST_SELLER object with valid seller credentials

# Run test suite
node test-seller-delivery-system.js
```

### Manual API Testing

Use Postman or curl to test endpoints:

#### 1. Login as Seller
```bash
curl -X POST https://api.shegergebeya.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seller@example.com", "password": "password123"}'
```

#### 2. Get Seller Settings
```bash
curl -X GET https://api.shegergebeya.com/api/v1/seller/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Update Settings
```bash
curl -X PUT https://api.shegergebeya.com/api/v1/seller/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "can_self_deliver": true,
    "preferred_delivery_radius_km": 15,
    "notify_new_orders": true
  }'
```

#### 4. Get Available Agents
```bash
curl -X GET https://api.shegergebeya.com/api/v1/seller/delivery/available-agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Register Delivery
```bash
curl -X POST https://api.shegergebeya.com/api/v1/seller/orders/ORDER_ID/register-delivery \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_type": "self",
    "delivery_notes": "Handle with care"
  }'
```

---

## 📱 Step 4: Mobile App Integration

The mobile app components are already created but need to be deployed separately:

### Files Created:
- `mobile/services/sellerSettingsApi.ts`
- `mobile/services/sellerDeliveryApi.ts`
- `mobile/app/(seller)/delivery-settings.tsx`
- `mobile/app/screen/register-delivery.tsx`

### Deploy Mobile App:
```bash
# Navigate to mobile directory
cd /path/to/livestock/mobile

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build for production
npm run build

# Or for Expo
eas build --platform android
eas build --platform ios
```

---

## ✅ Step 5: Verification Checklist

### Backend Verification
- [ ] Database migration completed successfully
- [ ] `seller_settings` table created
- [ ] New columns added to `deliveries` table
- [ ] Backend server restarted without errors
- [ ] Health check endpoint responds
- [ ] All 11 new seller endpoints accessible

### API Endpoints Verification
- [ ] `GET /api/v1/seller/settings` - Returns settings
- [ ] `PUT /api/v1/seller/settings` - Updates settings
- [ ] `POST /api/v1/seller/settings/agents/preferred` - Adds preferred agent
- [ ] `DELETE /api/v1/seller/settings/agents/preferred/:id` - Removes agent
- [ ] `POST /api/v1/seller/settings/agents/blocked` - Blocks agent
- [ ] `GET /api/v1/seller/delivery/available-agents` - Lists agents
- [ ] `POST /api/v1/seller/orders/:id/register-delivery` - Registers delivery
- [ ] `GET /api/v1/seller/deliveries` - Lists deliveries
- [ ] `GET /api/v1/seller/deliveries/:id` - Gets delivery details
- [ ] `PUT /api/v1/seller/deliveries/:id/assign` - Updates assignment
- [ ] `PUT /api/v1/seller/deliveries/:id/cancel` - Cancels delivery

### Functional Testing
- [ ] Seller can login and access settings
- [ ] Settings can be updated and saved
- [ ] Available agents list loads
- [ ] Delivery can be registered for paid order
- [ ] Self-delivery option works
- [ ] Agent assignment works
- [ ] Delivery status updates correctly
- [ ] OTP/QR codes generated for verification

---

## 🐛 Troubleshooting

### Issue: Migration fails with foreign key error
**Solution**: Foreign key constraints have been removed from the migration. Relationships are handled at application level by Sequelize.

### Issue: Server won't start - "requireRole is not a function"
**Solution**: Already fixed in latest code. Ensure you have the updated `routes/sellerRoutes.js` file.

### Issue: "Too many keys specified" warning
**Solution**: This is a MySQL warning, not an error. The migration script is designed to work within MySQL limits.

### Issue: No agents available
**Solution**: Ensure you have users with role='Agent' in your database. Create test agents if needed.

### Issue: Cannot register delivery - "Order must be paid"
**Solution**: Only orders with status='Paid' or 'Approved' can have deliveries registered.

---

## 📊 Monitoring

### Key Metrics to Monitor
1. **Delivery Registration Rate**: Track how many sellers use the feature
2. **Self-Delivery vs Agent Assignment**: Monitor delivery type distribution
3. **Agent Performance**: Track delivery completion rates
4. **API Response Times**: Ensure endpoints respond within 2 seconds
5. **Error Rates**: Monitor failed delivery registrations

### Logging
All delivery operations are logged with:
- Seller ID and action
- Order ID and delivery type
- Agent assignments
- Status changes
- Timestamps

Check logs at: `/var/log/livestock-api/` or via PM2:
```bash
pm2 logs livestock-api
```

---

## 🔒 Security Notes

1. **Authentication Required**: All seller endpoints require valid JWT token
2. **Role-Based Access**: Only users with role='Seller' can access these endpoints
3. **Order Ownership**: Sellers can only manage deliveries for their own orders
4. **OTP Security**: OTPs are hashed before storage, never stored in plain text
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

---

## 📞 Support

If you encounter issues during deployment:

1. **Check server logs** for detailed error messages
2. **Verify database migration** completed successfully
3. **Test with curl** to isolate frontend vs backend issues
4. **Run test suite** to identify specific failing endpoints
5. **Review this guide** for common troubleshooting steps

---

## 🎉 Success Indicators

Deployment is successful when:
- ✅ All database tables created
- ✅ Backend server running without errors
- ✅ All 11 endpoints responding correctly
- ✅ Test suite passes all tests
- ✅ Sellers can access delivery settings
- ✅ Deliveries can be registered and managed

---

**Last Updated**: March 8, 2026  
**Version**: 1.0.0  
**System**: Advanced Seller Delivery Management
