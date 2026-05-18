<?php
require_once dirname(__DIR__) . '/config/database.php';
$db = getDb();

try {
    $counts = [];

    $count = $db->fetchOne("SELECT COUNT(*) as cnt FROM project_bug_reports");
    $counts['bugs'] = $count['cnt'];
    
    $count = $db->fetchOne("SELECT COUNT(*) as cnt FROM tickets");
    $counts['tickets'] = $count['cnt'];
    
    // Check if error log has any PHP errors right now
    $counts['status'] = "DB Connected OK";
    
    echo json_encode($counts);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
