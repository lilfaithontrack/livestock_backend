const db = require('./models');

async function debugSync() {
    try {
        console.log('Authenticating...');
        await db.sequelize.authenticate();

        console.log('Syncing models with verbose logging...');
        db.sequelize.options.logging = console.log;

        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        if (db.SellerBankAccount) await db.SellerBankAccount.sync({ force: true });
        if (db.SellerPayout) await db.SellerPayout.sync({ force: true });
        if (db.SellerEarnings) await db.SellerEarnings.sync({ force: true });

        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('All missing tables synced successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing tables:', err);
        process.exit(1);
    }
}

debugSync();
