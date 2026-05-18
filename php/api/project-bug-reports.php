<?php
/**
 * Project Bug Reports API
 * Handles submission and management of project feedback/bugs
 */

require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/auth.php';
if (function_exists('initializeSession')) { initializeSession(); }

require_once '../config/database.php';

// Enable CORS for frontend - Dynamic Origin for IIS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDb();
    requireAuth();

    switch ($method) {
        case 'GET':
            handleGetReports($db);
            break;
        case 'POST':
            handleCreateReport($db);
            break;
        case 'PATCH':
            $json = json_decode(file_get_contents('php://input'), true);
            handleUpdateReport($db, $json);
            break;
        case 'DELETE':
            handleDeleteReport($db);
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Throwable $e) {
    error_log("Bug Reports API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function handleGetReports($db) {
    $userRole = $_SESSION['user_role'] ?? 'user';
    $userId = $_SESSION['user_id'];
    $isAdminOrAgent = userHasRole($userRole, ['admin', 'agent']);
    
    if ($isAdminOrAgent) {
        $sql = "SELECT * FROM project_bug_reports ORDER BY created_at DESC";
        $reports = $db->fetchAll($sql);
    } else {
        $sql = "SELECT * FROM project_bug_reports WHERE created_by = ? ORDER BY created_at DESC";
        $reports = $db->fetchAll($sql, [$userId]);
    }
    
    // Transform data for frontend if needed
    $transformed = array_map(function($r) {
        return [
            'id' => (int)$r['id'],
            'comment' => $r['comment'],
            'created_by' => (int)$r['created_by'],
            'resolution_status' => $r['resolution_status'] ?? 'not-resolved',
            'screenshot_path' => $r['screenshot_path'],
            'created_at' => $r['created_at']
        ];
    }, $reports);
    
    jsonResponse($transformed);
}

function handleCreateReport($db) {
    // 1. First check if this is an update request (ID present in JSON or POST)
    $json = json_decode(file_get_contents('php://input'), true);
    if ($json && isset($json['id'])) {
        return handleUpdateReport($db, $json);
    }
    if (isset($_POST['id'])) {
        return handleUpdateReport($db, $_POST);
    }

    // 2. Otherwise, treat as new report creation
    $comment = $_POST['comment'] ?? ($json['comment'] ?? '');
    $created_by = $_POST['created_by'] ?? ($json['created_by'] ?? $_SESSION['user_id']);
    $resolution_status = $_POST['resolutionStatus'] ?? ($json['resolution_status'] ?? ($json['resolutionStatus'] ?? 'not-resolved'));
    
    if (empty($comment)) {
        jsonResponse(['error' => 'Comment is required'], 400);
    }

    $screenshot_path = null;
    if (isset($_FILES['screenshot']) && $_FILES['screenshot']['error'] === UPLOAD_ERR_OK) {
        // Use document root for reliable absolute path
        $docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? realpath(__DIR__ . '/../../'), '/\\');
        $uploadDir = $docRoot . '/uploads/bug-screenshots/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $fileExt = pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION);
        $fileName = uniqid('bug_') . '.' . $fileExt;
        $targetPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['screenshot']['tmp_name'], $targetPath)) {
            $screenshot_path = 'uploads/bug-screenshots/' . $fileName;
        }
    }


    $data = [
        'comment' => $comment,
        'created_by' => $created_by,
        'resolution_status' => $resolution_status,
        'screenshot_path' => $screenshot_path
    ];

    $id = $db->insert('project_bug_reports', $data);
    
    jsonResponse(['message' => 'Report created', 'id' => $id], 201);
}

function handleUpdateReport($db, $json = null) {
    if ($json === null) {
        $json = json_decode(file_get_contents('php://input'), true);
    }
    
    if (!$json || !isset($json['id'])) {
        jsonResponse(['error' => 'ID is required'], 400);
    }

    $id = $json['id'];
    $updateData = [];
    
    if (isset($json['comment'])) {
        $updateData['comment'] = $json['comment'];
    }
    
    if (isset($json['resolution_status'])) {
        $updateData['resolution_status'] = $json['resolution_status'];
    }

    if (empty($updateData)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }

    $db->update('project_bug_reports', $updateData, 'id = ?', [$id]);
    jsonResponse(['message' => 'Report updated']);
}

function handleDeleteReport($db) {
    $json = json_decode(file_get_contents('php://input'), true);
    if (!$json || !isset($json['id'])) {
        jsonResponse(['error' => 'ID is required'], 400);
    }

    $id = $json['id'];
    
    // Security check: only admin or creator can delete
    $report = $db->fetchOne("SELECT created_by FROM project_bug_reports WHERE id = ?", [$id]);
    if (!$report) {
        jsonResponse(['error' => 'Report not found'], 404);
    }
    
    if ($report['created_by'] != $_SESSION['user_id'] && !userHasRole($_SESSION['user_role'], 'admin')) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }

    $db->delete('project_bug_reports', 'id = ?', [$id]);
    jsonResponse(['message' => 'Report deleted']);
}

