<?php
/**
 * Authentication Helper Functions
 * IT Helpdesk Portal - PHP Backend
 */

// Ensure session is initialized correctly
require_once dirname(__DIR__) . '/config/session.php';
if (function_exists('initializeSession')) {
    initializeSession();
}

/**
 * Check if user is authenticated
 */
function requireAuth() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
        // Log the authentication failure
        error_log("Authentication failed - Session data: " . print_r($_SESSION, true));
        
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Authentication required. Please log in.',
            'code' => 'AUTH_REQUIRED'
        ]);
        exit;
    }
    
    return [
        'user_id' => $_SESSION['user_id'],
        'user_role' => $_SESSION['user_role']
    ];
}

/**
 * Check if user has admin privileges
 */
function requireAdmin() {
    $auth = requireAuth();
    
    if ($auth['user_role'] !== 'admin') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Admin privileges required',
            'code' => 'ADMIN_REQUIRED'
        ]);
        exit;
    }
    
    return $auth;
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    
    return [
        'user_id' => $_SESSION['user_id'],
        'user_role' => $_SESSION['user_role']
    ];
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['user_role']);
}

/**
 * Check if user has at least one of the required roles
 * Supports comma-separated roles in DB logic
 */
function userHasRole($currentUserRole, $allowedRole) {
    if (!$currentUserRole) return false;
    $roles = array_map('trim', explode(',', $currentUserRole));
    
    if (is_array($allowedRole)) {
        return !empty(array_intersect($roles, $allowedRole));
    }
    return in_array($allowedRole, $roles);
}

/**
 * Require at least one of the specified roles
 */
function requireRole($allowedRoles) {
    $auth = requireAuth();
    
    if (!userHasRole($auth['user_role'], $allowedRoles)) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized. You do not have permission to perform this action.',
            'code' => 'PERMISSION_DENIED'
        ]);
        exit;
    }
    
    return $auth;
}

/**
 * --- FIX: Remove duplicate jsonResponse and sanitizeInput (handled in database.php) ---
 * Standard JSON response helper
 */
function jsonResponse($data, $httpCode = 200) {
    header('Content-Type: application/json');
    http_response_code($httpCode);
    echo json_encode($data);
    exit;
}

/**
 * Sanitize input data
 */
function sanitizeInput($input) {
    if (is_string($input)) {
        return trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8'));
    }
    return $input;
}
// --- END FIX ---
?>