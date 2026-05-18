<?php
require_once dirname(__DIR__) . '/config/database.php';
$db = getDb();
try {
    $columns = $db->fetchAll("DESCRIBE tickets");
    echo json_encode(array_column($columns, 'Field'));
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
