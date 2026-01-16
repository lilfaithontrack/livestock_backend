<?php
/**
 * Telegram Bot Webhook Handler
 * Automatically captures user's Telegram ID when they start the bot
 * Deploy at: sms.shegergebeya.com/webhook.php
 * 
 * Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sms.shegergebeya.com/webhook.php
 */

// ============================================
// CONFIGURATION
// ============================================
define('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE');

// Database config (same as your backend)
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
// ============================================

// Get update from Telegram
$update = json_decode(file_get_contents('php://input'), true);

if (!$update) {
    exit('No update');
}

// Log for debugging
file_put_contents('webhook.log', date('Y-m-d H:i:s') . ' - ' . json_encode($update) . "\n", FILE_APPEND);

// Handle message
if (isset($update['message'])) {
    $message = $update['message'];
    $chatId = $message['chat']['id'];
    $text = isset($message['text']) ? $message['text'] : '';
    $userId = $message['from']['id'];
    $username = isset($message['from']['username']) ? $message['from']['username'] : null;
    $firstName = isset($message['from']['first_name']) ? $message['from']['first_name'] : 'User';

    // Handle /start with phone number parameter
    // Format: /start phone_251951521621
    if (preg_match('/^\/start\s+phone_(\d+)/', $text, $matches)) {
        $phone = '+' . $matches[1];
        linkPhone($phone, $userId, $chatId, $firstName);
    }
    // Handle /start command (welcome message)
    elseif (strpos($text, '/start') === 0) {
        sendMessage($chatId, 
            "👋 Welcome to *Ethio Livestock Bot*, {$firstName}!\n\n" .
            "🔐 To receive OTP codes via Telegram:\n\n" .
            "1️⃣ Go back to the app\n" .
            "2️⃣ Enter your phone number\n" .
            "3️⃣ The OTP will be sent here!\n\n" .
            "📱 Your Telegram ID: `{$userId}`\n\n" .
            "Or use: /link +251XXXXXXXXX"
        );
    }
    // Handle /link command
    elseif (preg_match('/^\/link\s+(\+?\d+)/', $text, $matches)) {
        $phone = $matches[1];
        if (!str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }
        linkPhone($phone, $userId, $chatId, $firstName);
    }
    // Unknown command
    else {
        sendMessage($chatId, 
            "📱 Use /link +251XXXXXXXXX to link your phone\n\n" .
            "Example: `/link +251951521621`"
        );
    }
}

/**
 * Link phone number to Telegram user ID
 */
function linkPhone($phone, $telegramId, $chatId, $firstName) {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // Check if user exists with this phone
        $stmt = $pdo->prepare("SELECT user_id, telegram_id FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Update telegram_id
            $updateStmt = $pdo->prepare("UPDATE users SET telegram_id = ? WHERE phone = ?");
            $updateStmt->execute([$telegramId, $phone]);

            sendMessage($chatId, 
                "✅ *Phone Linked Successfully!*\n\n" .
                "📱 Phone: `{$phone}`\n" .
                "💬 Telegram ID: `{$telegramId}`\n\n" .
                "You will now receive OTP codes here automatically! 🎉"
            );
        } else {
            // User doesn't exist yet - store for when they register
            sendMessage($chatId, 
                "ℹ️ Phone `{$phone}` not registered yet.\n\n" .
                "Please register in the app first, then come back and use:\n" .
                "`/link {$phone}`"
            );
        }
    } catch (PDOException $e) {
        error_log('DB Error: ' . $e->getMessage());
        sendMessage($chatId, "❌ Error linking phone. Please try again later.");
    }
}

/**
 * Send message via Telegram Bot API
 */
function sendMessage($chatId, $text) {
    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown'
        ]),
        CURLOPT_RETURNTRANSFER => true
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Helper for PHP < 8.0
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return strpos($haystack, $needle) === 0;
    }
}
