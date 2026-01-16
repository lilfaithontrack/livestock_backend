/**
 * Script to link a phone number to a Telegram user ID
 * Run: node scripts/link-telegram.js +251951521621 YOUR_TELEGRAM_ID
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'ethio_livestock_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    }
);

const TelegramMapping = sequelize.define('TelegramMapping', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    telegram_user_id: { type: DataTypes.BIGINT, allowNull: false },
    telegram_username: { type: DataTypes.STRING(255), allowNull: true },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_otp_sent_at: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'TelegramMappings',
    timestamps: true
});

async function linkPhone(phone, telegramId) {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        // Normalize phone
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Create or update mapping
        const [mapping, created] = await TelegramMapping.findOrCreate({
            where: { phone: normalizedPhone },
            defaults: { telegram_user_id: telegramId }
        });

        if (!created) {
            await mapping.update({ telegram_user_id: telegramId });
            console.log(`Updated: ${normalizedPhone} -> ${telegramId}`);
        } else {
            console.log(`Created: ${normalizedPhone} -> ${telegramId}`);
        }

        console.log('✓ Phone linked successfully!');
        console.log('Now OTPs will be sent directly to this Telegram account.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

// Get arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node scripts/link-telegram.js <phone> <telegram_id>');
    console.log('Example: node scripts/link-telegram.js +251951521621 123456789');
    console.log('\nTo get your Telegram ID, message @userinfobot on Telegram');
    process.exit(1);
}

linkPhone(args[0], args[1]);
