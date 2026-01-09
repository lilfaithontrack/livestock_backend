# Telegram Bot Setup for OTP Authentication

This guide explains how to set up the Telegram bot for OTP-based authentication.

## Overview

Instead of using a paid SMS gateway, users receive OTP codes via a Telegram bot. This is a cost-effective solution for authentication.

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to:
   - Choose a name for your bot (e.g., "Livestock Platform Bot")
   - Choose a username (e.g., "livestock_platform_bot")
4. BotFather will give you a **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Save this token - you'll need it for the next step

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_USE_WEBHOOK=false  # Set to true for production with webhook
TELEGRAM_WEBHOOK_URL=https://yourdomain.com  # Only needed if using webhook
```

### 3. Start the Server

The bot will automatically initialize when you start the server:

```bash
npm start
# or
npm run dev
```

You should see:
```
✓ Telegram bot initialized
✓ Telegram bot handlers setup complete
```

## How It Works

### User Flow

1. **User links phone number to Telegram:**
   - User starts your bot on Telegram: `/start`
   - User sends: `/link +251912345678` (their phone number)
   - Bot confirms the link

2. **User requests OTP (Login/Registration):**
   - User enters phone number in the app
   - System generates OTP and sends it via Telegram bot
   - User receives OTP in Telegram

3. **User verifies OTP:**
   - User enters OTP in the app
   - System verifies and logs them in (or creates account if new)

### API Endpoints

#### Request OTP (Login/Registration)
```
POST /api/v1/auth/login/phone
Body: { "phone": "+251912345678" }
```

#### Verify OTP
```
POST /api/v1/auth/verify-otp
Body: { "phone": "+251912345678", "otp": "123456" }
```

## Bot Commands

Users can interact with the bot using these commands:

- `/start` - Welcome message and instructions
- `/link <phone_number>` - Link phone number to Telegram account
  - Example: `/link +251912345678`

## Database

The system uses a `telegram_mappings` table to store:
- Phone number
- Telegram user ID
- Telegram username
- Verification status
- Last OTP sent timestamp

## Troubleshooting

### Bot not responding
- Check that `TELEGRAM_BOT_TOKEN` is set correctly
- Verify the token is valid by testing with BotFather
- Check server logs for errors

### OTP not received
- User must link phone number first using `/link` command
- Check that user hasn't blocked the bot
- Verify phone number format matches (should include country code)

### User not found error
- The system now auto-creates users on OTP verification
- If user doesn't exist, they'll be created as a "Buyer" role

## Production Considerations

1. **Webhook vs Polling:**
   - Development: Use polling (default)
   - Production: Use webhook for better performance
   - Set `TELEGRAM_USE_WEBHOOK=true` and configure `TELEGRAM_WEBHOOK_URL`

2. **Security:**
   - Keep bot token secret
   - Use HTTPS for webhook URLs
   - Consider rate limiting for OTP requests

3. **Scalability:**
   - Consider using Redis for OTP storage instead of in-memory Map
   - Implement OTP request rate limiting
   - Monitor bot API rate limits

## Testing

1. Start the bot: `/start` in Telegram
2. Link your phone: `/link +251912345678`
3. Test OTP flow via API or frontend
4. Check Telegram for OTP code

## Support

If you encounter issues:
1. Check server logs
2. Verify bot token is correct
3. Ensure database is synced (telegram_mappings table exists)
4. Test bot commands directly in Telegram

