<?php
require_once 'php/config/database.php';
$db = getDb();

echo "Counts:\n";
$res = $db->fetchOne("SELECT COUNT(*) as count FROM tickets");
echo " - Tickets: " . $res['count'] . "\n";

$res = $db->fetchOne("SELECT COUNT(*) as count FROM users");
echo " - Users: " . $res['count'] . "\n";

$res = $db->fetchOne("SELECT COUNT(*) as count FROM categories");
echo " - Categories: " . $res['count'] . "\n";

// Check if any tickets are linked to valid users
$res = $db->fetchOne("SELECT COUNT(*) as count FROM tickets WHERE created_by_id IN (SELECT id FROM users)");
echo " - Tickets with valid creator: " . $res['count'] . "\n";
?>
