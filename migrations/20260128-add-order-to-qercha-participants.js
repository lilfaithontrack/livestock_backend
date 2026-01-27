module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('qercha_participants', 'order_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'orders',
                key: 'order_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Order created when joining qercha package'
        });

        await queryInterface.addColumn('qercha_participants', 'payment_status', {
            type: Sequelize.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
            defaultValue: 'Pending',
            allowNull: false,
            comment: 'Payment status for this qercha participation'
        });

        // Add index for faster order lookups
        await queryInterface.addIndex('qercha_participants', ['order_id'], {
            name: 'qercha_participants_order_id_idx'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('qercha_participants', 'qercha_participants_order_id_idx');
        await queryInterface.removeColumn('qercha_participants', 'payment_status');
        await queryInterface.removeColumn('qercha_participants', 'order_id');
    }
};
