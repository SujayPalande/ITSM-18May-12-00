<?php
/**
 * Zoho People Webhook Listener v3.1 (Obsessively Robust)
 * Receives Check-in / Check-out events
 */

header('Content-Type: application/json');

// 1. LOG THE RAW HIT IMMEDIATELY (Zero Dependencies)
$basePath = realpath(__DIR__ . '/../../');
$logFile = $basePath . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'zoho_webhook_log.txt';
$rawPostData = file_get_contents('php://input');

$logEntry = "[" . date('Y-m-d H:i:s') . "] ----- WEBHOOK HIT START -----\n";
$logEntry .= "URL: " . ($_SERVER['REQUEST_URI'] ?? 'unknown') . "\n";
$logEntry .= "METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logEntry .= "CLIENT_IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";
$logEntry .= "POST_FIELDS: " . json_encode($_POST) . "\n";
$logEntry .= "GET_FIELDS: " . json_encode($_GET) . "\n";
$logEntry .= "RAW_BODY: " . substr($rawPostData, 0, 1000) . "\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

try {
    // 2. LOAD DEPENDENCIES
    if (!file_exists(__DIR__ . '/../config/database.php')) throw new Exception("Database config missing");
    require_once __DIR__ . '/../config/database.php';
    
    // 3. EXTRACT DATA - Support all possible Zoho payload formats
    $json = json_decode($rawPostData, true) ?: [];
    
    // Check $_REQUEST first (covers both GET and POST-form-encoded)
    $email = $json['email'] ?? $_POST['email'] ?? $_GET['email'] ?? '';
    $type  = $json['type']  ?? $_POST['type']  ?? $_GET['type']  ?? '';
    
    if (!$type) {
        $type = $json['action'] ?? $_POST['action'] ?? $_GET['action'] ?? '';
    }

    if (empty($email)) {
        throw new Exception("Payload missing 'email'");
    }

    $email = strtolower(trim($email));
    $email = str_replace('@cybaemtech.in', '@cybaemtech.com', $email);
    $type  = strtolower(trim($type));

    if (empty($type)) {
        throw new Exception("Missing 'type' or 'action' (checkin/checkout)");
    }

    $db = getDb();
    
    // 4. MAP USER
    $userResult = $db->fetchOne("SELECT id, full_name as name FROM se_profiles WHERE LOWER(email) = LOWER(?)", [$email]);
    if (!$userResult) {
        $userResult = $db->fetchOne("SELECT id, name FROM users WHERE LOWER(email) = LOWER(?)", [$email]);
    }

    $userId = $userResult['id'] ?? 'unknown_'.uniqid();
    $userName = $userResult['name'] ?? trim($json['name'] ?? $_REQUEST['name'] ?? 'Zoho User');
    
    $checkInId = uniqid('zoho_');
    $timestamp = date('Y-m-d H:i:s');
    $todayDate = date('Y-m-d');
    
    $locationName = trim($json['location'] ?? $_REQUEST['location'] ?? '');
    
    // 5. DATABASE OPERATIONS
    $isCheckIn = (strpos($type, 'in') !== false); // handles 'checkin', 'check-in', 'clock-in'
    $isCheckOut = (strpos($type, 'out') !== false);

    if ($isCheckIn) {
        $db->query(
            "INSERT INTO se_check_ins (id, engineer_id, date, check_in_time, location_name) VALUES (?, ?, ?, ?, ?)",
            [$checkInId, $userId, $todayDate, $timestamp, $locationName]
        );
        file_put_contents($logFile, "SUCCESS: Inserted Check-in for $userName ($email)\n", FILE_APPEND);
    } 
    else if ($isCheckOut) {
        $openCheckIn = $db->fetchOne(
            "SELECT id FROM se_check_ins WHERE engineer_id = ? AND date = ? AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1",
            [$userId, $todayDate]
        );

        if ($openCheckIn) {
            $db->query("UPDATE se_check_ins SET check_out_time = ? WHERE id = ?", [$timestamp, $openCheckIn['id']]);
            $checkInId = $openCheckIn['id'];
            file_put_contents($logFile, "SUCCESS: Updated Checkout for $userName ($email)\n", FILE_APPEND);
        } else {
            // Intelligent auto-toggle
            $db->query(
                "INSERT INTO se_check_ins (id, engineer_id, date, check_in_time, location_name) VALUES (?, ?, ?, ?, ?)",
                [$checkInId, $userId, $todayDate, $timestamp, $locationName]
                );
            file_put_contents($logFile, "SUCCESS: Auto-toggled to Check-in for $userName ($email)\n", FILE_APPEND);
        }
    } else {
        throw new Exception("Unknown event type: $type");
    }

    echo json_encode(["status" => "success", "message" => "Event logged for $userName"]);

} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    // Note: Always return HTTP 200 to Zoho so it stops retrying and blocking itself
    http_response_code(200); 
}

file_put_contents($logFile, "WEBHOOK HIT END\n--------------------------------------------\n", FILE_APPEND);
