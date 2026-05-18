<?php
/**
 * In-app Notification Helper
 */
require_once __DIR__ . '/../config/database.php';

/**
 * Create a new notification in the database
 */
function createNotification($userId, $type, $title, $message, $targetId = null, $targetUrl = null) {
    try {
        $db = getDb();
        $db->insert('notifications', [
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'target_id' => $targetId,
            'target_url' => $targetUrl,
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        return true;
    } catch (Exception $e) {
        error_log("Failed to create notification: " . $e->getMessage());
        return false;
    }
}

/**
 * Notify all admins about an event
 */
function notifyAdmins($type, $title, $message, $targetId = null, $targetUrl = null) {
    try {
        $db = getDb();
        $admins = $db->fetchAll("SELECT id FROM users WHERE FIND_IN_SET('admin', role)");
        foreach ($admins as $admin) {
            createNotification($admin['id'], $type, $title, $message, $targetId, $targetUrl);
        }
    } catch (Exception $e) {
        error_log("Failed to notify admins: " . $e->getMessage());
    }
}
?>
