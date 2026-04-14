require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database and models
const db = require('./models');

// Import routes
const apiRoutes = require('./routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import Telegram bot handlers
const { setupBotHandlers } = require('./services/telegramBotHandlers');

// Initialize Express app
const app = express();

// Readiness gate: block requests until DB is ready
let appReady = false;
app.use((req, res, next) => {
    if (appReady || req.path === '/' || req.path === '/health') return next();
    res.status(503).json({ success: false, message: 'Server is starting up, please retry in a moment' });
});

// Middleware
const allowedProductionOrigins = [
      'https://shegergebeya.com',
    'https://admin.shegergebeya.com','http://localhost:5173','http://localhost:8082'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Allow any localhost / 127.0.0.1 origin in development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // Allow specific production origins
        if (allowedProductionOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (v1)
app.use('/api/v1', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Ethio Livestock Development Platform API',
        version: '1.0.0',
        endpoints: {
            health: '/api/v1/health',
            auth: '/api/v1/auth',
            products: '/api/v1/products',
            categories: '/api/v1/categories',
            orders: '/api/v1/orders',
            admin: '/api/v1/admin'
        }
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;

// Check if running on cPanel/LiteSpeed (lsnode.js sets this)
const isLiteSpeed = typeof process.env.LSWS_CHILDREN !== 'undefined' ||
    process.argv.some(arg => arg.includes('lsnode'));

// Database connection and server initialization
const initializeApp = async () => {
    try {
        // Test database connection
        await db.sequelize.authenticate();
        console.log('✓ Database connection established successfully');

        // Sync models with database
        // Using alter: false to avoid "too many keys" MySQL errors
        try {
            await db.sequelize.sync({ alter: false });
            console.log('✓ Database models synchronized');
        } catch (syncError) {
            console.warn('⚠ Database sync warning:', syncError.message);
            console.warn('   Tables may need manual migration if schema changed.');
        }

        // Auto-migrate: add missing columns safely
        try {
            // --- qercha_packages ---
            const [qCols] = await db.sequelize.query('SHOW COLUMNS FROM qercha_packages');
            const qExisting = qCols.map(c => c.Field);
            if (!qExisting.includes('category')) {
                await db.sequelize.query("ALTER TABLE qercha_packages ADD COLUMN category VARCHAR(100) NULL");
                console.log('✓ Migration: added category to qercha_packages');
            }
            if (!qExisting.includes('start_date')) {
                await db.sequelize.query("ALTER TABLE qercha_packages ADD COLUMN start_date DATETIME NULL");
                console.log('✓ Migration: added start_date to qercha_packages');
            }
            if (!qExisting.includes('expiry_date')) {
                await db.sequelize.query("ALTER TABLE qercha_packages ADD COLUMN expiry_date DATETIME NULL");
                console.log('✓ Migration: added expiry_date to qercha_packages');
            }

            // --- products: livestock-specific columns ---
            const [pCols] = await db.sequelize.query('SHOW COLUMNS FROM products');
            const pExisting = pCols.map(c => c.Field);
            const productMigrations = [
                { col: 'breed', sql: "VARCHAR(100) NULL" },
                { col: 'age_months', sql: "INT NULL" },
                { col: 'date_of_birth', sql: "DATE NULL" },
                { col: 'gender', sql: "VARCHAR(20) NULL" },
                { col: 'weight_kg', sql: "DECIMAL(10,2) NULL" },
                { col: 'height_cm', sql: "DECIMAL(10,2) NULL" },
                { col: 'color_markings', sql: "VARCHAR(255) NULL" },
                { col: 'mother_id', sql: "CHAR(36) NULL" },
                { col: 'father_id', sql: "CHAR(36) NULL" },
                { col: 'health_status', sql: "VARCHAR(50) NULL DEFAULT 'unknown'" },
                { col: 'vaccination_records', sql: "JSON NULL" },
                { col: 'medical_history', sql: "TEXT NULL" },
                { col: 'veterinary_certificates', sql: "JSON NULL" },
                { col: 'last_health_checkup', sql: "DATE NULL" },
                { col: 'genetic_traits', sql: "TEXT NULL" },
                { col: 'milk_production_liters_per_day', sql: "DECIMAL(10,2) NULL" },
                { col: 'breeding_history', sql: "TEXT NULL" },
                { col: 'offspring_count', sql: "INT NULL DEFAULT 0" },
            ];
            for (const m of productMigrations) {
                if (!pExisting.includes(m.col)) {
                    await db.sequelize.query(`ALTER TABLE products ADD COLUMN ${m.col} ${m.sql}`);
                    console.log(`✓ Migration: added ${m.col} to products`);
                }
            }
            // --- users: agent-specific columns ---
            const [uCols] = await db.sequelize.query('SHOW COLUMNS FROM users');
            const uExisting = uCols.map(c => c.Field);
            const userAgentMigrations = [
                { col: 'agent_total_deliveries', sql: "INT DEFAULT 0" },
                { col: 'agent_rating', sql: "DECIMAL(3,2) DEFAULT 5.00" },
                { col: 'agent_rating_count', sql: "INT DEFAULT 0" },
                { col: 'agent_bank_name', sql: "VARCHAR(100) NULL" },
                { col: 'agent_account_name', sql: "VARCHAR(200) NULL" },
                { col: 'agent_account_number', sql: "VARCHAR(50) NULL" },
            ];
            for (const m of userAgentMigrations) {
                if (!uExisting.includes(m.col)) {
                    await db.sequelize.query(`ALTER TABLE users ADD COLUMN ${m.col} ${m.sql}`);
                    console.log(`✓ Migration: added ${m.col} to users`);
                }
            }

            // --- orders: delivery fee columns ---
            const [oCols] = await db.sequelize.query('SHOW COLUMNS FROM orders');
            const oExisting = oCols.map(c => c.Field);
            const orderDeliveryMigrations = [
                { col: 'delivery_fee', sql: "DECIMAL(10,2) DEFAULT 0" },
                { col: 'delivery_distance_km', sql: "DECIMAL(10,2) NULL" },
            ];
            for (const m of orderDeliveryMigrations) {
                if (!oExisting.includes(m.col)) {
                    await db.sequelize.query(`ALTER TABLE orders ADD COLUMN ${m.col} ${m.sql}`);
                    console.log(`✓ Migration: added ${m.col} to orders`);
                }
            }
        } catch (migrationErr) {
            console.warn('⚠ Auto-migration warning:', migrationErr.message);
        }

        // Setup Telegram bot handlers after DB sync
        setupBotHandlers();

        appReady = true;
        console.log('✓ Application initialized successfully');
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

        // Schedule: make pending earnings available every hour
        const earningsController = require('./controllers/earningsController');
        setInterval(async () => {
            try {
                const count = await earningsController.makeEarningsAvailable();
                if (count > 0) console.log(`✓ Earnings scheduler: ${count} earnings made available`);
            } catch (err) {
                console.error('Earnings scheduler error:', err.message);
            }
        }, 60 * 60 * 1000); // Every 1 hour
        // Also run once on startup
        earningsController.makeEarningsAvailable().catch(() => {});

    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        // Don't exit on cPanel - let the request fail gracefully
        if (!isLiteSpeed) {
            process.exit(1);
        }
    }
};

// Initialize the application
initializeApp();

// Only call app.listen() if NOT running on cPanel/LiteSpeed
// LiteSpeed handles the server binding via lsnode.js
if (!isLiteSpeed) {
    app.listen(PORT, () => {
        console.log('═══════════════════════════════════════════');
        console.log(`✓ Ethio Livestock API Server Running`);
        console.log(`✓ Port: ${PORT}`);
        console.log(`✓ API Base URL: http://localhost:${PORT}/api/v1`);
        console.log('═══════════════════════════════════════════');
    });
} else {
    console.log('✓ Running on LiteSpeed/cPanel - server binding handled by lsnode.js');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Don't exit on cPanel
    if (!isLiteSpeed) {
        process.exit(1);
    }
});

// Export app for LiteSpeed and testing
module.exports = app;

