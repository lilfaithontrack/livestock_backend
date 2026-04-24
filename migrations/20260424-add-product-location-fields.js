module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = [
            {
                name: 'region',
                options: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'Ethiopia Region/City Administration (e.g., Addis Ababa, Oromia, Amhara)',
                    after: 'location'
                }
            },
            {
                name: 'city',
                options: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'City or main administrative area',
                    after: 'region'
                }
            },
            {
                name: 'subcity',
                options: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'Subcity/Kifle Ketema (for Addis Ababa) or Zone/Administrative area',
                    after: 'city'
                }
            },
            {
                name: 'woreda_kebele',
                options: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'Woreda district or Kebele for precise location',
                    after: 'subcity'
                }
            }
        ];

        for (const column of columns) {
            const tableInfo = await queryInterface.describeTable('products');
            if (!tableInfo[column.name]) {
                await queryInterface.addColumn('products', column.name, column.options);
                console.log(`Added column: ${column.name}`);
            } else {
                console.log(`Column ${column.name} already exists, skipping`);
            }
        }

        // Add indexes for location queries
        await queryInterface.addIndex('products', ['region'], {
            name: 'idx_products_region'
        });
        await queryInterface.addIndex('products', ['city'], {
            name: 'idx_products_city'
        });
        await queryInterface.addIndex('products', ['subcity'], {
            name: 'idx_products_subcity'
        });
        await queryInterface.addIndex('products', ['region', 'city', 'subcity'], {
            name: 'idx_products_location'
        });

        console.log('Successfully added location fields to products table');
    },

    down: async (queryInterface, Sequelize) => {
        const columns = ['region', 'city', 'subcity', 'woreda_kebele'];

        // Remove indexes first
        try {
            await queryInterface.removeIndex('products', 'idx_products_region');
            await queryInterface.removeIndex('products', 'idx_products_city');
            await queryInterface.removeIndex('products', 'idx_products_subcity');
            await queryInterface.removeIndex('products', 'idx_products_location');
        } catch (e) {
            console.log('Indexes may not exist, continuing...');
        }

        for (const column of columns) {
            const tableInfo = await queryInterface.describeTable('products');
            if (tableInfo[column]) {
                await queryInterface.removeColumn('products', column);
                console.log(`Removed column: ${column}`);
            }
        }

        console.log('Successfully removed location fields from products table');
    }
};
