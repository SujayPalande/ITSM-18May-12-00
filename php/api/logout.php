<?php
/**
 * Logout Endpoint - Redirect to Auth API
 * IT Helpdesk Portal - PHP Backend
 */

// This file acts as a redirect for frontend compatibility
// Frontend expects /php/api/logout but our auth is at /php/api/auth.php?action=logout

// Get the request method and data
$method = $_SERVER['REQUEST_METHOD'];

// Set the action parameter
$_GET['action'] = 'logout';

// Include the auth.php file
require_once 'auth.php';
?>