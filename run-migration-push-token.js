
const sequelize = require('./config/database');
const { Sequelize } = require('sequelize');

const migration = require('./migrations/20260131-add-push-token-to-users');

const runMigration = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await migration.up(sequelize.getQueryInterface(), Sequelize);

        console.log('Migration executed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database or run migration:', error);
        process.exit(1);
    }
};

runMigration();
