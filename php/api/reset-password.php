<?php
/**
 * Reset Password Endpoint
 * Routes to the forgot-password handler with reset action
 */
$_SERVER['REQUEST_URI'] = '/api/reset-password'; // Signal reset action
require_once __DIR__ . '/forgot-password.php';
?>
