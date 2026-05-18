<?php
/**
 * API Endpoint to trigger Zoho People Synchronization
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/zoho_api.php';

initializeSession();

// Check for admin role
$userId = $_SESSION['user_id'] ?? $_SESSION['site_engg_user_id'] ?? null;
if (!$userId) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = getDb();
$user = $db->fetchOne("SELECT role FROM users WHERE id = ?", [$userId]);
if (!$user) {
    $user = $db->fetchOne("SELECT role FROM se_profiles WHERE id = ?", [$userId]);
}

if (!$user || !in_array($user['role'], ['admin', 'hr'])) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

header('Content-Type: application/json');

try {
    $zoho = new ZohoPeopleAPI();
    $syncedCount = $zoho->syncEmployees($db);
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully synchronized $syncedCount employees from Zoho People.",
        'synced_count' => $syncedCount
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
