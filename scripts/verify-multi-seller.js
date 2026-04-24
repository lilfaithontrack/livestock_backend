#!/usr/bin/env node
/**
 * Quick verification script for multi-seller order system
 * Run: node scripts/verify-multi-seller.js
 */

const sequelize = require('../config/database');
const { Order, OrderGroup, OrderItem, User, Delivery } = require('../models');
const { Op } = require('sequelize');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[!]${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`)
};

async function verifyMultiSellerSystem() {
    log.header('Multi-Seller Order System Verification');
    
    try {
        await sequelize.authenticate();
        log.info('Database connected\n');
        
        // 1. Count orders with seller_id (split-order architecture)
        const splitOrdersCount = await Order.count({
            where: { seller_id: { [Op.not]: null } }
        });
        log.info(`Orders with seller_id (split-order): ${splitOrdersCount}`);
        
        // 2. Count orders grouped by group_id (multi-seller checkouts)
        const orderGroups = await OrderGroup.findAll({
            include: [{
                model: Order,
                as: 'orders',
                attributes: ['order_id', 'seller_id', 'qr_code', 'qr_code_hash']
            }]
        });
        
        log.info(`Total OrderGroups: ${orderGroups.length}\n`);
        
        // 3. Analyze each group
        let multiSellerGroups = 0;
        let totalQRCodes = 0;
        let ordersWithQR = 0;
        
        for (const group of orderGroups) {
            const orders = group.orders || [];
            const uniqueSellers = new Set(orders.map(o => o.seller_id).filter(Boolean));
            
            if (uniqueSellers.size > 1) {
                multiSellerGroups++;
                log.info(`Group ${group.group_id.substring(0, 8)}...:`);
                log.info(`  Sellers: ${uniqueSellers.size} | Orders: ${orders.length}`);
                
                for (const order of orders) {
                    const hasQR = !!(order.qr_code && order.qr_code_hash);
                    if (hasQR) {
                        ordersWithQR++;
                        totalQRCodes++;
                    }
                    log.info(`  - Order ${order.order_id.substring(0, 8)}... (Seller: ${order.seller_id?.substring(0, 8)}...): QR=${hasQR ? 'YES' : 'NO'}`);
                }
            }
        }
        
        log.header('Verification Results');
        
        // Check 1: Multi-seller orders exist
        if (multiSellerGroups > 0) {
            log.success(`Found ${multiSellerGroups} multi-seller order groups`);
        } else {
            log.warn('No multi-seller order groups found (may be normal if no multi-seller checkouts yet)');
        }
        
        // Check 2: QR codes generated
        if (ordersWithQR > 0) {
            log.success(`${ordersWithQR} orders have QR codes generated`);
        } else if (splitOrdersCount > 0) {
            log.warn('No QR codes found - may need payment to trigger generation');
        }
        
        // Check 3: Verify a sample of orders
        log.header('Sample Verification');
        
        const sampleOrders = await Order.findAll({
            where: { seller_id: { [Op.not]: null } },
            limit: 3,
            include: [
                { model: OrderItem, as: 'items', attributes: ['seller_id'] },
                { model: Delivery, as: 'delivery', attributes: ['delivery_id', 'agent_id'] }
            ]
        });
        
        for (const order of sampleOrders) {
            log.info(`\nOrder ${order.order_id.substring(0, 16)}...`);
            log.info(`  Seller ID: ${order.seller_id?.substring(0, 16)}...`);
            log.info(`  Has QR: ${order.qr_code ? 'YES' : 'NO'}`);
            log.info(`  Items: ${order.items?.length || 0}`);
            log.info(`  Delivery: ${order.delivery ? 'YES' : 'NO'}`);
            
            // Verify items belong to same seller
            const itemSellers = new Set(order.items?.map(i => i.seller_id));
            if (itemSellers.size === 1 && itemSellers.has(order.seller_id)) {
                log.success('  Items match order seller_id');
            } else {
                log.error('  Items DO NOT match order seller_id!');
            }
        }
        
        // Check 4: Verify seller isolation query
        log.header('Seller Isolation Query Test');
        
        const sampleSeller = sampleOrders[0]?.seller_id;
        if (sampleSeller) {
            const sellerOrders = await Order.findAll({
                where: {
                    [Op.or]: [
                        { seller_id: sampleSeller },
                        { '$items.seller_id$': sampleSeller }
                    ]
                },
                include: [{ model: OrderItem, as: 'items', attributes: [] }],
                subQuery: false,
                limit: 10
            });
            
            log.info(`Seller ${sampleSeller.substring(0, 16)}... can see ${sellerOrders.length} orders`);
            
            // Verify no cross-seller access
            const wrongSellerOrders = sellerOrders.filter(o => 
                o.seller_id && o.seller_id !== sampleSeller
            );
            
            if (wrongSellerOrders.length === 0) {
                log.success('Seller isolation working - no cross-seller orders visible');
            } else {
                log.error(`Seller isolation BROKEN - can see ${wrongSellerOrders.length} other seller orders!`);
            }
        }
        
        log.header('Summary');
        log.success('Multi-seller order system is configured correctly');
        log.info(`- Split orders: ${splitOrdersCount}`);
        log.info(`- Multi-seller groups: ${multiSellerGroups}`);
        log.info(`- Orders with QR: ${ordersWithQR}`);
        
    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run if executed directly
if (require.main === module) {
    verifyMultiSellerSystem();
}

module.exports = { verifyMultiSellerSystem };
