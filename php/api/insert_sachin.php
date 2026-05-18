<?php
require_once __DIR__ . '/../../php/config/database.php';

try {
    $db = getDb();
    
    // 1. Check if user already exists
    $existing = $db->fetchOne("SELECT id FROM users WHERE email = 'sachin.jadhav@praj.net'");
    $userId = 0;
    if ($existing) {
        $userId = $existing['id'];
        echo "User already exists with ID: $userId\n";
    } else {
        // Create user
        $password = password_hash('Praj@123', PASSWORD_DEFAULT);
        $userId = $db->insert('users', [
            'username' => 'sachin.jadhav',
            'password' => $password,
            'name' => 'Sachin Jadhav',
            'email' => 'sachin.jadhav@praj.net',
            'role' => 'user',
            'company_name' => 'Praj Industries',
            'designation' => 'Senior IT Support Engineer'
        ]);
        echo "Created user Sachin Jadhav with ID: $userId\n";
    }
    
    // 2. Check if Praj Industries client exists in se_clients
    $client = $db->fetchOne("SELECT id FROM se_clients WHERE name LIKE '%Praj%'");
    $clientId = '';
    
    if ($client) {
        $clientId = $client['id'];
        echo "Praj client already exists with ID: $clientId\n";
        
        // Update user_id inside se_clients to make him admin
        $db->update('se_clients', ['user_id' => $userId, 'contact_email' => 'sachin.jadhav@praj.net', 'contact_person' => 'Sachin Jadhav'], "id = '$clientId'");
        echo "Updated existing Praj client with admin user_id: $userId\n";
    } else {
        $clientId = 'cli_' . uniqid();
        $db->insert('se_clients', [
            'id' => $clientId,
            'name' => 'Praj Industries',
            'contact_person' => 'Sachin Jadhav',
            'contact_email' => 'sachin.jadhav@praj.net',
            'user_id' => $userId,
            'phone' => ''
        ]);
        echo "Created Praj Industries in se_clients with ID: $clientId\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
