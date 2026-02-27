const db = require('./models');
const migration = require('./migrations/20260226-add-tin-vat-to-users');

(async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB');
        const queryInterface = db.sequelize.getQueryInterface();
        const Sequelize = require('sequelize');
        await migration.up(queryInterface, Sequelize);
        console.log('Migration successful');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed', err);
        process.exit(1);
    }
})();
