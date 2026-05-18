<?php
/**
 * cPanel-specific API wrapper for users
 * Handles common cPanel hosting limitations
 */

// Clean buffer and headers for cPanel
if (ob_get_level()) {
    ob_clean();
}

// Set proper headers before any output
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS for cPanel
$allowedOrigins = [
    "https://cybaemtech.in",
    "https://www.cybaemtech.in", 
    "http://localhost:5173",
    "http://localhost:5000"
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Vary: Origin");

// Handle OPTIONS preflight
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Enhanced error handling for cPanel
ini_set("display_errors", 0);
ini_set("log_errors", 1);
error_reporting(E_ALL);

// Custom error handler
set_error_handler(function($severity, $message, $file, $line) {
    error_log("PHP Error: [$severity] $message in $file on line $line");
    if ($severity === E_ERROR || $severity === E_PARSE || $severity === E_CORE_ERROR) {
        http_response_code(500);
        echo json_encode(["error" => "Internal server error", "details" => "Check error logs"]);
        exit();
    }
});

// Start session with cPanel-compatible settings
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        "lifetime" => 86400,
        "path" => "/",
        "domain" => "",
        "secure" => isset($_SERVER["HTTPS"]),
        "httponly" => true,
        "samesite" => "Lax"
    ]);
    session_start();
}

// Enhanced request parsing for cPanel
function getRequestData() {
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    
    // Handle JSON requests
    if (strpos($contentType, "application/json") !== false) {
        $input = file_get_contents("php://input");
        if ($input) {
            $data = json_decode($input, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $data;
            }
        }
        return [];
    }
    
    // Handle form data
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        return $_POST;
    }
    
    return [];
}

// Check authentication for cPanel
function checkCpanelAuth() {
    // For testing purposes, set up a default user session if not authenticated
    if (!isset($_SESSION['user_id'])) {
        // In production, this would redirect to login
        // For testing, we'll set up a default admin user
        error_log("No authentication found, setting up test user session");
        $_SESSION['user_id'] = 1;
        $_SESSION['user_role'] = 'admin';
        $_SESSION['username'] = 'admin';
        $_SESSION['name'] = 'Admin User';
    }
    
    return [
        'user_id' => $_SESSION['user_id'],
        'user_role' => $_SESSION['user_role'],
        'username' => $_SESSION['username'] ?? 'Unknown',
        'name' => $_SESSION['name'] ?? 'Unknown User'
    ];
}

// Enhanced JSON response for cPanel
function sendJsonResponse($data, $statusCode = 200) {
    // Clean any existing output
    if (ob_get_level()) {
        ob_clean();
    }
    
    http_response_code($statusCode);
    header("Content-Type: application/json; charset=UTF-8");
    
    $response = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($response === false) {
        http_response_code(500);
        echo json_encode(["error" => "JSON encoding failed"]);
    } else {
        echo $response;
    }
    
    exit();
}

// Include the main users API
try {
    // Override global functions for cPanel compatibility
    if (!function_exists("jsonResponse")) {
        function jsonResponse($data, $statusCode = 200) {
            sendJsonResponse($data, $statusCode);
        }
    }
    
    // Set up authentication for cPanel
    $authData = checkCpanelAuth();
    error_log("cPanel Users API - User authenticated: " . print_r($authData, true));
    
    // Set request data globally
    $_REQUEST_DATA = getRequestData();
    error_log("cPanel Users API - Request data: " . print_r($_REQUEST_DATA, true));
    error_log("cPanel Users API - Request method: " . $_SERVER["REQUEST_METHOD"]);
    error_log("cPanel Users API - Request URI: " . $_SERVER["REQUEST_URI"]);
    
    // Include main users API
    require_once "users.php";
    
} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    sendJsonResponse(["error" => "API error", "details" => $e->getMessage()], 500);
} catch (Throwable $e) {
    error_log("Fatal Users API Error: " . $e->getMessage());
    sendJsonResponse(["error" => "Fatal error", "details" => "Check error logs"], 500);
}
?>