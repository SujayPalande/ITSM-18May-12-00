<?php
header('Content-Type: text/plain');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/mailer.php';

echo "Testing SMTP from Web...\n";
$res = send_mail('support@cybaemtech.com', 'Web Test', 'Web SMTP Test', 'Testing from browser context at ' . date('Y-m-d H:i:s'));
echo "Result:\n";
print_r($res);
