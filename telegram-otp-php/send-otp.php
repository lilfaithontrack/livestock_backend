<?php
/**
 * Telegram OTP Sender
 * Sends OTPs via Telegram Bot API - supports both direct messages and channel
 * Deploy at: sms.shegergebeya.com
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================
define('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE'); // Get from @BotFather
define('TELEGRAM_CHANNEL_ID', '@your_channel'); // Fallback channel (optional)
define('API_SECRET', 'your-secret-key-here'); // Secret key for API auth
// ============================================

/**
 * Send JSON response
 */
function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_PRETTY_PRINT);
    exit();
}

/**
 * Verify API secret
 */
function verifySecret() {
    if (isset($_GET['secret']) && $_GET['secret'] === API_SECRET) {
        return true;
    }
    
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader)) {
        $authHeader = isset($headers['authorization']) ? $headers['authorization'] : '';
    }
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        if ($matches[1] === API_SECRET) {
            return true;
        }
    }
    
    return false;
}

/**
 * Send message via Telegram Bot API
 */
function sendTelegramMessage($chatId, $message) {
    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    
    $postData = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'error' => 'cURL: ' . $curlError];
    }

    $result = json_decode($response, true);
    
    if ($httpCode === 200 && isset($result['ok']) && $result['ok']) {
        return ['success' => true, 'message_id' => $result['result']['message_id']];
    }

    return [
        'success' => false, 
        'error' => isset($result['description']) ? $result['description'] : 'Unknown error',
        'error_code' => isset($result['error_code']) ? $result['error_code'] : null
    ];
}

/**
 * Send OTP to a user directly (using their telegram_user_id)
 */
function sendOTPToUser($telegramUserId, $otp, $phone) {
    $message = "🔐 *OTP Verification*\n\n" .
               "Your code: *{$otp}*\n\n" .
               "📱 Phone: {$phone}\n" .
               "⏱ Expires in 10 minutes\n\n" .
               "⚠️ Don't share this code!";
    
    return sendTelegramMessage($telegramUserId, $message);
}

/**
 * Send OTP to channel (fallback - shows masked phone)
 */
function sendOTPToChannel($phone, $otp) {
    $maskedPhone = '***' . substr($phone, -4);
    
    $message = "🔐 *OTP Code*\n\n" .
               "📱 Phone: `{$maskedPhone}`\n" .
               "🔑 Code: *{$otp}*\n\n" .
               "⏱ Expires: 10 min";
    
    return sendTelegramMessage(TELEGRAM_CHANNEL_ID, $message);
}

// ============================================
// MAIN HANDLER
// ============================================

// Health check (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    sendResponse(true, 'Telegram OTP Service OK', [
        'version' => '2.0',
        'bot_configured' => TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE',
        'channel_configured' => TELEGRAM_CHANNEL_ID !== '@your_channel'
    ]);
}

// Send OTP (POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Use POST to send OTP');
}

// Auth check
if (!verifySecret()) {
    http_response_code(401);
    sendResponse(false, 'Unauthorized');
}

// Parse request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    sendResponse(false, 'Invalid JSON');
}

if (empty($data['otp'])) {
    sendResponse(false, 'OTP required');
}

if (empty($data['phone'])) {
    sendResponse(false, 'Phone required');
}

$otp = $data['otp'];
$phone = $data['phone'];
$telegramUserId = isset($data['telegram_user_id']) ? $data['telegram_user_id'] : null;

// Try to send to user directly if we have their ID
if ($telegramUserId) {
    $result = sendOTPToUser($telegramUserId, $otp, $phone);
    
    if ($result['success']) {
        sendResponse(true, 'OTP sent to user', [
            'method' => 'direct',
            'message_id' => $result['message_id']
        ]);
    }
    
    // If direct failed, log but continue to try channel
    error_log("Direct send failed for user {$telegramUserId}: " . $result['error']);
}

// Fallback to channel if configured
if (TELEGRAM_CHANNEL_ID !== '@your_channel') {
    $result = sendOTPToChannel($phone, $otp);
    
    if ($result['success']) {
        sendResponse(true, 'OTP sent to channel', [
            'method' => 'channel',
            'message_id' => $result['message_id']
        ]);
    }
    
    sendResponse(false, 'Channel send failed: ' . $result['error'], [
        'error_code' => $result['error_code'] ?? null
    ]);
}

// No valid method available
sendResponse(false, 'No telegram_user_id provided and no channel configured');
