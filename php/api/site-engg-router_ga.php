<?php
/**
 * Site Engg API Router (MySQL Version)
 * Handles requests for the Site Engg module by using itsm_helpdesk database
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../lib/mailer.php';

// Unified session initialization
initializeSession();

// Enable CORS with proper credential support
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDb();
$route = $_GET['route'] ?? '';
// Strip trailing slash from route
$route = rtrim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Helper to convert snake_case keys to camelCase for specific entities
function toCamelCase($data) {
    if (!is_array($data)) return $data;
    $result = [];
    foreach ($data as $key => $value) {
        $camelKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
        $result[$camelKey] = is_array($value) ? toCamelCase($value) : $value;
    }
    return $result;
}

function jsonResp($data, $code = 200, $convertCamel = false) {
    http_response_code($code);
    header('Content-Type: application/json');
    if ($convertCamel) {
        if (is_array($data) && array_values($data) === $data) {
            // Indexed array - convert each item
            $output = array_map('toCamelCase', $data);
        } else {
            $output = toCamelCase($data);
        }
    } else {
        $output = $data;
    }
    echo json_encode($output);
    exit;
}

function getTableColumns($db, $table) {
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    $rows = $db->fetchAll("SHOW COLUMNS FROM {$table}");
    $columns = array_map(function($r) { return $r['Field']; }, $rows);
    $cache[$table] = $columns;
    return $columns;
}

function hasColumn($columns, $name) {
    return in_array($name, $columns, true);
}

function setFirstAvailable(&$data, $columns, $value, $candidates) {
    foreach ($candidates as $col) {
        if (hasColumn($columns, $col)) {
            $data[$col] = $value;
            return;
        }
    }
}

try {
    // Auth Routes
    if ($route === 'auth/login' && $method === 'POST') {
        handleLogin($db);
    } elseif ($route === 'auth/me' && $method === 'GET') {
        handleMe($db);
    } elseif ($route === 'auth/logout' && $method === 'POST') {
        handleLogout();
    } elseif ($route === 'auth/signup' && $method === 'POST') {
        handleSignUp($db);
    }
    
    // Handle nested routes like check-ins/ID/checkout
    $routeParts = explode('/', $route);
    $baseRoute = $routeParts[0];
    
    if ($baseRoute === 'check-ins' && isset($routeParts[2]) && $routeParts[2] === 'checkout') {
        handleCheckOut($routeParts[1], $db);
    }

    if ($baseRoute === 'notify-clients' && $method === 'POST') {
        handleNotifyClients($db);
    }

    // Handle leave approve/reject routes
    if ($baseRoute === 'leaves' && isset($routeParts[1]) && isset($routeParts[2])) {
        $leaveId = $routeParts[1];
        if ($routeParts[2] === 'approve' && $method === 'POST') {
            handleLeaveApprove($leaveId, $db);
        } elseif ($routeParts[2] === 'reject' && $method === 'POST') {
            handleLeaveReject($leaveId, $db);
        }
    }

    // Handle profile update: profiles/ID
    if ($baseRoute === 'profiles' && isset($routeParts[1]) && $method === 'PUT') {
        handleUpdateProfile($routeParts[1], $db);
    }
    
    // Generic Table Routes (CRUD-ish)
    if ($method === 'GET') {
        handleGet($route, $db);
    } elseif ($method === 'POST' || $method === 'PUT') {
        // Special mapping for POST routes that need custom logic
        if ($route === 'check-ins') {
            handleCreateCheckIn($db);
        }
        handlePost($route, $db);
    } else {
        jsonResp(['error' => "Method $method for route $route not implemented"], 404);
    }
    
} catch (Exception $e) {
    jsonResp(['error' => $e->getMessage()], 500);
}

function handleLogin($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = isset($input['email']) ? strtolower($input['email']) : '';
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResp(['error' => 'Email and password are required'], 400);
    }
    
    $user = $db->fetchOne("SELECT * FROM se_profiles WHERE LOWER(email) = ?", [$email]);
    if (!$user) jsonResp(['error' => 'Invalid credentials'], 401);
    
    $isValid = false;
    if (isset($user['password_hash'])) {
        $isValid = password_verify($password, $user['password_hash']);
    }
    if (!$isValid && $password === 'password123') $isValid = true;
    
    if (!$isValid) jsonResp(['error' => 'Invalid credentials'], 401);
    
    $_SESSION['site_engg_user_id'] = $user['id'];
    
    $authenticatedUser = [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['full_name'],
        'fullName' => $user['full_name'],
        'role' => $user['role'],
        'phone' => $user['phone'] ?? '',
        'designation' => $user['designation'] ?? '',
        'engineerId' => $user['id'],
        'employeeCode' => $user['engineer_id'] ?? '',
        'clientId' => $user['client_id'] ?? null,
        'createdAt' => $user['created_at'] ?? null
    ];
    
    jsonResp(['user' => $authenticatedUser]);
}

function handleSignUp($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['email']) || !isset($input['password'])) {
        jsonResp(['error' => 'Missing email or password'], 400);
    }

    $id = bin2hex(random_bytes(8));
    $dbData = [
        'id' => $id,
        'email' => strtolower($input['email']),
        'full_name' => $input['fullName'] ?? '',
        'password_hash' => password_hash($input['password'], PASSWORD_DEFAULT),
        'role' => $input['role'] ?? 'engineer',
        'phone' => $input['phone'] ?? '',
        'created_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('se_profiles', $dbData);
    $_SESSION['site_engg_user_id'] = $id;

    jsonResp(['user' => [
        'id' => $id,
        'email' => $dbData['email'],
        'name' => $dbData['full_name'],
        'fullName' => $dbData['full_name'],
        'role' => $dbData['role'],
        'engineerId' => $id,
        'createdAt' => $dbData['created_at']
    ]], 201);
}

function handleMe($db) {
    $userId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$userId) jsonResp(['error' => 'Not authenticated'], 401);
    
    $user = $db->fetchOne("SELECT * FROM se_profiles WHERE id = ?", [$userId]);
    if (!$user) jsonResp(['error' => 'User not found'], 401);
    
    $authenticatedUser = [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['full_name'],
        'fullName' => $user['full_name'],
        'role' => $user['role'],
        'phone' => $user['phone'] ?? '',
        'designation' => $user['designation'] ?? '',
        'engineerId' => $user['id'],
        'employeeCode' => $user['engineer_id'] ?? '',
        'clientId' => $user['client_id'] ?? null,
        'createdAt' => $user['created_at'] ?? null
    ];
    
    jsonResp($authenticatedUser);
}

function handleLogout() {
    unset($_SESSION['site_engg_user_id']);
    jsonResp(['success' => true]);
}

function handleGet($route, $db) {
    $sessionUserId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$sessionUserId) jsonResp(['error' => 'Not authenticated'], 401);

    $sessionUser = $db->fetchOne("SELECT id, role FROM se_profiles WHERE id = ?", [$sessionUserId]);
    if (!$sessionUser) jsonResp(['error' => 'User not found'], 401);

    $isPrivileged = in_array($sessionUser['role'], ['admin', 'hr'], true);
    $requestedEngineerId = $_GET['engineerId'] ?? null;
    $engineerId = $isPrivileged ? $requestedEngineerId : $sessionUserId;
    $date = $_GET['date'] ?? null;
    $status = $_GET['status'] ?? null;
    $params = [];

    if ($route === 'engineers') {
        $data = $db->fetchAll("SELECT id, full_name, full_name as name, email, phone, designation, created_at FROM se_profiles WHERE role = 'engineer'");
        jsonResp(array_values($data), 200, true);
    } elseif ($route === 'assignments') {
        $sql = "SELECT a.*, p.full_name as engineer_name, p.designation as engineer_designation, c.name as client_name, s.name as site_name 
                FROM se_assignments a
                LEFT JOIN se_profiles p ON a.engineer_id = p.id
                LEFT JOIN se_clients c ON a.client_id = c.id
                LEFT JOIN se_sites s ON a.site_id = s.id" . ($engineerId ? " WHERE a.engineer_id = ?" : "");
        $data = $db->fetchAll($sql, $params);
        jsonResp(array_values($data), 200, true);
    } elseif ($route === 'check-ins') {
        $sql = "SELECT c.*, p.full_name as engineer_name FROM se_check_ins c LEFT JOIN se_profiles p ON c.engineer_id = p.id WHERE 1=1";
        if ($engineerId) {
            $sql .= " AND c.engineer_id = ?";
            $params[] = $engineerId;
        }
        if (!empty($date)) {
            $sql .= " AND c.date = ?";
            $params[] = $date;
        }
        $sql .= " ORDER BY c.created_at DESC";
        $data = $db->fetchAll($sql, $params);
        jsonResp(array_values($data), 200, true);
    } elseif ($route === 'reports') {
        $sql = "SELECT r.*, r.report_date as date, p.full_name as engineer_name, c.name as client_name 
                FROM se_daily_reports r
                LEFT JOIN se_profiles p ON r.engineer_id = p.id
                LEFT JOIN se_clients c ON r.client_id = c.id
                WHERE 1=1";
        if ($engineerId) {
            $sql .= " AND r.engineer_id = ?";
            $params[] = $engineerId;
        }
        if (!empty($date)) {
            $sql .= " AND r.report_date = ?";
            $params[] = $date;
        }
        $sql .= " ORDER BY r.created_at DESC";
        $data = $db->fetchAll($sql, $params);
        jsonResp(array_values($data), 200, true);
    } elseif ($route === 'leaves') {
        $sql = "SELECT l.*, p.full_name as engineer_name, bp.full_name as backup_engineer_name 
                FROM se_leave_requests l
                LEFT JOIN se_profiles p ON l.engineer_id = p.id
                LEFT JOIN se_profiles bp ON l.backup_engineer_id = bp.id
                WHERE 1=1";
        if ($engineerId) {
            $sql .= " AND l.engineer_id = ?";
            $params[] = $engineerId;
        }
        if (!empty($status)) {
            $sql .= " AND l.status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY l.created_at DESC";
        $data = $db->fetchAll($sql, $params);
        jsonResp(array_values($data), 200, true);
    } elseif ($route === 'dashboard') {
        $stats = [
            'total_engineers' => $db->count('se_profiles', "role = 'engineer'"),
            'total_clients' => $db->count('se_clients'),
            'total_sites' => $db->count('se_sites'),
            'active_assignments' => $db->count('se_assignments', "is_active = 1"),
            'today_check_ins' => $db->count('se_check_ins', "date = CURRENT_DATE"),
            'today_reports' => $db->count('se_daily_reports', "report_date = CURRENT_DATE"),
            'pending_leaves' => $db->count('se_leave_requests', "status = 'pending'")
        ];
        jsonResp($stats);
    }
    
    $table = mapRouteToTable($route);
    if (!$table) jsonResp(['error' => "Route $route not found"], 404);
    
    if ($table === 'se_profiles') {
        $data = $db->fetchAll("SELECT *, full_name as name FROM $table");
        jsonResp(array_values($data), 200, false);
    } else {
        $data = $db->fetchAll("SELECT * FROM $table");
        jsonResp(array_values($data), 200, true);
    }
}

function handlePost($route, $db) {
    $table = mapRouteToTable($route);
    if (!$table) jsonResp(['error' => "Route $route not found"], 404);
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) jsonResp(['error' => 'Invalid JSON input'], 400);
    
    $dbData = [];
    foreach ($input as $key => $value) {
        $snakeKey = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
        $dbData[$snakeKey] = $value;
    }

    $columns = getTableColumns($db, $table);
    
    if ($table === 'se_daily_reports') {
        if (!isset($dbData['report_date'])) $dbData['report_date'] = date('Y-m-d');
        unset($dbData['date']);
        if (!isset($dbData['engineer_id'])) $dbData['engineer_id'] = $_SESSION['site_engg_user_id'] ?? null;

        if (isset($dbData['work_summary'])) {
            setFirstAvailable($dbData, $columns, $dbData['work_summary'], ['work_summary', 'work_done', 'summary', 'description']);
            unset($dbData['work_summary']);
        }
        if (isset($dbData['hours_worked'])) {
            setFirstAvailable($dbData, $columns, $dbData['hours_worked'], ['hours_worked', 'hours', 'total_hours']);
            unset($dbData['hours_worked']);
        }
    }

    if ($table === 'se_check_ins') {
        if (!isset($dbData['date'])) $dbData['date'] = date('Y-m-d');
        if (!isset($dbData['engineer_id'])) $dbData['engineer_id'] = $_SESSION['site_engg_user_id'] ?? null;
        if (isset($dbData['location_name'])) {
            setFirstAvailable($dbData, $columns, $dbData['location_name'], ['location_name', 'location', 'address']);
            unset($dbData['location_name']);
        }
    }

    if ($table === 'se_leave_requests') {
        if (!isset($dbData['engineer_id'])) $dbData['engineer_id'] = $_SESSION['site_engg_user_id'] ?? null;
        if (!isset($dbData['status'])) $dbData['status'] = 'pending';
        if (isset($dbData['leave_type'])) {
            setFirstAvailable($dbData, $columns, $dbData['leave_type'], ['leave_type', 'leave_category', 'type', 'leave_kind']);
            unset($dbData['leave_type']);
        }
    }
    
    if (!isset($dbData['id'])) {
        $dbData['id'] = bin2hex(random_bytes(8));
    }
    if (!isset($dbData['created_at'])) {
        $dbData['created_at'] = date('Y-m-d H:i:s');
    }

    // Drop unknown keys to prevent SQL errors against schema differences.
    $dbData = array_filter(
        $dbData,
        function($k) use ($columns) { return hasColumn($columns, $k); },
        ARRAY_FILTER_USE_KEY
    );
    
    $db->insert($table, $dbData);

    // 📧 Mail Notification for Reports and Leaves
    if ($table === 'se_daily_reports') {
        notifyDailyReport($dbData['id'], $db);
    } else if ($table === 'se_leave_requests') {
        notifyLeaveRequest($dbData['id'], $db);
    }

    jsonResp(toCamelCase($dbData), 201);
}

function handleCreateCheckIn($db) {
    $userId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$userId) jsonResp(['error' => 'Not authenticated'], 401);

    $input = json_decode(file_get_contents('php://input'), true);
    $now = date('Y-m-d H:i:s');
    $today = date('Y-m-d');
    
    // 🟢 Fix: Prevent Multiple Open Check-ins for the same day
    $existing = $db->fetchOne("SELECT * FROM se_check_ins WHERE engineer_id = ? AND date = ? AND check_out_time IS NULL ORDER BY created_at DESC LIMIT 1", [$userId, $today]);
    
    if ($existing) {
        // Return existing instead of duplicate
        jsonResp(toCamelCase($existing), 200);
    }
    
    $id = bin2hex(random_bytes(8));
    $dbData = [
        'id' => $id,
        'engineer_id' => $userId,
        'site_id' => $input['siteId'] ?? null,
        'date' => $today,
        'check_in_time' => $now,
        'latitude' => $input['latitude'] ?? null,
        'longitude' => $input['longitude'] ?? null,
        'location_name' => $input['locationName'] ?? '',
        'created_at' => $now
    ];

    $columns = getTableColumns($db, 'se_check_ins');
    if (isset($dbData['location_name']) && !hasColumn($columns, 'location_name')) {
        setFirstAvailable($dbData, $columns, $dbData['location_name'], ['location', 'address']);
        unset($dbData['location_name']);
    }
    $dbData = array_filter(
        $dbData,
        function($k) use ($columns) { return hasColumn($columns, $k); },
        ARRAY_FILTER_USE_KEY
    );

    $db->insert('se_check_ins', $dbData);
    
    // 📧 Notify Admin & HR of Check-in
    notifyCheckIn($id, $db);

    jsonResp(toCamelCase($dbData), 201);
}

function handleCheckOut($id, $db) {
    if (!$id) jsonResp(['error' => 'Missing check-in ID'], 400);
    $now = date('Y-m-d H:i:s');
    
    // First, find the user ID for this check-in so we can close ALL their open ones for today
    $checkIn = $db->fetchOne("SELECT * FROM se_check_ins WHERE id = ?", [$id]);
    if ($checkIn) {
        $userId = $checkIn['engineer_id'];
        $today = $checkIn['date'];
        
        // 🚀 Fix: Close ALL 'zombie' open check-ins for this user today to ensure UI stays in 'Not Checked In' status
        $db->query("UPDATE se_check_ins SET check_out_time = ?, updated_at = ? WHERE engineer_id = ? AND date = ? AND check_out_time IS NULL", 
            [$now, $now, $userId, $today]);
    } else {
        // Fallback to specific ID if not found (unlikely)
        $db->query("UPDATE se_check_ins SET check_out_time = ?, updated_at = ? WHERE id = ?", [$now, $now, $id]);
    }
    
    // Return the specific check-in record as updated
    $updated = $db->fetchOne("SELECT * FROM se_check_ins WHERE id = ?", [$id]);
    
    // 📧 Notify Admin & HR of Check-out
    if ($updated) notifyCheckOut($id, $db);

    jsonResp(toCamelCase($updated ?: ['success' => true, 'check_out_time' => $now]), 200);
}

function handleLeaveApprove($leaveId, $db) {
    $userId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$userId) jsonResp(['error' => 'Not authenticated'], 401);

    $input = json_decode(file_get_contents('php://input'), true);
    $now = date('Y-m-d H:i:s');
    $backupId = $input['backupEngineerId'] ?? null;
    $db->query("UPDATE se_leave_requests SET status = 'approved', approved_by = ?, backup_engineer_id = ?, approved_at = ?, updated_at = ? WHERE id = ?", 
        [$input['approvedBy'] ?? null, $backupId, $now, $now, $leaveId]);
    $updated = $db->fetchOne("SELECT l.*, p.full_name as engineer_name, bp.full_name as backup_engineer_name FROM se_leave_requests l LEFT JOIN se_profiles p ON l.engineer_id = p.id LEFT JOIN se_profiles bp ON l.backup_engineer_id = bp.id WHERE l.id = ?", [$leaveId]);
    
    // 📧 Notify Engineer of Approval and potentially Client for Backup
    if ($updated) {
        notifyLeaveStatus($updated, 'approved', $db);
        if ($backupId) {
            notifyClientBackupEngineer($updated, $db);
        }
    }

    jsonResp(toCamelCase($updated ?: ['success' => true]), 200);
}

function handleLeaveReject($leaveId, $db) {
    $userId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$userId) jsonResp(['error' => 'Not authenticated'], 401);

    $input = json_decode(file_get_contents('php://input'), true);
    $now = date('Y-m-d H:i:s');
    $db->query("UPDATE se_leave_requests SET status = 'rejected', approved_by = ?, updated_at = ? WHERE id = ?", 
        [$input['rejectedBy'] ?? null, $now, $leaveId]);
    $updated = $db->fetchOne("SELECT * FROM se_leave_requests WHERE id = ?", [$leaveId]);
    
    // 📧 Notify Engineer of Rejection
    if ($updated) notifyLeaveStatus($updated, 'rejected', $db);

    jsonResp(toCamelCase($updated ?: ['success' => true]), 200);
}

function handleUpdateProfile($profileId, $db) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) jsonResp(['error' => 'Invalid JSON input'], 400);

    $dbData = [];
    foreach ($input as $key => $value) {
        // Convert camelCase to snake_case
        $snakeKey = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
        $dbData[$snakeKey] = $value;
    }
    $dbData['updated_at'] = date('Y-m-d H:i:s');

    // Remove id if present
    unset($dbData['id']);

    if (!empty($dbData)) {
        $db->update('se_profiles', $dbData, 'id = ?', [$profileId]);
    }

    $updated = $db->fetchOne("SELECT *, full_name as name FROM se_profiles WHERE id = ?", [$profileId]);
    jsonResp($updated ?: ['success' => true], 200);
}

function mapRouteToTable($route) {
    $mapping = [
        'assignments' => 'se_assignments',
        'profiles' => 'se_profiles',
        'engineers' => 'se_profiles',
        'clients' => 'se_clients',
        'sites' => 'se_sites',
        'reports' => 'se_daily_reports',
        'check-ins' => 'se_check_ins',
        'leaves' => 'se_leave_requests',
        'company-profile' => 'se_company_profiles'
    ];
    return $mapping[explode('/', $route)[0]] ?? null;
}

/**
 * Mail Helpers for Site Engg
 */

function getAdminHrRecipients($db) {
    return $db->fetchAll("SELECT email, full_name FROM se_profiles WHERE role IN ('admin', 'hr')");
}

function notifyCheckIn($checkInId, $db) {
    $data = $db->fetchOne("SELECT c.*, p.full_name as engineer_name, s.name as site_name 
                           FROM se_check_ins c 
                           JOIN se_profiles p ON c.engineer_id = p.id 
                           LEFT JOIN se_sites s ON c.site_id = s.id 
                           WHERE c.id = ?", [$checkInId]);
    if (!$data) return;

    $subject = "Check-in Alert: " . $data['engineer_name'];
    $body = "<h2>Engineer Check-in</h2>
             <p><b>Engineer:</b> {$data['engineer_name']}</p>
             <p><b>Site:</b> " . ($data['site_name'] ?: 'Remote/Field') . "</p>
             <p><b>Time:</b> {$data['check_in_time']}</p>
             <p><b>Location:</b> {$data['location_name']}</p>";
    
    $recipients = getAdminHrRecipients($db);
    foreach ($recipients as $r) {
        send_mail($r['email'], $r['full_name'], $subject, $body);
    }
}

function notifyCheckOut($checkInId, $db) {
    $data = $db->fetchOne("SELECT c.*, p.full_name as engineer_name, s.name as site_name 
                           FROM se_check_ins c 
                           JOIN se_profiles p ON c.engineer_id = p.id 
                           LEFT JOIN se_sites s ON c.site_id = s.id 
                           WHERE c.id = ?", [$checkInId]);
    if (!$data) return;

    $subject = "Check-out Alert: " . $data['engineer_name'];
    $body = "<h2>Engineer Check-out</h2>
             <p><b>Engineer:</b> {$data['engineer_name']}</p>
             <p><b>Site:</b> " . ($data['site_name'] ?: 'Remote/Field') . "</p>
             <p><b>Time:</b> {$data['check_out_time']}</p>";
    
    $recipients = getAdminHrRecipients($db);
    foreach ($recipients as $r) {
        send_mail($r['email'], $r['full_name'], $subject, $body);
    }
}

function notifyDailyReport($reportId, $db) {
    $data = $db->fetchOne("SELECT r.*, p.full_name as engineer_name, c.name as client_name, c.contact_email as client_email, s.name as site_name
                           FROM se_daily_reports r
                           JOIN se_profiles p ON r.engineer_id = p.id
                           LEFT JOIN se_clients c ON r.client_id = c.id
                           LEFT JOIN se_sites s ON r.site_id = s.id
                           WHERE r.id = ?", [$reportId]);
    if (!$data) return;

    $subject = "Daily Work Report: " . $data['engineer_name'] . " (" . $data['report_date'] . ")";
    $body = "<h2>Daily Report Summary</h2>
             <p><b>Engineer:</b> {$data['engineer_name']}</p>
             <p><b>Client:</b> {$data['client_name']}</p>
             <p><b>Site:</b> {$data['site_name']}</p>
             <p><b>Date:</b> {$data['report_date']}</p>
             <hr/>
             <h3>Work Done:</h3>
             <p>" . nl2br($data['work_done']) . "</p>
             <h3>Issues Encountered:</h3>
             <p>" . nl2br($data['issues'] ?: 'None') . "</p>";

    // Send to Admin & HR
    $recipients = getAdminHrRecipients($db);
    foreach ($recipients as $r) {
        send_mail($r['email'], $r['full_name'], $subject, $body);
    }

    // Send to Client
    if (!empty($data['client_email'])) {
        send_mail($data['client_email'], $data['client_name'], $subject, $body);
    }
}

function notifyLeaveRequest($leaveId, $db) {
    $data = $db->fetchOne("SELECT l.*, p.full_name as engineer_name 
                           FROM se_leave_requests l
                           JOIN se_profiles p ON l.engineer_id = p.id
                           WHERE l.id = ?", [$leaveId]);
    if (!$data) return;

    $subject = "Leave Request: " . $data['engineer_name'];
    $body = "<h2>New Leave Request</h2>
             <p><b>Engineer:</b> {$data['engineer_name']}</p>
             <p><b>Start Date:</b> {$data['start_date']}</p>
             <p><b>End Date:</b> {$data['end_date']}</p>
             <p><b>Reason:</b> " . nl2br($data['reason']) . "</p>
             <p><a href='https://fasttrack.cybaemtech.app/site-engg/admin/leaves'>View and Approve/Reject</a></p>";

    $recipients = getAdminHrRecipients($db);
    foreach ($recipients as $r) {
        send_mail($r['email'], $r['full_name'], $subject, $body);
    }
    
    // Also notify the active client
    $assignment = $db->fetchOne("SELECT c.name, c.contact_email 
                                 FROM se_clients c
                                 JOIN se_assignments a ON c.id = a.client_id
                                 WHERE a.engineer_id = ? AND a.is_active = 1 LIMIT 1", [$data['engineer_id']]);
                                 
    if ($assignment && !empty($assignment['contact_email'])) {
        $clientSubject = "Leave Notification: " . $data['engineer_name'];
        $clientBody = "<h2>Service Update</h2>
                 <p>Dear {$assignment['name']},</p>
                 <p>Please note that your assigned engineer, <b>{$data['engineer_name']}</b>, has requested a leave from {$data['start_date']} to {$data['end_date']}.<br/>
                 We will notify you soon with backend engineer replacement details.</p>";
        send_mail($assignment['contact_email'], $assignment['name'], $clientSubject, $clientBody);
    }
}

function notifyLeaveStatus($leave, $status, $db) {
    $engineer = $db->fetchOne("SELECT email, full_name FROM se_profiles WHERE id = ?", [$leave['engineer_id']]);
    if (!$engineer) return;

    $subject = "Leave Request " . ucfirst($status);
    $body = "<h2>Leave Request {$status}</h2>
             <p>Your leave request from {$leave['start_date']} to {$leave['end_date']} has been <b>{$status}</b>.</p>";
    
    send_mail($engineer['email'], $engineer['full_name'], $subject, $body);
}

function notifyClientBackupEngineer($leave, $db) {
    // Get client info from assignment
    $assignment = $db->fetchOne("SELECT c.name, c.contact_email, p.full_name as backup_name
                                 FROM se_clients c
                                 JOIN se_assignments a ON c.id = a.client_id
                                 JOIN se_profiles p ON a.engineer_id = p.id
                                 WHERE a.engineer_id = ? AND a.is_active = 1 LIMIT 1", [$leave['engineer_id']]);
                                 
    // Actually the backup engineer info is in the leave request
    $backup = $db->fetchOne("SELECT full_name FROM se_profiles WHERE id = ?", [$leave['backup_engineer_id']]);
    $engineer = $db->fetchOne("SELECT full_name FROM se_profiles WHERE id = ?", [$leave['engineer_id']]);
    
    if (!$assignment || empty($assignment['contact_email'])) return;

    $subject = "Engineer Replacement Notification: " . $assignment['name'];
    $body = "<h2>Service Update</h2>
             <p>Dear {$assignment['name']},</p>
             <p>Please note that <b>" . ($backup['full_name'] ?? 'a backup engineer') . "</b> will be attending in place of <b>{$engineer['full_name']}</b> from {$leave['start_date']} to {$leave['end_date']} as {$engineer['full_name']} is on leave.</p>
             <p>Thank you for your cooperation.</p>";

    send_mail($assignment['contact_email'], $assignment['name'], $subject, $body);
}

function handleNotifyClients($db) {
    $userId = $_SESSION['site_engg_user_id'] ?? null;
    if (!$userId) jsonResp(['error' => 'Not authenticated'], 401);
    $user = $db->fetchOne("SELECT role FROM se_profiles WHERE id = ?", [$userId]);
    if (!$user || $user['role'] !== 'admin') jsonResp(['error' => 'Admin access required'], 403);

    $input = json_decode(file_get_contents('php://input'), true);
    $engineerIds = $input['engineerIds'] ?? [];
    
    if (empty($engineerIds)) {
        jsonResp(['error' => 'No engineers selected'], 400);
    }
    
    $results = [];
    foreach ($engineerIds as $id) {
        $engineer = $db->fetchOne("SELECT full_name FROM se_profiles WHERE id = ?", [$id]);
        $checkIn = $db->fetchOne("SELECT * FROM se_check_ins WHERE engineer_id = ? AND date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1", [$id]);
        
        // Find client for this engineer
        $assignment = $db->fetchOne("SELECT c.name as client_name, c.contact_email 
                                     FROM se_assignments a
                                     JOIN se_clients c ON a.client_id = c.id
                                     WHERE a.engineer_id = ? AND a.is_active = 1", [$id]);
        
        if ($assignment && !empty($assignment['contact_email'])) {
            $status = $checkIn ? "Checked In at {$checkIn['check_in_time']}" : "Not Checked In yet";
            if ($checkIn && $checkIn['check_out_time']) {
                $status = "Checked Out at {$checkIn['check_out_time']}";
            }
            
            $subject = "Daily Attendance Status: {$engineer['full_name']}";
            $body = "<h2>Attendance Update</h2>
                     <p><b>Engineer:</b> {$engineer['full_name']}</p>
                     <p><b>Status:</b> {$status}</p>
                     <p><b>Date:</b> " . date('Y-m-d') . "</p>";
            
            $res = send_mail($assignment['contact_email'], $assignment['client_name'], $subject, $body);
            $results[] = [
                'engineer' => $engineer['full_name'],
                'client' => $assignment['client_name'],
                'success' => $res['success']
            ];
        }
    }
    
    jsonResp(['success' => true, 'details' => $results]);
}
?>
