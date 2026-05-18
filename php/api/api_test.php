<?php
/**
 * ITSM API Endpoint Tester
 * This script tests all API endpoints to ensure they're accessible
 */

// Set headers for JSON response
header('Content-Type: application/json');

// Enable CORS for frontend
$allowedOrigins = ['https://cybaemtech.in', 'https://www.cybaemtech.in', 'http://localhost:5173'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Define the base directory and API paths
$baseDir = dirname(__DIR__);
$apiDir = __DIR__;

// Find all PHP API files
$apiFiles = glob($apiDir . '/*.php');
$endpoints = [];

// Test each endpoint
foreach ($apiFiles as $apiFile) {
    $filename = basename($apiFile);
    // Skip this test script and setup script
    if ($filename === 'api_test.php' || $filename === 'test.php' || $filename === 'setup.php') {
        continue;
    }
    
    $endpoint = '/' . $filename;
    $fullUrl = 'https://' . $_SERVER['HTTP_HOST'] . '/itsm_php/api' . $endpoint;
    
    $endpoints[] = [
        'name' => $filename,
        'endpoint' => $endpoint,
        'url' => $fullUrl,
        'exists' => file_exists($apiFile),
        'readable' => is_readable($apiFile),
        'size_bytes' => filesize($apiFile),
    ];
}

// Check if important endpoints exist
$requiredEndpoints = ['auth.php', 'tickets.php', 'categories.php', 'users.php'];
$missingEndpoints = [];

foreach ($requiredEndpoints as $required) {
    $found = false;
    foreach ($endpoints as $endpoint) {
        if ($endpoint['name'] === $required) {
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $missingEndpoints[] = $required;
    }
}

// Get server information
$serverInfo = [
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
    'script_path' => __FILE__,
    'php_api_directory' => $apiDir,
    'http_host' => $_SERVER['HTTP_HOST'] ?? 'Unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown',
];

// Format response
$response = [
    'status' => empty($missingEndpoints) ? 'success' : 'warning',
    'message' => empty($missingEndpoints) 
        ? 'All required API endpoints found' 
        : 'Some required endpoints are missing',
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => $serverInfo,
    'endpoints' => $endpoints,
    'missing_endpoints' => $missingEndpoints,
];

// Output the JSON response
echo json_encode($response, JSON_PRETTY_PRINT);
?>
