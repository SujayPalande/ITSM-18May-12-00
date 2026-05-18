<?php
require_once 'php/config/database.php';
$db = getDb();
$res = $db->fetchOne("SELECT COUNT(*) as count FROM tickets");
echo "Total tickets: " . $res['count'] . "\n";
?>
