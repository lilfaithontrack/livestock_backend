'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('seller_earnings', {
            earning_id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            seller_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            order_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'orders',
                    key: 'order_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            order_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            commission_rate: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false
            },
            commission_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            net_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('pending', 'available', 'withdrawn', 'on_hold'),
                defaultValue: 'pending'
            },
            available_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            payout_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'seller_payouts',
                    key: 'payout_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('seller_earnings', ['seller_id']);
        await queryInterface.addIndex('seller_earnings', ['order_id']);
        await queryInterface.addIndex('seller_earnings', ['status']);
        await queryInterface.addIndex('seller_earnings', ['available_date']);
        await queryInterface.addIndex('seller_earnings', ['payout_id']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('seller_earnings');
    }
};
