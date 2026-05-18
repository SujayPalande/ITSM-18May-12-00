<?php
/**
 * Shared Session Configuration
 * Ensures consistent session handling across all API endpoints
 */

function initializeSession() {
    // Only configure if session hasn't been started yet
    if (session_status() === PHP_SESSION_NONE) {
        // Configure session settings for production
        ini_set('session.cookie_httponly', 1);
        
        // Detect HTTPS
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
                   || $_SERVER['SERVER_PORT'] == 443
                   || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        
        if ($isHttps) {
            ini_set('session.cookie_secure', 1);
            ini_set('session.cookie_samesite', 'None');
        } else {
            ini_set('session.cookie_samesite', 'Lax');
        }
        
        ini_set('session.use_strict_mode', 1);
        ini_set('session.cookie_lifetime', 0); // Session cookies
        ini_set('session.name', 'ITSM_SESSION'); // Consistent session name
        
        session_start();
    }
}
?>