<?php
header('Content-Type: application/json');
$log = "[" . date('Y-m-d H:i:s') . "] TEST HIT\n";
file_put_contents('../../uploads/zoho_test_log.txt', $log, FILE_APPEND);
echo json_encode(["status" => "ok", "message" => "I am reaching the server!"]);
