<?php
/**
 * Frontend Simulation Test
 * This script simulates exactly what the frontend does
 */

// Simulate the exact FormData that frontend sends
function testFrontendSimulation() {
    echo "=== FRONTEND SIMULATION TEST ===\n\n";
    
    // This is exactly what the frontend sends in FormData
    $frontendData = [
        'title' => 'Frontend Simulation Test Ticket',
        'description' => 'This ticket was created to test the exact frontend flow with all the correct field mappings and data formats.',
        'categoryId' => '1',  // Note: string format like frontend
        'subcategoryId' => '',  // Empty string like frontend
        'priority' => 'medium',
        'supportType' => 'remote',
        'assignedToId' => '',
        'contactEmail' => 'frontend.test@cybaemtech.in',
        'contactName' => 'Frontend Test User',
        'contactPhone' => '+1-234-567-8900',
        'contactDepartment' => 'IT Testing Department',
        'dueDate' => '2025-09-29',  // Date format from frontend
        'status' => 'open'
    ];
    
    echo "Frontend data to be sent:\n";
    print_r($frontendData);
    echo "\n";
    
    // Test the exact URL and method that frontend uses
    $url = 'https://cybaemtech.in/itsm_app/php/api/tickets.php';
    
    // Convert to JSON like frontend does
    $jsonData = json_encode($frontendData);
    
    echo "JSON payload:\n$jsonData\n\n";
    
    // Setup headers exactly like frontend
    $options = [
        'http' => [
            'header' => [
                "Content-Type: application/json",
                "User-Agent: ITSMFrontendSimulation/1.0",
                "Accept: application/json"
            ],
            'method' => 'POST',
            'content' => $jsonData,
        ]
    ];
    
    $context = stream_context_create($options);
    
    echo "Making request to: $url\n";
    echo "Method: POST\n";
    echo "Content-Type: application/json\n\n";
    
    $result = @file_get_contents($url, false, $context);
    
    if ($result === FALSE) {
        echo "❌ Request failed\n";
        $error = error_get_last();
        if ($error) {
            echo "Error: " . $error['message'] . "\n";
        }
        
        // Get response headers to understand what happened
        if (isset($http_response_header)) {
            echo "Response headers:\n";
            foreach ($http_response_header as $header) {
                echo "  $header\n";
            }
        }
        return false;
    }
    
    echo "✅ Request successful!\n";
    echo "Response: $result\n\n";
    
    $data = json_decode($result, true);
    if ($data) {
        if (isset($data['error'])) {
            echo "❌ API Error: " . $data['error'] . "\n";
            if ($data['error'] === 'Authentication required') {
                echo "ℹ️  This is expected - the frontend needs to be logged in first\n";
            }
            return false;
        } else {
            echo "✅ Ticket created successfully!\n";
            echo "Ticket ID: " . ($data['id'] ?? 'Unknown') . "\n";
            return true;
        }
    } else {
        echo "❌ Invalid JSON response\n";
        return false;
    }
}

// Test with FormData format (what frontend actually sends)
function testFormDataFormat() {
    echo "\n=== FORM DATA FORMAT TEST ===\n\n";
    
    // Simulate what would be in $_POST when FormData is sent
    $_POST = [
        'title' => 'FormData Test Ticket',
        'description' => 'Testing with FormData format like the frontend actually sends',
        'categoryId' => '1',
        'priority' => 'high',
        'supportType' => 'remote',
        'contactEmail' => 'formdata.test@cybaemtech.in',
        'contactName' => 'FormData Test User',
        'dueDate' => '2025-09-30'
    ];
    
    // Simulate authenticated session
    session_start();
    $_SESSION['user_id'] = 1;
    $_SESSION['user_role'] = 'admin';
    $_SESSION['user_name'] = 'Admin User';
    
    echo "Simulated POST data:\n";
    print_r($_POST);
    echo "\n";
    
    echo "Session data:\n";
    print_r($_SESSION);
    echo "\n";
    
    try {
        // Include the tickets.php functions
        require_once '../config/database.php';
        
        // Call the function directly
        handleCreateTicket($_POST);
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        return false;
    }
    
    return true;
}

// Run tests
echo "Starting comprehensive frontend simulation tests...\n\n";

// Test 1: External API call (will fail due to authentication, but tests connectivity)
testFrontendSimulation();

// Test 2: Direct function call with session (should succeed)
testFormDataFormat();

echo "\n🎉 All tests completed!\n";
?>