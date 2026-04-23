const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        // 1. Create order_groups table
        await queryInterface.createTable('order_groups', {
            group_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            buyer_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                }
            },
            total_amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            payment_status: {
                type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
                defaultValue: 'Pending'
            },
            payment_proof_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            shipping_address: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            shipping_full_name: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            shipping_phone: {
                type: DataTypes.STRING(20),
                allowNull: true
            },
            shipping_city: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            shipping_region: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            shipping_notes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            order_type: {
                type: DataTypes.ENUM('regular', 'qercha'),
                defaultValue: 'regular',
                allowNull: false
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        });

        // 2. Add group_id column to orders table
        await queryInterface.addColumn('orders', 'group_id', {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'order_groups',
                key: 'group_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // 3. Add seller_id column to orders table (convenience field)
        await queryInterface.addColumn('orders', 'seller_id', {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // 4. Add group_id column to payments table
        await queryInterface.addColumn('payments', 'group_id', {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'order_groups',
                key: 'group_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // 5. Add indexes
        await queryInterface.addIndex('orders', ['group_id'], { name: 'idx_orders_group_id' });
        await queryInterface.addIndex('orders', ['seller_id'], { name: 'idx_orders_seller_id' });
        await queryInterface.addIndex('payments', ['group_id'], { name: 'idx_payments_group_id' });
        await queryInterface.addIndex('order_groups', ['buyer_id'], { name: 'idx_order_groups_buyer_id' });
        await queryInterface.addIndex('order_groups', ['payment_status'], { name: 'idx_order_groups_payment_status' });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('order_groups', 'idx_order_groups_payment_status');
        await queryInterface.removeIndex('order_groups', 'idx_order_groups_buyer_id');
        await queryInterface.removeIndex('payments', 'idx_payments_group_id');
        await queryInterface.removeIndex('orders', 'idx_orders_seller_id');
        await queryInterface.removeIndex('orders', 'idx_orders_group_id');

        await queryInterface.removeColumn('payments', 'group_id');
        await queryInterface.removeColumn('orders', 'seller_id');
        await queryInterface.removeColumn('orders', 'group_id');
        await queryInterface.dropTable('order_groups');
    }
};
