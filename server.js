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

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8081', 'http://admin.shegergebeya.com', 'https://admin.shegergebeya.com'],
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

        // Setup Telegram bot handlers after DB sync
        setupBotHandlers();

        console.log('✓ Application initialized successfully');
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

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

