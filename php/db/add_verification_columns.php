<?php
/**
 * Add verification columns to users table
 */

// Get the correct path to database config regardless of working directory
$configPath = dirname(__DIR__) . '/config/database.php';
if (!file_exists($configPath)) {
    // Fallback for different directory structures
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;

try {
    $db = getDb();
    
    // Check if columns already exist
    $hasIsVerified = false;
    $hasVerificationToken = false;
    
    $columns = $db->fetchAll("SHOW COLUMNS FROM users");
    foreach ($columns as $column) {
        if ($column['Field'] === 'is_verified') {
            $hasIsVerified = true;
        }
        if ($column['Field'] === 'verification_token') {
            $hasVerificationToken = true;
        }
    }
    
    // Add is_verified column if it doesn't exist
    if (!$hasIsVerified) {
        $db->query("ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0");
        echo "Added is_verified column\n";
    } else {
        echo "is_verified column already exists\n";
    }
    
    // Add verification_token column if it doesn't exist
    if (!$hasVerificationToken) {
        $db->query("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)");
        echo "Added verification_token column\n";
    } else {
        echo "verification_token column already exists\n";
    }
    
    // Update existing users to be verified (they were created before verification system)
    $db->query("UPDATE users SET is_verified = 1 WHERE is_verified = 0 AND verification_token IS NULL");
    echo "Updated existing users to verified status\n";
    
    echo "Database update completed successfully\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>