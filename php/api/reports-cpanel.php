<?php
/**
 * Reports API cPanel Wrapper  
 * IT Helpdesk Portal - Production cPanel Compatibility
 */

// Include the actual reports API
session_start();

// Enhanced CORS for multiple domains
$allowedOrigins = [
    'https://cybaemtech.in',
    'https://www.cybaemtech.in',
    'https://cybaemtech.in/itsm_app',
    'http://localhost:5173',
    'http://localhost:5000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Fallback for cPanel deployment
    header('Access-Control-Allow-Origin: https://cybaemtech.in');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Vary: Origin');
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Enhanced session handling for cPanel
if (!isset($_SESSION)) {
    session_start();
}

// Parse request data for different formats
$requestData = [];

// Handle JSON requests
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $jsonInput = file_get_contents('php://input');
    if (!empty($jsonInput)) {
        $requestData = json_decode($jsonInput, true) ?? [];
    }
}

// Handle form data
if (!empty($_POST)) {
    $requestData = array_merge($requestData, $_POST);
}

// Handle GET parameters
if (!empty($_GET)) {
    $requestData = array_merge($requestData, $_GET);
}

// Set global request data for the API
$_REQUEST_DATA = $requestData;

// Enhanced error handling
try {
    // Authentication fallback for cPanel
    if (!isset($_SESSION['user_id']) && isset($_REQUEST['auth_token'])) {
        // Handle token-based authentication if needed
        error_log("cPanel auth fallback attempted");
    }
    
    // Include the actual reports API
    require_once __DIR__ . '/reports.php';
    
} catch (Exception $e) {
    error_log("cPanel Reports Wrapper Error: " . $e->getMessage());
    
    // Return structured error response
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Server error occurred',
        'message' => 'Please try again later',
        'timestamp' => date('c')
    ]);
    exit();
}

// Add utility functions if needed
function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Authentication required']);
        exit();
    }
}

function requireRole($allowedRoles) {
    requireAuth();
    
    if (!in_array($_SESSION['user_role'], $allowedRoles)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Insufficient permissions']);
        exit();
    }
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}
?>