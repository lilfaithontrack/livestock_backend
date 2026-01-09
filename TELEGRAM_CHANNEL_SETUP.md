# Telegram Channel Setup for Automatic OTP Delivery

This guide explains how to set up a public Telegram channel for automatic OTP delivery, so users receive OTPs even if they haven't started the bot.

## Why Use a Channel?

Telegram Bot API doesn't allow sending messages to users by phone number directly. However, we can:
1. Post OTPs to a public Telegram channel
2. Users join the channel to receive OTPs automatically
3. No manual linking required!

## Setup Steps

### 1. Create a Telegram Channel

1. Open Telegram
2. Click "New Channel" (or use menu)
3. Name it (e.g., "Livestock Platform OTP")
4. Make it **Public** (important!)
5. Create a username (e.g., `@livestock_otp`)
6. Add your bot as an **Administrator** with permission to post messages

### 2. Get Channel ID

**Method 1: Using Bot**
1. Add your bot to the channel as admin
2. Send a message in the channel
3. Forward that message to [@userinfobot](https://t.me/userinfobot)
4. It will show the channel ID (looks like `-1001234567890`)

**Method 2: Using API**
```bash
# Get updates from your bot
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
# Look for "chat" with "type": "channel" and note the "id"
```

**Method 3: Using Web**
1. Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
2. Look for channel ID in the response

### 3. Configure Environment Variable

Add to your `.env` file:

```env
# Telegram OTP Channel (for automatic OTP delivery)
TELEGRAM_OTP_CHANNEL_ID=-1001234567890  # Your channel ID here
```

### 4. Restart Server

```bash
npm start
# or
npm run dev
```

## How It Works

1. **User enters phone number** in your app
2. **System generates OTP**
3. **OTP is posted to the public channel** with last 4 digits of phone
4. **User joins channel** and sees their OTP
5. **User enters OTP** in your app

## Channel Message Format

The bot will post messages like:
```
🔐 OTP for phone ending in 1621

Code: 751675

⚠️ This code expires in 10 minutes.
```

## Security Considerations

1. **Privacy**: Only last 4 digits are shown (users can identify their OTP)
2. **Expiration**: OTPs expire in 10 minutes
3. **Public Channel**: Anyone can join and see OTPs (acceptable for OTP use case)
4. **Alternative**: For better security, use private groups with phone verification

## User Instructions

Tell your users:
1. Join our Telegram channel: `@livestock_otp` (or your channel username)
2. When you request OTP, check the channel for your code
3. The code shows last 4 digits of your phone number

## Testing

1. Set `TELEGRAM_OTP_CHANNEL_ID` in `.env`
2. Run test script: `npm run test:otp`
3. Check the Telegram channel for the OTP message
4. Verify the OTP works

## Fallback Methods

The system tries multiple methods in order:
1. **Existing mapping** (if user linked before) - Direct message
2. **Public channel** (automatic) - Channel post
3. **Development mode** - Returns OTP in API response

## Troubleshooting

**Channel ID not working:**
- Make sure bot is admin of the channel
- Verify channel ID is correct (starts with `-100`)
- Check bot has permission to post messages

**OTP not appearing in channel:**
- Check bot is admin
- Verify `TELEGRAM_OTP_CHANNEL_ID` is set correctly
- Check server logs for errors

**Users can't find their OTP:**
- Make sure channel is public
- Share channel username/link with users
- Consider showing full phone number (less secure but easier)

