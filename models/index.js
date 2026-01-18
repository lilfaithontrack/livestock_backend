const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const ProductType = require('./ProductType');
const ProductCategory = require('./ProductCategory');
const ProductSubcategory = require('./ProductSubcategory');
const Product = require('./Product');
const Currency = require('./Currency');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Delivery = require('./Delivery');
const QerchaPackage = require('./QerchaPackage');
const QerchaParticipant = require('./QerchaParticipant');
const Subscription = require('./Subscription');
const SellerPayout = require('./SellerPayout');
const SellerPlan = require('./SellerPlan');
const Advertisement = require('./Advertisement');
const Butcher = require('./Butcher');
const StockMovement = require('./StockMovement');
const TelegramMapping = require('./TelegramMapping');

// Define Associations

// User Associations
User.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
User.hasMany(Order, { foreignKey: 'buyer_id', as: 'orders' });
User.hasMany(Delivery, { foreignKey: 'agent_id', as: 'deliveries' });
User.hasMany(Subscription, { foreignKey: 'seller_id', as: 'subscriptions' });
User.hasMany(SellerPayout, { foreignKey: 'seller_id', as: 'payouts' });
User.hasMany(SellerPlan, { foreignKey: 'seller_id', as: 'seller_plans' });
User.belongsTo(SellerPlan, { foreignKey: 'current_plan_id', as: 'current_plan' });
User.hasMany(QerchaPackage, { foreignKey: 'host_user_id', as: 'hosted_packages' });

// ProductType Associations
ProductType.hasMany(ProductCategory, { foreignKey: 'product_type_id', as: 'categories' });

// ProductCategory Associations
ProductCategory.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'productType' });
ProductCategory.hasMany(ProductSubcategory, { foreignKey: 'cat_id', as: 'subcategories' });

// ProductSubcategory Associations
ProductSubcategory.belongsTo(ProductCategory, { foreignKey: 'cat_id', as: 'category' });
ProductSubcategory.hasMany(Product, { foreignKey: 'sub_cat_id', as: 'products' });

// Currency Associations
Currency.hasMany(Product, { foreignKey: 'currency_id', as: 'products' });

// Product Associations
Product.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
Product.belongsTo(ProductSubcategory, { foreignKey: 'sub_cat_id', as: 'subcategory' });
Product.belongsTo(Currency, { foreignKey: 'currency_id', as: 'currency_info' });
Product.belongsTo(User, { foreignKey: 'admin_approved_by', as: 'approver' });
Product.belongsTo(Product, { foreignKey: 'mother_id', as: 'mother' });
Product.belongsTo(Product, { foreignKey: 'father_id', as: 'father' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
Product.hasMany(QerchaPackage, { foreignKey: 'ox_product_id', as: 'qercha_packages' });
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'stockMovements' });

// Order Associations
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment' });
Order.hasOne(Delivery, { foreignKey: 'order_id', as: 'delivery' });

// OrderItem Associations
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Payment Associations
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Payment.belongsTo(SellerPayout, { foreignKey: 'seller_payout_id', as: 'seller_payout' });

// Delivery Associations
Delivery.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Delivery.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });
Delivery.belongsTo(User, { foreignKey: 'admin_assigned_by', as: 'admin' });

// QerchaPackage Associations
QerchaPackage.belongsTo(Product, { foreignKey: 'ox_product_id', as: 'product' });
QerchaPackage.belongsTo(User, { foreignKey: 'host_user_id', as: 'host' });
QerchaPackage.hasMany(QerchaParticipant, { foreignKey: 'package_id', as: 'participants' });

// QerchaParticipant Associations
QerchaParticipant.belongsTo(QerchaPackage, { foreignKey: 'package_id', as: 'package' });
QerchaParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Subscription Associations
Subscription.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// SellerPayout Associations
SellerPayout.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
SellerPayout.hasMany(Payment, { foreignKey: 'seller_payout_id', as: 'payments' });

// SellerPlan Associations
SellerPlan.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
SellerPlan.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// StockMovement Associations
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockMovement.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

// Export all models and sequelize instance
const db = {
    sequelize,
    User,
    ProductType,
    ProductCategory,
    ProductSubcategory,
    Product,
    Currency,
    Order,
    OrderItem,
    Payment,
    Delivery,
    QerchaPackage,
    QerchaParticipant,
    Subscription,
    SellerPayout,
    SellerPlan,
    Advertisement,
    Butcher,
    StockMovement,
    TelegramMapping
};

module.exports = db;
