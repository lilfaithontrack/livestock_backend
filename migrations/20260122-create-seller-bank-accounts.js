'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('seller_bank_accounts', {
            account_id: {
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
            bank_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            account_name: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            account_number: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            account_type: {
                type: Sequelize.ENUM('bank', 'mobile_money'),
                defaultValue: 'bank'
            },
            is_primary: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            is_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
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

        await queryInterface.addIndex('seller_bank_accounts', ['seller_id']);
        await queryInterface.addIndex('seller_bank_accounts', ['is_primary']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('seller_bank_accounts');
    }
};
