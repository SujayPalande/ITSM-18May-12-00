<?php
/**
 * Domains API for managing allowed email domains
 * Only accessible by admins and agents
 */

header('Content-Type: application/json');
// Enable CORS for frontend - Dynamic Origin for IIS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session and check authentication
// Include shared session configuration with fallback
$sessionConfigPath = __DIR__ . '/../config/session.php';
if (file_exists($sessionConfigPath)) {
    require_once $sessionConfigPath;
    initializeSession();
} else {
    // Fallback session initialization if config file doesn't exist
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
                   || $_SERVER['SERVER_PORT'] == 443
                   || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        if ($isHttps) {
            ini_set('session.cookie_secure', 1);
            ini_set('session.cookie_samesite', 'None');
        }
        ini_set('session.use_strict_mode', 1);
        ini_set('session.name', 'ITSM_SESSION');
        session_start();
        error_log("Using fallback session initialization in domains.php");
    }
}

// Include database connection
require_once __DIR__ . '/../config/database.php';

// Get database instance
$db = getDb();

// Check if user is authenticated and has proper role
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit();
}

// Check if user has permission (admin or agent only) - support multi-role strings like 'admin,agent'
$userRoles = array_map('trim', explode(',', $_SESSION['role']));

// Allow POST requests (creating new company/domain) for all authenticated users
// For other methods (GET, PUT, DELETE), restrict to admin and agent
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && !array_intersect($userRoles, ['admin', 'agent'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions. Admin or agent role required.']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];
$pathParts = explode('/', trim(parse_url($path, PHP_URL_PATH), '/'));

// Extract domain ID from URL if present
$domainId = null;

// Method 1: Check URL path for domain ID (e.g., /domains.php/123)
if (count($pathParts) > 0 && is_numeric(end($pathParts))) {
    $domainId = intval(end($pathParts));
}

// Method 2: Check query parameters for domain ID (e.g., ?id=123)
if (!$domainId && isset($_GET['id']) && is_numeric($_GET['id'])) {
    $domainId = intval($_GET['id']);
}

// Method 3: For PUT/DELETE requests, check request body for domain ID
if (!$domainId && in_array($method, ['PUT', 'DELETE'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && isset($input['id']) && is_numeric($input['id'])) {
        $domainId = intval($input['id']);
    }
}

// Debug logging for troubleshooting
error_log("Domains API Debug - Method: $method, Domain ID: " . ($domainId ?: 'NULL') . ", URL: $path");

try {
    switch ($method) {
        case 'GET':
            if ($domainId) {
                getDomain($db, $domainId);
            } else {
                getAllDomains($db);
            }
            break;
            
        case 'POST':
            createDomain($db);
            break;
            
        case 'PUT':
            if ($domainId) {
                updateDomain($db, $domainId);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Domain ID is required for update']);
            }
            break;
            
        case 'DELETE':
            if ($domainId) {
                deleteDomain($db, $domainId);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Domain ID is required for deletion']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    error_log("Domains API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Get all allowed domains
 */
function getAllDomains($db) {
    try {
        // Check if allowed_domains table exists
        $checkTable = $db->fetchOne("SHOW TABLES LIKE 'allowed_domains'");
        if (!$checkTable) {
            // Table doesn't exist, return empty array with helpful message
            http_response_code(200);
            echo json_encode([
                'domains' => [],
                'message' => 'Allowed domains table not found. Please run the database migration to create the table.',
                'migration_needed' => true
            ]);
            return;
        }
        
        $sql = "SELECT ad.*, u.name as created_by_name 
                FROM allowed_domains ad 
                LEFT JOIN users u ON ad.created_by_id = u.id 
                ORDER BY ad.created_at DESC";
        
        $domains = $db->fetchAll($sql);
        
        // Convert boolean values for JSON
        foreach ($domains as &$domain) {
            $domain['isActive'] = (bool)$domain['is_active'];
            unset($domain['is_active']);
        }
        
        echo json_encode($domains);
    } catch (Exception $e) {
        error_log("Get domains error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch domains']);
    }
}

/**
 * Get single domain by ID
 */
function getDomain($db, $domainId) {
    try {
        $sql = "SELECT ad.*, u.name as created_by_name 
                FROM allowed_domains ad 
                LEFT JOIN users u ON ad.created_by_id = u.id 
                WHERE ad.id = ?";
        
        $domain = $db->fetchOne($sql, [$domainId]);
        
        if (!$domain) {
            http_response_code(404);
            echo json_encode(['error' => 'Domain not found']);
            return;
        }
        
        $domain['isActive'] = (bool)$domain['is_active'];
        unset($domain['is_active']);
        
        echo json_encode($domain);
    } catch (Exception $e) {
        error_log("Get domain error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch domain']);
    }
}

/**
 * Create new allowed domain
 */
function createDomain($db) {
    try {
        // Check if allowed_domains table exists
        $checkTable = $db->fetchOne("SHOW TABLES LIKE 'allowed_domains'");
        if (!$checkTable) {
            http_response_code(500);
            echo json_encode([
                'error' => 'Database not ready. The allowed_domains table does not exist.',
                'message' => 'Please run the database migration to create the allowed_domains table.',
                'migration_needed' => true
            ]);
            return;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON input']);
            return;
        }
        
        // Validate required fields
        if (empty($input['domain']) || empty($input['companyName'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Domain and company name are required']);
            return;
        }
        
        // Validate domain format
        $domain = strtolower(trim($input['domain']));
        if (!filter_var("test@" . $domain, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid domain format']);
            return;
        }
        
        // Check if domain already exists
        $checkSql = "SELECT id FROM allowed_domains WHERE domain = ?";
        $existingDomain = $db->fetchOne($checkSql, [$domain]);
        
        if ($existingDomain) {
            http_response_code(409);
            echo json_encode(['error' => 'Domain already exists']);
            return;
        }
        
        // Insert new domain
        $domainData = [
            'domain' => $domain,
            'company_name' => trim($input['companyName']),
            'description' => $input['description'] ?? null,
            'created_by_id' => $_SESSION['user_id']
        ];
        
        $newDomainId = $db->insert('allowed_domains', $domainData);
        
        // Fetch and return the created domain
        getDomain($db, $newDomainId);
        
    } catch (Exception $e) {
        error_log("Create domain error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create domain']);
    }
}

/**
 * Update existing domain
 */
function updateDomain($db, $domainId) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON input']);
            return;
        }
        
        // Check if domain exists
        $checkSql = "SELECT id FROM allowed_domains WHERE id = ?";
        $existingDomain = $db->fetchOne($checkSql, [$domainId]);
        
        if (!$existingDomain) {
            http_response_code(404);
            echo json_encode(['error' => 'Domain not found']);
            return;
        }
        
        $updates = [];
        $params = [];
        
        // Build dynamic update data
        if (isset($input['domain'])) {
            $domain = strtolower(trim($input['domain']));
            if (!filter_var("test@" . $domain, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid domain format']);
                return;
            }
            
            // Check if new domain already exists (excluding current domain)
            $checkSql = "SELECT id FROM allowed_domains WHERE domain = ? AND id != ?";
            $duplicateDomain = $db->fetchOne($checkSql, [$domain, $domainId]);
            
            if ($duplicateDomain) {
                http_response_code(409);
                echo json_encode(['error' => 'Domain already exists']);
                return;
            }
            
            $updates['domain'] = $domain;
        }
        
        if (isset($input['companyName'])) {
            $updates['company_name'] = trim($input['companyName']);
        }
        
        if (isset($input['description'])) {
            $updates['description'] = $input['description'];
        }
        
        if (isset($input['isActive'])) {
            $updates['is_active'] = $input['isActive'] ? 1 : 0;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            return;
        }
        
        $updates['updated_at'] = date('Y-m-d H:i:s');
        
        $result = $db->update('allowed_domains', $updates, 'id = ?', [$domainId]);
        
        if ($result) {
            // Return updated domain
            getDomain($db, $domainId);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update domain']);
        }
        
    } catch (Exception $e) {
        error_log("Update domain error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update domain']);
    }
}

/**
 * Delete domain
 */
function deleteDomain($db, $domainId) {
    try {
        // Check if domain exists
        $checkSql = "SELECT id FROM allowed_domains WHERE id = ?";
        $existingDomain = $db->fetchOne($checkSql, [$domainId]);
        
        if (!$existingDomain) {
            http_response_code(404);
            echo json_encode(['error' => 'Domain not found']);
            return;
        }
        
        // Delete the domain
        $result = $db->delete('allowed_domains', 'id = ?', [$domainId]);
        
        if ($result) {
            echo json_encode(['message' => 'Domain deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete domain']);
        }
        
    } catch (Exception $e) {
        error_log("Delete domain error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete domain: ' . $e->getMessage()]);
    }
}

/**
 * Check if email domain is allowed (public function for registration)
 */
function isDomainAllowed($db, $email) {
    try {
        $domain = strtolower(substr(strrchr($email, "@"), 1));
        
        $sql = "SELECT COUNT(*) as count FROM allowed_domains WHERE domain = ? AND is_active = 1";
        $result = $db->fetchOne($sql, [$domain]);
        
        return $result && $result['count'] > 0;
    } catch (Exception $e) {
        error_log("Check domain error: " . $e->getMessage());
        return false;
    }
}
?>