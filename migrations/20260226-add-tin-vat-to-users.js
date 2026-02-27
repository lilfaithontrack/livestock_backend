'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('users', 'tin_vat_url', {
                type: Sequelize.STRING(500),
                allowNull: true,
                comment: 'URL to TIN or VAT certificate'
            });
            console.log('✓ Added tin_vat_url column to users');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME' || error.name === 'SequelizeDatabaseError') {
                console.log('⚠ Column tin_vat_url might already exist in users or another error occurred:', error.message);
            } else {
                throw error;
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'tin_vat_url');
    }
};
