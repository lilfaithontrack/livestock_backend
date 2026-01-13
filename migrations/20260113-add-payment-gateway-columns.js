'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add new columns to payments table for Chapa/Telebirr integration

        // Add payment_method column
        await queryInterface.addColumn('payments', 'payment_method', {
            type: Sequelize.ENUM('chapa', 'telebirr', 'screenshot', 'cash'),
            allowNull: false,
            defaultValue: 'screenshot',
            after: 'gateway_used'
        });

        // Add status column
        await queryInterface.addColumn('payments', 'status', {
            type: Sequelize.ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'),
            defaultValue: 'pending',
            after: 'payment_method'
        });

        // Add currency column
        await queryInterface.addColumn('payments', 'currency', {
            type: Sequelize.STRING(10),
            defaultValue: 'ETB',
            after: 'amount'
        });

        // Add phone_number column
        await queryInterface.addColumn('payments', 'phone_number', {
            type: Sequelize.STRING(20),
            allowNull: true,
            after: 'currency'
        });

        // Add email column
        await queryInterface.addColumn('payments', 'email', {
            type: Sequelize.STRING(255),
            allowNull: true,
            after: 'phone_number'
        });

        // Add checkout_url column
        await queryInterface.addColumn('payments', 'checkout_url', {
            type: Sequelize.STRING(500),
            allowNull: true,
            after: 'email'
        });

        // Add gateway_reference column
        await queryInterface.addColumn('payments', 'gateway_reference', {
            type: Sequelize.STRING,
            allowNull: true,
            after: 'checkout_url'
        });

        // Add verified_at column
        await queryInterface.addColumn('payments', 'verified_at', {
            type: Sequelize.DATE,
            allowNull: true,
            after: 'gateway_reference'
        });

        // Add metadata column
        await queryInterface.addColumn('payments', 'metadata', {
            type: Sequelize.JSON,
            allowNull: true,
            after: 'verified_at'
        });

        // Add notes column
        await queryInterface.addColumn('payments', 'notes', {
            type: Sequelize.TEXT,
            allowNull: true,
            after: 'commission_rate'
        });

        // Make order_id nullable (for standalone payments)
        await queryInterface.changeColumn('payments', 'order_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'orders',
                key: 'order_id'
            }
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove added columns
        await queryInterface.removeColumn('payments', 'payment_method');
        await queryInterface.removeColumn('payments', 'status');
        await queryInterface.removeColumn('payments', 'currency');
        await queryInterface.removeColumn('payments', 'phone_number');
        await queryInterface.removeColumn('payments', 'email');
        await queryInterface.removeColumn('payments', 'checkout_url');
        await queryInterface.removeColumn('payments', 'gateway_reference');
        await queryInterface.removeColumn('payments', 'verified_at');
        await queryInterface.removeColumn('payments', 'metadata');
        await queryInterface.removeColumn('payments', 'notes');

        // Revert order_id to required
        await queryInterface.changeColumn('payments', 'order_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'order_id'
            }
        });
    }
};
