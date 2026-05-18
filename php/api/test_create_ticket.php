<?php
/**
 * Test Ticket Creation Endpoint
 * This simulates the frontend request to create a ticket
 */

require_once '../config/database.php';

// Start fresh session for testing
session_start();

// Simulate user session (you'll need to update this with actual user ID)
$_SESSION['user_id'] = 1; // Using admin user ID from our test
$_SESSION['user_role'] = 'admin';
$_SESSION['user_name'] = 'Admin User';

echo "Testing ticket creation endpoint...\n";
echo "Session user ID: " . $_SESSION['user_id'] . "\n";
echo "Session user role: " . $_SESSION['user_role'] . "\n\n";

// Test data - same as what frontend would send
$testData = [
    'title' => 'Test Ticket from PHP Script',
    'description' => 'This is a test ticket created from PHP script to test the endpoint',
    'priority' => 'medium',
    'support_type' => 'incident',
    'contact_email' => 'test@example.com',
    'contact_name' => 'Test User',
    'contact_phone' => '123-456-7890',
    'contact_department' => 'IT Department',
    'category_id' => '1', // Network Issues
    'due_date' => date('Y-m-d H:i:s', strtotime('+7 days'))
];

echo "Test data:\n";
print_r($testData);
echo "\n";

try {
    $db = getDb();
    
    // Validate category exists
    $category = $db->fetchOne("SELECT id, name FROM categories WHERE id = ?", [$testData['category_id']]);
    if (!$category) {
        throw new Exception("Category not found");
    }
    echo "✓ Category validation passed: " . $category['name'] . "\n";
    
    // Validate user exists
    $user = $db->fetchOne("SELECT id, name FROM users WHERE id = ?", [$_SESSION['user_id']]);
    if (!$user) {
        throw new Exception("User not found");
    }
    echo "✓ User validation passed: " . $user['name'] . "\n";
    
    // Prepare ticket data for insertion
    $ticketData = [
        'title' => $testData['title'],
        'description' => $testData['description'],
        'status' => 'open',
        'priority' => $testData['priority'],
        'support_type' => $testData['support_type'],
        'contact_email' => $testData['contact_email'],
        'contact_name' => $testData['contact_name'],
        'contact_phone' => $testData['contact_phone'],
        'contact_department' => $testData['contact_department'],
        'category_id' => (int)$testData['category_id'],
        'subcategory_id' => null,
        'created_by_id' => $_SESSION['user_id'],
        'assigned_to_id' => null,
        'due_date' => $testData['due_date'],
        'attachment_url' => null,
        'attachment_name' => null,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    echo "Inserting ticket data:\n";
    print_r($ticketData);
    echo "\n";
    
    // Insert ticket
    $ticketId = $db->insert('tickets', $ticketData);
    
    echo "✓ Ticket created successfully!\n";
    echo "New ticket ID: $ticketId\n";
    
    // Fetch the created ticket to verify
    $createdTicket = $db->fetchOne("SELECT * FROM tickets WHERE id = ?", [$ticketId]);
    echo "\nCreated ticket details:\n";
    print_r($createdTicket);
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>