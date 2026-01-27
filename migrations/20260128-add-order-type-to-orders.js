module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('orders', 'order_type', {
            type: Sequelize.ENUM('regular', 'qercha'),
            defaultValue: 'regular',
            allowNull: false,
            comment: 'Type of order - regular product purchase or qercha share purchase'
        });

        // Add index for faster filtering
        await queryInterface.addIndex('orders', ['order_type'], {
            name: 'orders_order_type_idx'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('orders', 'orders_order_type_idx');
        await queryInterface.removeColumn('orders', 'order_type');
        // Note: Dropping ENUM type might need manual cleanup in some databases
    }
};
