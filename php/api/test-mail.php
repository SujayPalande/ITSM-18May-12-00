<?php
// Simple endpoint to test email sending using centralized mail helper
header('Content-Type: application/json');
require_once dirname(__DIR__) . '/lib/mailer.php';

$to = $_GET['to'] ?? ($_POST['to'] ?? ($_GET['email'] ?? null));
$name = $_GET['name'] ?? ($_POST['name'] ?? 'Test User');
$subject = $_GET['subject'] ?? ($_POST['subject'] ?? 'Test email from ITSM');
$body = $_GET['body'] ?? ($_POST['body'] ?? '<p>This is a test email from ITSM server at ' . date('c') . '</p>');

if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'error' => 'Provide a valid to=email address (GET/POST)']);
    exit(1);
}

$res = send_mail($to, $name, $subject, $body);
if (!empty($res['success'])) {
    echo json_encode(['success' => true, 'message' => 'Email sent', 'details' => $res]);
} else {
    echo json_encode(['success' => false, 'error' => $res['error'] ?? 'unknown', 'details' => $res]);
}

?>
