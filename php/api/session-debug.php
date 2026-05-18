<?php
/**
 * Session Debug API
 * Helps debug session issues in production
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://cybaemtech.in');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include shared session configuration
require_once __DIR__ . '/../config/session.php';
initializeSession();

$debug_info = [
    'session_id' => session_id(),
    'session_status' => session_status(),
    'session_data' => $_SESSION ?? [],
    'cookies' => $_COOKIE ?? [],
    'server_info' => [
        'https' => $_SERVER['HTTPS'] ?? 'not set',
        'server_port' => $_SERVER['SERVER_PORT'] ?? 'not set',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'not set',
        'http_host' => $_SERVER['HTTP_HOST'] ?? 'not set'
    ],
    'php_session_settings' => [
        'session.cookie_httponly' => ini_get('session.cookie_httponly'),
        'session.cookie_secure' => ini_get('session.cookie_secure'),
        'session.cookie_samesite' => ini_get('session.cookie_samesite'),
        'session.use_strict_mode' => ini_get('session.use_strict_mode'),
        'session.save_path' => ini_get('session.save_path'),
        'session.name' => ini_get('session.name')
    ]
];

echo json_encode($debug_info, JSON_PRETTY_PRINT);
?>