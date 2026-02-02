'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('users', 'push_token', {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Expo push token for notifications'
            });
            console.log('✓ Added push_token column to users');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠ Column push_token already exists in users');
            } else {
                throw error;
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'push_token');
    }
};
