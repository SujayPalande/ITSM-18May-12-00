<?php
/**
 * Login Endpoint - Redirect to Auth API
 * IT Helpdesk Portal - PHP Backend
 */

// This file acts as a redirect for frontend compatibility
// Frontend expects /php/api/login but our auth is at /php/api/auth.php?action=login

// Get the request method and data
$method = $_SERVER['REQUEST_METHOD'];

// Handle both JSON and FormData requests
$request = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $request = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $request = $_POST ?? [];
}

// Set the action parameter
$_GET['action'] = 'login';

// Include the auth.php file
require_once 'auth.php';
?>