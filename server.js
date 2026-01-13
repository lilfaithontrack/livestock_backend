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
    origin: ['http://localhost:5173', 'http://localhost:8081', 'http://admin.shegergebeya.com', 'https://admin.shegergebeya.com'],
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

// Database connection and server start
const startServer = async () => {
    try {
        // Test database connection
        await db.sequelize.authenticate();
        console.log('✓ Database connection established successfully');

        // Sync models with database
        // In production, use migrations instead of sync
        // Using alter: false to avoid "too many keys" MySQL errors
        // If schema changes are needed, use migrations instead
        try {
            await db.sequelize.sync({ alter: false });
            console.log('✓ Database models synchronized (no alter - tables preserved)');

            // Setup Telegram bot handlers after DB sync
            setupBotHandlers();
        } catch (syncError) {
            // If sync fails due to too many keys or other issues, try without alter
            if (syncError.message && syncError.message.includes('Too many keys')) {
                console.warn('⚠ Database sync warning: Too many keys detected. Using safe sync mode.');
                try {
                    await db.sequelize.sync({ alter: false });
                    console.log('✓ Database models synchronized (safe mode)');
                } catch (safeSyncError) {
                    console.warn('⚠ Could not sync database schema. Tables may need manual migration.');
                    console.warn('   Error:', safeSyncError.message);
                }
            } else {
                // For other sync errors, log but continue
                console.warn('⚠ Database sync warning:', syncError.message);
                console.warn('   Server will continue, but schema may need manual updates.');
            }
        }

        // Start server
        app.listen(PORT, () => {
            console.log('═══════════════════════════════════════════');
            console.log(`✓ Ethio Livestock API Server Running`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Port: ${PORT}`);
            console.log(`✓ API Base URL: http://localhost:${PORT}/api/v1`);
            console.log('═══════════════════════════════════════════');
        });
    } catch (error) {
        console.error('✗ Unable to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
