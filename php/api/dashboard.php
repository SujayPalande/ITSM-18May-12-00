<?php
/**
 * Dashboard API Endpoints
 * IT Helpdesk Portal - PHP Backend
 */

require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/auth.php';
if (function_exists('initializeSession')) { initializeSession(); }

require_once '../config/database.php';

// Enable CORS for frontend - Dynamic Origin for IIS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

requireAuth();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetDashboardStats();
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Dashboard API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal server error'], 500);
}

function handleGetDashboardStats() {
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Base stats query
    $statsQuery = "
        SELECT 
            COUNT(CASE WHEN status = 'open' THEN 1 END) as openTickets,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgressTickets,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolvedTickets,
            COUNT(CASE WHEN status = 'closed' THEN 1 END) as closedTickets,
            COUNT(CASE WHEN assigned_to_id IS NULL THEN 1 END) as unassignedTickets,
            COUNT(*) as totalTickets,
            AVG(CASE WHEN status IN ('resolved', 'closed') 
                THEN TIMESTAMPDIFF(HOUR, created_at, updated_at)
                END) as avgResolutionHours
        FROM tickets
        WHERE 1=1
    ";
    
    $params = [];
    $isAdmin = userHasRole($userRole, 'admin');
    $isAgent = userHasRole($userRole, 'agent');
    
    // Filter stats based on user role
    if (!$isAdmin && !$isAgent) {
        // Regular user only sees their own tickets
        $statsQuery .= " AND created_by_id = :user_id";
        $params['user_id'] = $userId;
    } elseif ($isAgent && !$isAdmin) {
        $statsQuery .= " AND (assigned_to_id = :user_id OR created_by_id = :user_id)";
        $params['user_id'] = $userId;
    }
    // Admin sees all tickets (no additional filter)
    
    $stats = $db->fetchOne($statsQuery, $params);
    
    // Calculate additional metrics
    $avgResponseTime = $stats['avgResolutionHours'] ? round($stats['avgResolutionHours'], 1) . ' hours' : 'N/A';
    
    // Calculate SLA compliance (assuming 24 hour SLA for high priority, 72 hours for others)
    $slaQuery = "
        SELECT 
            COUNT(*) as total_resolved,
            COUNT(CASE 
                WHEN priority = 'high' AND TIMESTAMPDIFF(HOUR, created_at, updated_at) <= 24 THEN 1
                WHEN priority != 'high' AND TIMESTAMPDIFF(HOUR, created_at, updated_at) <= 72 THEN 1
                END) as sla_met
        FROM tickets 
        WHERE status IN ('resolved', 'closed')
    ";
    
    if (!$isAdmin && !$isAgent) {
        $slaQuery .= " AND created_by_id = :user_id";
    } elseif ($isAgent && !$isAdmin) {
        $slaQuery .= " AND (assigned_to_id = :user_id OR created_by_id = :user_id)";
    }
    
    $slaStats = $db->fetchOne($slaQuery, $params);
    $slaComplianceRate = $slaStats['total_resolved'] > 0 
        ? round(($slaStats['sla_met'] / $slaStats['total_resolved']) * 100, 1) . '%'
        : 'N/A';
    
    // Get recent activity
    $recentActivityQuery = "
        SELECT 
            t.id,
            t.title,
            t.status,
            t.priority,
            t.updated_at,
            u.name as updated_by_name,
            'ticket_update' as activity_type
        FROM tickets t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE 1=1
    ";
    
    if (!$isAdmin && !$isAgent) {
        $recentActivityQuery .= " AND t.created_by_id = :user_id";
    } elseif ($isAgent && !$isAdmin) {
        $recentActivityQuery .= " AND (t.assigned_to_id = :user_id OR t.created_by_id = :user_id)";
    }
    
    $recentActivityQuery .= " ORDER BY t.updated_at DESC LIMIT 10";
    
    $recentActivity = $db->fetchAll($recentActivityQuery, $params);
    
    // Get priority distribution
    $priorityQuery = "
        SELECT 
            priority,
            COUNT(*) as count
        FROM tickets 
        WHERE status NOT IN ('resolved', 'closed')
    ";
    
    if (!$isAdmin && !$isAgent) {
        $priorityQuery .= " AND created_by_id = :user_id";
    } elseif ($isAgent && !$isAdmin) {
        $priorityQuery .= " AND (assigned_to_id = :user_id OR created_by_id = :user_id)";
    }
    
    $priorityQuery .= " GROUP BY priority";
    
    $priorityDistribution = $db->fetchAll($priorityQuery, $params);
    
    // Get category distribution
    $categoryQuery = "
        SELECT 
            c.name as category_name,
            COUNT(t.id) as count
        FROM categories c
        LEFT JOIN tickets t ON c.id = t.category_id
        WHERE c.parent_id IS NULL
    ";
    
    if (!$isAdmin && !$isAgent) {
        $categoryQuery .= " AND (t.id IS NULL OR t.created_by_id = :user_id)";
    } elseif ($isAgent && !$isAdmin) {
        $categoryQuery .= " AND (t.id IS NULL OR t.assigned_to_id = :user_id OR t.created_by_id = :user_id)";
    }
    
    $categoryQuery .= " GROUP BY c.id, c.name ORDER BY count DESC";
    
    $categoryDistribution = $db->fetchAll($categoryQuery, $params);
    
    $response = [
        'openTickets' => (int)$stats['openTickets'],
        'inProgressTickets' => (int)$stats['inProgressTickets'], 
        'resolvedTickets' => (int)$stats['resolvedTickets'],
        'closedTickets' => (int)$stats['closedTickets'],
        'unassignedTickets' => (int)$stats['unassignedTickets'],
        'totalTickets' => (int)$stats['totalTickets'],
        'avgResponseTime' => $avgResponseTime,
        'slaComplianceRate' => $slaComplianceRate,
        'recentActivity' => $recentActivity,
        'priorityDistribution' => $priorityDistribution,
        'categoryDistribution' => $categoryDistribution
    ];
    
    jsonResponse($response);
}
?>