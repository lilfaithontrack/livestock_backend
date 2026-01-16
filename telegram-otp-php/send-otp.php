<?php
/**
 * Telegram OTP Sender
 * This PHP script sends OTPs via Telegram Bot API
 * Deploy at: sms.shegergebeya.com
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration - Change this to your actual bot token
define('TELEGRAM_BOT_TOKEN', getenv('TELEGRAM_BOT_TOKEN') ?: 'YOUR_BOT_TOKEN_HERE');
define('API_SECRET', getenv('SMS_API_SECRET') ?: 'your-secret-key-here');

/**
 * Send response
 */
function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

/**
 * Verify API secret
 */
function verifySecret() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($authHeader)) {
        $authHeader = isset($headers['authorization']) ? $headers['authorization'] : '';
    }
    
    // Extract Bearer token
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        if ($token === API_SECRET) {
            return true;
        }
    }
    
    return false;
}

/**
 * Send OTP via Telegram
 */
function sendTelegramOTP($telegramUserId, $otp, $phone) {
    $message = "🔐 *OTP Verification*\n\n" .
               "Your verification code is: *{$otp}*\n\n" .
               "Phone: {$phone}\n" .
               "This code will expire in 10 minutes.\n\n" .
               "⚠️ Do not share this code with anyone.";

    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    
    $data = [
        'chat_id' => $telegramUserId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['success' => false, 'error' => $error];
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
 * Send OTP to channel (fallback method)
 */
function sendChannelOTP($phone, $otp, $channelId) {
    $last4Digits = substr($phone, -4);
    $message = "🔐 *OTP for phone ending in *{$last4Digits}*\n\n" .
               "Code: *{$otp}*\n\n" .
               "⚠️ This code expires in 10 minutes.";

    $url = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    
    $data = [
        'chat_id' => $channelId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);
    
    return $httpCode === 200 && isset($result['ok']) && $result['ok'];
}

// Main handler
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed. Use POST.');
}

// Verify API secret
if (!verifySecret()) {
    http_response_code(401);
    sendResponse(false, 'Unauthorized. Invalid API secret.');
}

// Get request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    sendResponse(false, 'Invalid JSON body');
}

// Validate required fields
if (empty($data['otp'])) {
    sendResponse(false, 'OTP is required');
}

if (empty($data['telegram_user_id']) && empty($data['channel_id'])) {
    sendResponse(false, 'Either telegram_user_id or channel_id is required');
}

$otp = $data['otp'];
$phone = isset($data['phone']) ? $data['phone'] : 'Unknown';
$telegramUserId = isset($data['telegram_user_id']) ? $data['telegram_user_id'] : null;
$channelId = isset($data['channel_id']) ? $data['channel_id'] : null;

// Try sending to user first, then fallback to channel
if ($telegramUserId) {
    $result = sendTelegramOTP($telegramUserId, $otp, $phone);
    
    if ($result['success']) {
        sendResponse(true, 'OTP sent successfully via Telegram', [
            'method' => 'direct_message',
            'message_id' => $result['message_id']
        ]);
    } else {
        // If direct message fails and we have a channel, try channel
        if ($channelId) {
            $channelResult = sendChannelOTP($phone, $otp, $channelId);
            if ($channelResult) {
                sendResponse(true, 'OTP sent via channel (direct message failed)', [
                    'method' => 'channel',
                    'direct_error' => $result['error']
                ]);
            }
        }
        
        sendResponse(false, 'Failed to send OTP: ' . $result['error'], [
            'error_code' => isset($result['error_code']) ? $result['error_code'] : null
        ]);
    }
} else if ($channelId) {
    $result = sendChannelOTP($phone, $otp, $channelId);
    if ($result) {
        sendResponse(true, 'OTP sent via channel', ['method' => 'channel']);
    } else {
        sendResponse(false, 'Failed to send OTP to channel');
    }
}

sendResponse(false, 'No valid recipient specified');
