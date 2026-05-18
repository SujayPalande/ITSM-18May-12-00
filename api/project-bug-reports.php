<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Resolve database config path like other php/api endpoints

// Try both config paths for database.php
$configPath1 = dirname(__DIR__) . '/config/database.php';
$configPath2 = __DIR__ . '/../config/database.php';
$configPath3 = dirname(__DIR__, 2) . '/php/config/database.php';
if (file_exists($configPath1)) {
    require_once $configPath1;
} elseif (file_exists($configPath2)) {
    require_once $configPath2;
} elseif (file_exists($configPath3)) {
    require_once $configPath3;
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database config not found.']);
    exit;
}

// Get the database connection from the config
if (function_exists('getDb')) {
    $dbObj = getDb();
    $db = $dbObj->getConnection();
} else if (isset($db)) {
    // fallback if $db is already set
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not initialized.']);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $screenshotPath = null;

    // Handle file upload if present
    if (isset($_FILES['screenshot']) && $_FILES['screenshot']['error'] === UPLOAD_ERR_OK) {
        // Save uploads to the central uploads folder (two levels up from php/api)
        $uploadDir = __DIR__ . '/../../uploads/';
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        $maxFileSize = 5 * 1024 * 1024; // 5MB

        $fileType = $_FILES['screenshot']['type'];
        $fileSize = $_FILES['screenshot']['size'];

        if (!in_array($fileType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, and GIF are allowed.']);
            exit;
        }

        if ($fileSize > $maxFileSize) {
            http_response_code(400);
            echo json_encode(['error' => 'File too large. Maximum size is 5MB.']);
            exit;
        }

        $fileExtension = pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION);
        $fileName = 'bug_' . time() . '_' . uniqid() . '.' . $fileExtension;
        $filePath = $uploadDir . $fileName;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (move_uploaded_file($_FILES['screenshot']['tmp_name'], $filePath)) {
            // store a web-relative path (relative to site root)
            $screenshotPath = 'uploads/' . $fileName;
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to upload screenshot.']);
            exit;
        }
    }

    // Handle form data or JSON
    if (!empty($_POST)) {
        $comment = isset($_POST['comment']) ? trim($_POST['comment']) : '';
        $created_by = isset($_POST['created_by']) ? intval($_POST['created_by']) : null;
        $resolutionStatus = isset($_POST['resolutionStatus']) ? $_POST['resolutionStatus'] : 'not-resolved';
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $comment = isset($input['comment']) ? trim($input['comment']) : '';
        $created_by = isset($input['created_by']) ? intval($input['created_by']) : null;
        $resolutionStatus = isset($input['resolutionStatus']) ? $input['resolutionStatus'] : 'not-resolved';
    }

    if ($comment === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Comment is required.']);
        exit;
    }

    try {
        // Set timezone to Asia/Kolkata for correct created_at
        date_default_timezone_set('Asia/Kolkata');
        $createdAt = date('Y-m-d H:i:s');
        // Use the Database class insert method if available
        if (isset($dbObj) && method_exists($dbObj, 'insert')) {
            $reportId = $dbObj->insert('project_bug_reports', [
                'comment' => $comment,
                'created_by' => $created_by,
                'resolution_status' => $resolutionStatus,
                'screenshot_path' => $screenshotPath,
                'created_at' => $createdAt
            ]);
            echo json_encode([
                'message' => 'Bug report submitted successfully.',
                'id' => $reportId,
                'screenshot_path' => $screenshotPath
            ]);
        } else {
            // fallback to PDO
            $stmt = $db->prepare("INSERT INTO project_bug_reports (comment, created_by, resolution_status, screenshot_path, created_at) VALUES (?, ?, ?, ?, ?)");
            if ($stmt->execute([$comment, $created_by, $resolutionStatus, $screenshotPath, $createdAt])) {
                $reportId = $db->lastInsertId();
                echo json_encode([
                    'message' => 'Bug report submitted successfully.',
                    'id' => $reportId,
                    'screenshot_path' => $screenshotPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Database error.']);
            }
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Exception: ' . $e->getMessage()]);
    }

} elseif ($method === 'GET') {

    try {
        if (isset($dbObj) && method_exists($dbObj, 'fetchAll')) {
            $reports = $dbObj->fetchAll("SELECT id, comment, created_by, created_at, resolution_status, screenshot_path FROM project_bug_reports ORDER BY created_at DESC");
            echo json_encode($reports);
        } else {
            $stmt = $db->prepare("SELECT id, comment, created_by, created_at, resolution_status, screenshot_path FROM project_bug_reports ORDER BY created_at DESC");
            $stmt->execute();
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($reports);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Exception: ' . $e->getMessage()]);
    }

} elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? intval($input['id']) : null;
    $userId = isset($input['user_id']) ? intval($input['user_id']) : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for delete']);
        exit;
    }

    try {
        $stmt = $db->prepare("SELECT created_by, screenshot_path FROM project_bug_reports WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$report) {
            http_response_code(404);
            echo json_encode(['error' => 'Bug report not found']);
            exit;
        }

        if ($report['created_by'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only delete your own bug reports']);
            exit;
        }

        $stmt = $db->prepare("DELETE FROM project_bug_reports WHERE id = ?");
        $stmt->execute([$id]);

        if ($report['screenshot_path']) {
            $fsPath = __DIR__ . '/../../' . $report['screenshot_path'];
            if (file_exists($fsPath)) {
                @unlink($fsPath);
            }
        }

        echo json_encode(['message' => 'Deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Exception: ' . $e->getMessage()]);
    }

} elseif ($method === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? intval($input['id']) : null;
    $userId = isset($input['user_id']) ? intval($input['user_id']) : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for update']);
        exit;
    }

    try {
        $stmt = $db->prepare("SELECT created_by FROM project_bug_reports WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$report) {
            http_response_code(404);
            echo json_encode(['error' => 'Bug report not found']);
            exit;
        }

        if ($report['created_by'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only edit your own bug reports']);
            exit;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Exception: ' . $e->getMessage()]);
        exit;
    }

    $updateFields = [];
    $params = [];

    if (isset($input['comment']) && trim($input['comment']) !== '') {
        $updateFields[] = "comment = ?";
        $params[] = trim($input['comment']);
    }

    if (isset($input['resolution_status'])) {
        $updateFields[] = "resolution_status = ?";
        $params[] = $input['resolution_status'];
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit;
    }

    $params[] = $id;

    try {
        $sql = "UPDATE project_bug_reports SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['message' => 'Updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Exception: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
}

?>
