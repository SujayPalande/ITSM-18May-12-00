<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/zoho_api.php';

try {
    $db = getDb();
    $zoho = new ZohoPeopleAPI();
    $syncedCount = $zoho->syncEmployees($db);
    echo "Synced count: $syncedCount\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
