const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QerchaParticipant = sequelize.define('qercha_participants', {
    participant_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    package_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'qercha_packages',
            key: 'package_id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    shares_purchased: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    is_host: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'orders',
            key: 'order_id'
        },
        comment: 'Order created when joining qercha package'
    },
    payment_status: {
        type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
        defaultValue: 'Pending',
        allowNull: false,
        comment: 'Payment status for this qercha participation'
    }
});

module.exports = QerchaParticipant;
