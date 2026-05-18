<?php
/**
 * Test Direct Function Call
 */

require_once '../config/database.php';

// Start session and set up authentication
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';
$_SESSION['user_name'] = 'Admin User';

echo "Testing handleGetTickets function directly...\n\n";

// Simulate GET parameters for user=my
$_GET['user'] = 'my';

function testHandleGetTickets() {
    requireAuth();
    
    $db = getDb();
    $filter = $_GET['filter'] ?? 'all';
    $user = $_GET['user'] ?? '';  // Handle user=my parameter
    $status = $_GET['status'] ?? '';
    $priority = $_GET['priority'] ?? '';
    $categoryId = $_GET['categoryId'] ?? '';
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    echo "Parameters:\n";
    echo "- user: '$user'\n";
    echo "- filter: '$filter'\n";
    echo "- userId: $userId\n";
    echo "- userRole: $userRole\n\n";
    
    $sql = "
        SELECT 
            t.*,
            c.name as category_name,
            sc.name as subcategory_name,
            cb.name as created_by_name,
            cb.email as created_by_email,
            at.name as assigned_to_name,
            at.email as assigned_to_email,
            (SELECT COUNT(*) FROM comments WHERE ticket_id = t.id) as comment_count
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN categories sc ON t.subcategory_id = sc.id
        LEFT JOIN users cb ON t.created_by_id = cb.id
        LEFT JOIN users at ON t.assigned_to_id = at.id
        WHERE 1=1
    ";
    
    $params = [];
    
    // Handle user=my parameter for My Tickets page
    if ($user === 'my') {
        echo "✓ Using user=my filter\n";
        $sql .= " AND t.created_by_id = :user_id";
        $params['user_id'] = $userId;
    }
    
    $sql .= " ORDER BY t.created_at DESC LIMIT 10";
    
    echo "SQL Query:\n$sql\n\n";
    echo "Parameters:\n";
    print_r($params);
    echo "\n";
    
    $tickets = $db->fetchAll($sql, $params);
    
    echo "Raw tickets found: " . count($tickets) . "\n";
    
    if (count($tickets) > 0) {
        echo "First ticket raw data:\n";
        print_r($tickets[0]);
        echo "\n";
        
        // Transform first ticket to show the transformation
        $ticket = $tickets[0];
        $transformedTicket = [
            'id' => (int)$ticket['id'],
            'title' => $ticket['title'],
            'description' => $ticket['description'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'supportType' => $ticket['support_type'],
            'categoryId' => (int)$ticket['category_id'],
            'createdById' => (int)$ticket['created_by_id'],
            'createdAt' => $ticket['created_at'],
            'category' => [
                'id' => (int)$ticket['category_id'],
                'name' => $ticket['category_name']
            ]
        ];
        
        echo "Transformed ticket:\n";
        print_r($transformedTicket);
    }
    
    return $tickets;
}

try {
    $tickets = testHandleGetTickets();
    echo "\n✅ Function executed successfully!\n";
    echo "Total tickets returned: " . count($tickets) . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>