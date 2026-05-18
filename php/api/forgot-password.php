<?php
/**
 * Forgot Password & Reset Password API
 * IT Helpdesk Portal - PHP Backend
 */

ob_start();

// Database config
$configPath = dirname(__DIR__) . '/config/database.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;

// Session config
$sessionPath = dirname(__DIR__) . '/config/session.php';
if (!file_exists($sessionPath)) {
    $sessionPath = __DIR__ . '/../config/session.php';
}
require_once $sessionPath;

// CORS headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

// Parse JSON body
$request = json_decode(file_get_contents('php://input'), true) ?? [];

$db = getDb();

// Determine action from URL or param
$requestUri = $_SERVER['REQUEST_URI'] ?? '';

if (strpos($requestUri, 'reset-password') !== false) {
    handleResetPassword($db, $request);
} else {
    handleForgotPassword($db, $request);
}

function handleForgotPassword($db, $request) {
    $email = trim($request['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['message' => 'A valid email address is required']);
        exit;
    }

    // Find user by email (case-insensitive)
    $user = $db->fetchOne(
        "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)",
        [$email]
    );

    // Always return success to prevent email enumeration
    $successMsg = 'If an account with that email exists, a password reset link has been sent.';

    if (!$user) {
        echo json_encode(['message' => $successMsg]);
        exit;
    }

    // Generate secure token and store it
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Check if reset_tokens table exists, create it if not
    try {
        $db->fetchOne("SELECT 1 FROM password_reset_tokens LIMIT 1");
    } catch (Exception $e) {
        $db->query("CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_user_id (user_id)
        )");
    }

    // Delete any existing tokens for this user
    try {
        $db->query("DELETE FROM password_reset_tokens WHERE user_id = ?", [$user['id']]);
    } catch (Exception $e) {
        error_log("Could not delete old tokens: " . $e->getMessage());
    }

    // Insert new token
    $db->insert('password_reset_tokens', [
        'user_id' => $user['id'],
        'token' => $token,
        'expires_at' => $expiresAt
    ]);

    // Build reset URL  
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $resetUrl = "{$protocol}://{$host}/auth?reset={$token}";

    // Send email
    try {
        require_once dirname(__DIR__) . '/lib/mailer.php';

        $subject = "ITSM Portal - Password Reset Request";
        $body = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #4a5568; font-size: 16px;">Hello <strong>' . htmlspecialchars($user['name']) . '</strong>,</p>
                <p style="color: #4a5568;">We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="' . $resetUrl . '" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #718096; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
                <p style="color: #718096; font-size: 14px;">If you didn\'t request this, please ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #a0aec0; font-size: 12px; text-align: center;">ITSM Support System &copy; ' . date('Y') . '</p>
            </div>
        </div>';

        $mailResult = send_mail(
            $user['email'],
            $user['name'],
            $subject,
            $body,
            ['from' => 'support@cybaemtech.com', 'fromName' => 'ITSM Portal']
        );

        if (empty($mailResult['success'])) {
            error_log("Forgot password email failed: " . json_encode($mailResult));
        } else {
            error_log("Password reset email sent to: " . $user['email']);
        }
    } catch (Exception $e) {
        error_log("Failed to send reset email: " . $e->getMessage());
    }

    echo json_encode(['message' => $successMsg]);
}

function handleResetPassword($db, $request) {
    $token = trim($request['token'] ?? '');
    $newPassword = $request['newPassword'] ?? '';

    if (empty($token) || empty($newPassword)) {
        http_response_code(400);
        echo json_encode(['message' => 'Token and new password are required']);
        exit;
    }

    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode(['message' => 'Password must be at least 6 characters']);
        exit;
    }

    // Find valid token
    try {
        $tokenRecord = $db->fetchOne(
            "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()",
            [$token]
        );
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid or expired reset token']);
        exit;
    }

    if (!$tokenRecord) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid or expired reset token. Please request a new one.']);
        exit;
    }

    // Update password
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);
    $db->update('users', 
        ['password' => $hashedPassword],
        'id = ?',
        [$tokenRecord['user_id']]
    );

    // Mark token as used
    try {
        $db->update('password_reset_tokens',
            ['used' => 1],
            'id = ?',
            [$tokenRecord['id']]
        );
    } catch (Exception $e) {
        error_log("Could not mark token as used: " . $e->getMessage());
    }

    error_log("Password reset successful for user ID: " . $tokenRecord['user_id']);
    echo json_encode(['message' => 'Password has been reset successfully. You can now log in with your new password.']);
}

ob_end_flush();
?>
