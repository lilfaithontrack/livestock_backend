module.exports = {
    up: async (queryInterface, Sequelize) => {
        // --- Admin moderation columns (mirrors rentals: status/admin_approved_by/rejection_reason/approved_at) ---
        await queryInterface.addColumn('qercha_packages', 'moderation_status', {
            type: Sequelize.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
            comment: 'Admin moderation status, separate from the Active/Completed/Cancelled lifecycle status'
        });

        await queryInterface.addColumn('qercha_packages', 'admin_approved_by', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        });

        await queryInterface.addColumn('qercha_packages', 'rejection_reason', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('qercha_packages', 'approved_at', {
            type: Sequelize.DATE,
            allowNull: true
        });

        // --- Location / delivery info ---
        await queryInterface.addColumn('qercha_packages', 'location', {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Human-readable location where the animal/package can be viewed or picked up'
        });

        await queryInterface.addColumn('qercha_packages', 'delivery_info', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Free-text delivery / pickup instructions for buyers'
        });

        // --- Fractional shares (INTEGER -> DECIMAL(4,2)) ---
        await queryInterface.changeColumn('qercha_packages', 'total_shares', {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            comment: 'Total number of shares available (supports fractional shares e.g. 0.25, 0.5)'
        });

        await queryInterface.changeColumn('qercha_packages', 'shares_available', {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            comment: 'Remaining shares available for purchase (supports fractional shares)'
        });

        await queryInterface.changeColumn('qercha_participants', 'shares_purchased', {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 1,
            comment: 'Supports fractional shares (e.g. 0.25, 0.5)'
        });

        // Backfill existing rows as approved so nothing already live disappears from buyers
        await queryInterface.sequelize.query(
            "UPDATE qercha_packages SET moderation_status = 'approved', approved_at = NOW() WHERE status IN ('Active', 'Completed')"
        );

        await queryInterface.addIndex('qercha_packages', ['moderation_status'], {
            name: 'qercha_packages_moderation_status_idx'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('qercha_packages', 'qercha_packages_moderation_status_idx');

        await queryInterface.changeColumn('qercha_participants', 'shares_purchased', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
        });

        await queryInterface.changeColumn('qercha_packages', 'shares_available', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        await queryInterface.changeColumn('qercha_packages', 'total_shares', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        await queryInterface.removeColumn('qercha_packages', 'delivery_info');
        await queryInterface.removeColumn('qercha_packages', 'location');
        await queryInterface.removeColumn('qercha_packages', 'approved_at');
        await queryInterface.removeColumn('qercha_packages', 'rejection_reason');
        await queryInterface.removeColumn('qercha_packages', 'admin_approved_by');
        await queryInterface.removeColumn('qercha_packages', 'moderation_status');
    }
};
