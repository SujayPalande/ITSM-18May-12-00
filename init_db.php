<?php
require_once 'php/config/database.php';

try {
    $db = getDb();
    
    // Check if tables already exist
    $tables = $db->fetchAll("SHOW TABLES");
    $tableNames = array_map(function($t) { return array_values($t)[0]; }, $tables);
    
    if (in_array('users', $tableNames)) {
        echo "Database tables already exist. No initialization needed.\n";
        exit;
    }
    
    echo "Initializing database schema...\n";
    $sql = file_get_contents('mysql_schema.sql');
    
    // Split SQL by semicolon and execute each part
    // Note: This is a simple parser and might fail on complex SQL with semicolons in strings
    $queries = explode(';', $sql);
    
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            try {
                $db->getConnection()->exec($query);
            } catch (Exception $e) {
                echo "Warning: Error executing query: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "Database initialization complete!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
