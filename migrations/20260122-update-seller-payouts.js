'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add new columns to seller_payouts table
        await queryInterface.addColumn('seller_payouts', 'bank_name', {
            type: Sequelize.STRING(100),
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'account_name', {
            type: Sequelize.STRING(200),
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'account_number', {
            type: Sequelize.STRING(50),
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'request_date', {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });

        await queryInterface.addColumn('seller_payouts', 'processed_date', {
            type: Sequelize.DATE,
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'processed_by', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('seller_payouts', 'payment_proof_url', {
            type: Sequelize.STRING(500),
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'transaction_reference', {
            type: Sequelize.STRING(100),
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'rejection_reason', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('seller_payouts', 'notes', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        // Update status enum to include new values
        await queryInterface.changeColumn('seller_payouts', 'status', {
            type: Sequelize.ENUM('Pending', 'Approved', 'Processing', 'Completed', 'Rejected', 'Processed', 'Failed'),
            defaultValue: 'Pending'
        });

        // Add indexes
        await queryInterface.addIndex('seller_payouts', ['status']);
        await queryInterface.addIndex('seller_payouts', ['request_date']);
        await queryInterface.addIndex('seller_payouts', ['processed_by']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('seller_payouts', 'bank_name');
        await queryInterface.removeColumn('seller_payouts', 'account_name');
        await queryInterface.removeColumn('seller_payouts', 'account_number');
        await queryInterface.removeColumn('seller_payouts', 'request_date');
        await queryInterface.removeColumn('seller_payouts', 'processed_date');
        await queryInterface.removeColumn('seller_payouts', 'processed_by');
        await queryInterface.removeColumn('seller_payouts', 'payment_proof_url');
        await queryInterface.removeColumn('seller_payouts', 'transaction_reference');
        await queryInterface.removeColumn('seller_payouts', 'rejection_reason');
        await queryInterface.removeColumn('seller_payouts', 'notes');

        await queryInterface.changeColumn('seller_payouts', 'status', {
            type: Sequelize.ENUM('Pending', 'Processed', 'Failed'),
            defaultValue: 'Pending'
        });
    }
};
