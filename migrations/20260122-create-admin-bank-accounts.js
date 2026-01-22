'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('admin_bank_accounts', {
            account_id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
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
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            is_primary: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            instructions: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            logo_url: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            display_order: {
                type: Sequelize.INTEGER,
                defaultValue: 0
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

        await queryInterface.addIndex('admin_bank_accounts', ['is_active']);
        await queryInterface.addIndex('admin_bank_accounts', ['is_primary']);
        await queryInterface.addIndex('admin_bank_accounts', ['display_order']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('admin_bank_accounts');
    }
};
