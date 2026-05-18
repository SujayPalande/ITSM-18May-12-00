<?php
/**
 * Database Test Script
 * Use this to test database connectivity and table structure
 */

require_once '../config/database.php';

try {
    echo "Testing database connection...\n";
    $db = getDb();
    echo "✓ Database connection successful\n\n";
    
    // Test if required tables exist
    $tables = ['users', 'categories', 'tickets'];
    foreach ($tables as $table) {
        $result = $db->fetchAll("SHOW TABLES LIKE '$table'");
        if ($result) {
            echo "✓ Table '$table' exists\n";
            
            // Count records
            $count = $db->fetchOne("SELECT COUNT(*) as count FROM $table");
            echo "  Records: " . $count['count'] . "\n";
            
            // Show table structure
            if ($table === 'tickets') {
                echo "  Checking tickets table structure:\n";
                $columns = $db->fetchAll("DESCRIBE $table");
                foreach ($columns as $column) {
                    echo "    " . $column['Field'] . " - " . $column['Type'] . "\n";
                }
            }
        } else {
            echo "✗ Table '$table' NOT found\n";
        }
        echo "\n";
    }
    
    // Test session data
    session_start();
    echo "Session data:\n";
    print_r($_SESSION);
    
    // Test basic queries
    echo "\nTesting basic queries:\n";
    
    $categories = $db->fetchAll("SELECT id, name FROM categories LIMIT 5");
    echo "Categories: " . count($categories) . " found\n";
    foreach ($categories as $cat) {
        echo "  ID: " . $cat['id'] . " - " . $cat['name'] . "\n";
    }
    
    $users = $db->fetchAll("SELECT id, name, role FROM users LIMIT 5");
    echo "\nUsers: " . count($users) . " found\n";
    foreach ($users as $user) {
        echo "  ID: " . $user['id'] . " - " . $user['name'] . " (" . $user['role'] . ")\n";
    }
    
    echo "\n✓ All tests completed successfully!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>