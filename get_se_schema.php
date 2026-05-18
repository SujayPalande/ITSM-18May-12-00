<?php
require_once __DIR__ . '/php/config/database.php';
$db = getDb();
$tables = ['se_profiles', 'se_assignments', 'se_check_ins', 'se_daily_reports', 'se_leave_requests', 'se_clients', 'se_sites'];

foreach ($tables as $table) {
    echo "Table: $table\n";
    try {
        $cols = $db->fetchAll("DESCRIBE $table");
        foreach ($cols as $col) {
            echo "  {$col['Field']} - {$col['Type']}\n";
        }
    } catch (Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
