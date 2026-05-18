<?php
/**
 * Email Verification Endpoint
 */

require_once '../config/database.php';
require_once '../helpers/email_notifications.php';
require_once '../helpers/enhanced_email_helper.php';

// Enable CORS
header('Access-Control-Allow-Origin: https://itsm.cybaemtech.app');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Vary: Origin');

try {
    $db = getDb();
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['error' => 'Verification token is required']);
        exit;
    }
    
    // Find user with this token
    $user = $db->fetchOne(
        "SELECT * FROM users WHERE verification_token = ? AND is_verified = 0",
        [$token]
    );
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or expired verification token']);
        exit;
    }
    
    // Mark user as verified
    $db->update(
        'users',
        [
            'is_verified' => 1,
            'verification_token' => null
        ],
        'id = ?',
        [$user['id']]
    );
    
    // Send welcome email using enhanced system
    sendEnhancedWelcomeEmail($user['email'], $user['name'], $user['username']);
    
    // Redirect to login page with success message
    header('Location: https://itsm.cybaemtech.app/auth?verified=true');
    exit;
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>