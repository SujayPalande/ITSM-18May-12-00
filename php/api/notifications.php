<?php
/**
 * Notifications API Endpoints
 */

require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/auth.php';
if (function_exists('initializeSession')) { initializeSession(); }

require_once '../config/database.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    requireAuth();
    $db = getDb();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    $userId = $_SESSION['user_id'] ?? 0;
    
    if (!$userId) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    if ($method === 'GET') {
        // Fetch unread count
        if ($action === 'unread_count') {
            $sql = "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0";
            $count = $db->fetchOne($sql, [$userId])['count'] ?? 0;
            jsonResponse(['count' => (int)$count]);
        } 
        // Fetch all notifications
        else {
            error_log("Notifications API: Fetching for user {$userId}");
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $sql = "SELECT id, type, title, message, target_id, target_url, is_read, created_at 
                    FROM notifications 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?";
            $notifications = $db->fetchAll($sql, [$userId, $limit]);
            
            // Format dates
            $notifications = array_map(function($n) {
                // Ensure is_read is boolean
                $n['is_read'] = (bool)$n['is_read'];
                // Add relative time formatting
                $n['time_ago'] = getRelativeTime($n['created_at']);
                return $n;
            }, $notifications);
            
            jsonResponse(['data' => $notifications]);
        }
    } elseif ($method === 'POST') {
        // Mark as read
        if ($action === 'mark_read') {
            $input = json_decode(file_get_contents('php://input'), true);
            $notificationId = $input['id'] ?? null;
            
            if ($notificationId === 'all') {
                $sql = "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0";
                $updated = $db->query($sql, [$userId]);
            } elseif (is_numeric($notificationId)) {
                $sql = "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?";
                $updated = $db->query($sql, [$userId, $notificationId]);
            } else {
                jsonResponse(['error' => 'Invalid notification ID'], 400);
            }
            
            jsonResponse(['success' => true]);
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
    } else {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Throwable $e) {
    error_log("Notifications API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error: ' . $e->getMessage()], 500);
}

function getRelativeTime($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;
    
    if ($diff < 60) return "Just now";
    if ($diff < 3600) return floor($diff / 60) . " mins ago";
    if ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . ($hours == 1 ? " hr" : " hrs") . " ago";
    }
    if ($diff < 172800) return "Yesterday";
    return date("M j, Y", $time);
}
