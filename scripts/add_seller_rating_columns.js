const { sequelize } = require('../models');

async function run() {
    try {
        await sequelize.query(`
            ALTER TABLE users
            ADD COLUMN seller_rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
            ADD COLUMN seller_rating_count INT NOT NULL DEFAULT 0
        `);
        console.log('✅  Added seller_rating_avg and seller_rating_count to users table');
    } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  Columns already exist — nothing to do');
        } else {
            console.error('❌  Migration failed:', err.message);
            process.exit(1);
        }
    } finally {
        await sequelize.close();
    }
}

run();
