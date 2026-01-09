# Test Scripts

## Automatic Telegram Linking & OTP Test (Recommended)

Tests the complete automatic linking flow with deep links.

### Usage

```bash
npm run test:autolink
```

### What it tests

1. **Step 1: Request OTP** - Gets OTP and deep link for automatic linking
2. **Step 2: Deep Link** - Shows the Telegram deep link for auto-linking
3. **Step 3: Verify OTP** - Verifies the OTP and authenticates user
4. **Step 4: Test Auth** - Tests authenticated endpoints
5. **Step 5: Second Request** - Tests that future OTPs are sent automatically

### Features

- Shows Telegram deep link for automatic linking
- Tests both linked and unlinked scenarios
- Verifies automatic OTP delivery after linking
- Color-coded output for easy reading

---

## OTP Registration Test

Tests the complete OTP-based registration flow for new users.

### Prerequisites

1. **Server must be running:**
   ```bash
   npm start
   # or
   npm run dev
   ```

2. **Phone number must be linked to Telegram bot:**
   - Start your Telegram bot: `/start`
   - Link your phone: `/link +251951521621`
   - Wait for confirmation message

3. **Environment variables:**
   - Make sure `.env` has `TELEGRAM_BOT_TOKEN` set
   - API should be accessible at `http://localhost:5000`

### Usage

```bash
# Run the test script
npm run test:otp

# Or directly
node scripts/test-otp-registration.js
```

### What it tests

1. **Step 1: Request OTP**
   - Sends POST to `/api/v1/auth/login/phone`
   - Phone: `+251951521621`
   - Expects: OTP sent via Telegram or returned in response (development mode)

2. **Step 2: Verify OTP**
   - Sends POST to `/api/v1/auth/verify-otp`
   - Verifies the OTP code
   - Creates user account if new
   - Returns JWT token

3. **Step 3: Test Authentication**
   - Uses JWT token to access authenticated endpoint
   - Verifies token works correctly

### Expected Output

```
═══════════════════════════════════════════
  OTP Registration Test Script
═══════════════════════════════════════════

Testing phone: +251951521621
API Base URL: http://localhost:5000/api/v1

[STEP 1] Requesting OTP for phone number...
✓ OTP request successful!
ℹ Message: OTP sent to your Telegram
✓ OTP received: 123456

[STEP 2] Verifying OTP...
ℹ Using OTP: 123456
✓ OTP verification successful!
✓ User authenticated!

User Details:
  User ID: abc-123-def-456
  Role: Buyer
  Phone: +251951521621
  Is New User: Yes

[STEP 3] Testing authenticated endpoint...
✓ Authenticated endpoint access successful!

═══════════════════════════════════════════
  ✓ Registration Test Completed Successfully!
═══════════════════════════════════════════
```

### Troubleshooting

**Error: "Your phone number is not linked to our Telegram bot"**
- Solution: Link your phone first using `/link +251951521621` in Telegram

**Error: "OTP not found or expired"**
- Solution: Request a new OTP (OTPs expire in 10 minutes)

**Error: "Connection refused"**
- Solution: Make sure the server is running on port 5000

**OTP not received in Telegram**
- Check that bot token is correct
- Verify phone number is linked correctly
- Check server logs for errors
- In development mode, check console for OTP

### Customization

To test with a different phone number, edit `scripts/test-otp-registration.js`:

```javascript
const TEST_PHONE = '+251951521621'; // Change this
```

Or set environment variable:
```bash
TEST_PHONE=+251912345678 npm run test:otp
```

