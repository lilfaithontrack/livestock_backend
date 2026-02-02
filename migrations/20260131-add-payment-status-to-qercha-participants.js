'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('qercha_participants', 'payment_status', {
                type: Sequelize.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
                defaultValue: 'Pending',
                allowNull: false,
                after: 'amount_paid'
            });
            console.log('✓ Added payment_status column to qercha_participants');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠ Column payment_status already exists in qercha_participants');
            } else {
                throw error;
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('qercha_participants', 'payment_status');
        // Note: ENUM types might remain in some databases, but removing column is main thing
    }
};
