<?php
/**
 * Telegram OTP Sender - Direct Messages Only
 * Sends OTPs directly to users who have started the bot
 * Deploy at: sms.shegergebeya.com
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================
define('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE'); // Get from @BotFather
define('API_SECRET', 'your-secret-key-here');
// ============================================

function sendResponse($success, $message, $data = null) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

function verifySecret() {
    if (isset($_GET['secret']) && $_GET['secret'] === API_SECRET) return true;
    
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.*)$/i', $auth, $m) && $m[1] === API_SECRET) {
        return true;
    }
    return false;
}

function sendOTP($telegramUserId, $otp, $phone) {
    $message = "🔐 *OTP Verification*\n\n" .
               "Your code: *{$otp}*\n\n" .
               "📱 Phone: {$phone}\n" .
               "⏱ Expires in 10 minutes\n\n" .
               "⚠️ Don't share this code!";

    $ch = curl_init("https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'chat_id' => $telegramUserId,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['success' => false, 'error' => $error];
    }

    $result = json_decode($response, true);
    
    if (isset($result['ok']) && $result['ok']) {
        return ['success' => true, 'message_id' => $result['result']['message_id']];
    }

    return ['success' => false, 'error' => $result['description'] ?? 'Unknown error'];
}

// Health check
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    sendResponse(true, 'OTP Service OK', ['bot_configured' => TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Use POST');
}

if (!verifySecret()) {
    http_response_code(401);
    sendResponse(false, 'Unauthorized');
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['otp']) || empty($data['phone']) || empty($data['telegram_user_id'])) {
    sendResponse(false, 'Missing: otp, phone, and telegram_user_id required');
}

$result = sendOTP($data['telegram_user_id'], $data['otp'], $data['phone']);

if ($result['success']) {
    sendResponse(true, 'OTP sent', ['message_id' => $result['message_id']]);
} else {
    sendResponse(false, 'Failed: ' . $result['error']);
}
