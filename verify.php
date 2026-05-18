<?php
/**
 * Email Verification Page
 * IT Helpdesk Portal - PHP Backend
 */

require_once __DIR__ . '/php/config/database.php';

function displayMessage($title, $message, $type = 'error', $showLoginButton = false) {
    $color = $type === 'success' ? '#22c55e' : '#ef4444';
    $html = "
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>ITSM Portal - Email Verification</title>
        <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' rel='stylesheet'>
        <style>
            body {
                font-family: 'Inter', system-ui, sans-serif;
                background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%);
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                max-width: 480px;
                width: 90%;
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px #c7d2fe;
                padding: 40px;
                text-align: center;
                margin: 20px;
            }
            .icon {
                font-size: 48px;
                margin-bottom: 24px;
            }
            h2 {
                color: {$color};
                margin-bottom: 16px;
                font-weight: 600;
            }
            p {
                color: #334155;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 24px;
            }
            .button {
                display: inline-block;
                background: #2563eb;
                color: white;
                text-decoration: none;
                padding: 12px 28px;
                border-radius: 8px;
                font-weight: 500;
                font-size: 16px;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
            }
            .button:hover {
                background: #1d4ed8;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='icon'>" . 
            ($type === 'success' ? '✅' : '❌') . 
            "</div>
            <h2>{$title}</h2>
            <p>{$message}</p>
            " . ($showLoginButton ? "
            <a href='https://cybaemtech.in/itsm_app/auth' class='button'>Go to Login</a>
            " : "") . "
        </div>
    </body>
    </html>";
    echo $html;
}

try {
    // Get and validate token
    $token = $_GET['token'] ?? '';
    if (empty($token)) {
        displayMessage(
            'Invalid Request',
            'The verification link appears to be invalid. Please check your email and try again.'
        );
        exit;
    }

    // Connect to database
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get user by verification token
    $stmt = $pdo->prepare("
        SELECT id, username, name, email, is_verified, verification_token 
        FROM users 
        WHERE verification_token = :token
    ");
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        displayMessage(
            'Invalid Link',
            'This verification link is invalid or has expired. Please request a new verification link.'
        );
        exit;
    }

    if ($user['is_verified']) {
        displayMessage(
            'Already Verified',
            'Your email has already been verified. You can now log in to your account.',
            'success',
            true
        );
        exit;
    }

    // Update user verification status
    $stmt = $pdo->prepare("
        UPDATE users 
        SET is_verified = 1, 
            verification_token = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $stmt->execute(['id' => $user['id']]);

    // Show success message
    displayMessage(
        'Email Verified!',
        'Your email has been successfully verified. You can now log in to your account.',
        'success',
        true
    );

} catch (Exception $e) {
    error_log("Verify error: " . $e->getMessage());
    displayMessage(
        'Verification Failed',
        'An error occurred during verification. Please try again later or contact support.'
    );
}
// Note: No redirect here — browser shows the HTML message above and uses the 'Go to Login' button
?>