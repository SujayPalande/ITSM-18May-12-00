<?php
/**
 * Database Migration Script
 * Add email verification fields to existing users table
 * Run this script once to upgrade existing database
 */

// Get the correct path to database config
$configPath = __DIR__ . '/config/database.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;

echo "<h2>Database Migration: Adding Email Verification Fields</h2>";

try {
    $db = getDb();
    
    // Check if verification fields already exist
    $columns = $db->fetchAll("SHOW COLUMNS FROM users");
    $hasVerificationToken = false;
    $hasIsVerified = false;
    
    foreach ($columns as $column) {
        if ($column['Field'] === 'verification_token') {
            $hasVerificationToken = true;
        }
        if ($column['Field'] === 'is_verified') {
            $hasIsVerified = true;
        }
    }
    
    echo "<p>Checking existing table structure...</p>";
    
    // Add verification_token field if missing
    if (!$hasVerificationToken) {
        echo "<p>Adding verification_token field...</p>";
        $db->query("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) NULL AFTER designation");
        $db->query("ALTER TABLE users ADD INDEX idx_users_verification_token (verification_token)");
        echo "<p style='color: green;'>✓ verification_token field added successfully</p>";
    } else {
        echo "<p style='color: blue;'>ℹ verification_token field already exists</p>";
    }
    
    // Add is_verified field if missing
    if (!$hasIsVerified) {
        echo "<p>Adding is_verified field...</p>";
        $db->query("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER verification_token");
        echo "<p style='color: green;'>✓ is_verified field added successfully</p>";
        
        // Set existing users as verified (to avoid login issues)
        echo "<p>Marking existing users as verified...</p>";
        $db->query("UPDATE users SET is_verified = 1 WHERE is_verified IS NULL OR is_verified = 0");
        echo "<p style='color: green;'>✓ Existing users marked as verified</p>";
    } else {
        echo "<p style='color: blue;'>ℹ is_verified field already exists</p>";
    }
    
    echo "<h3 style='color: green;'>Migration completed successfully!</h3>";
    echo "<p>Your database now supports email verification for new registrations.</p>";
    echo "<p><strong>Next steps:</strong></p>";
    echo "<ul>";
    echo "<li>All existing users can continue logging in normally</li>";
    echo "<li>New users will need to verify their email before logging in</li>";
    echo "<li>You can now use the registration feature with email verification</li>";
    echo "</ul>";
    
} catch (Exception $e) {
    echo "<h3 style='color: red;'>Migration failed!</h3>";
    echo "<p style='color: red;'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Please run this script again or contact support.</p>";
    error_log("Database migration error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Database Migration</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h2 { color: #2563eb; }
        p { margin: 10px 0; }
        ul { margin-left: 20px; }
    </style>
</head>
<body>
    <hr>
    <p><em>This migration script adds email verification support to your existing ITSM database.</em></p>
    <p><strong>Note:</strong> You only need to run this once. If the fields already exist, the script will skip adding them.</p>
</body>
</html>