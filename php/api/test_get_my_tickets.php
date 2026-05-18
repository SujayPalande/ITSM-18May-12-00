<?php
/**
 * Test Get My Tickets Endpoint
 */

require_once '../config/database.php';

// Simulate authenticated session
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';
$_SESSION['user_name'] = 'Admin User';

echo "Testing GET /tickets.php?user=my...\n\n";

// Simulate the GET parameters
$_GET['user'] = 'my';

echo "Session data:\n";
print_r($_SESSION);
echo "\n";

echo "GET parameters:\n";
print_r($_GET);
echo "\n";

try {
    // Include the tickets.php functions
    ob_start();
    include 'tickets.php';
    $output = ob_get_clean();
    
    echo "Response:\n";
    echo $output;
    echo "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>