<?php
/**
 * Companies API for fetching list of companies
 * Accessible by all authenticated users
 */

header('Content-Type: application/json');

// Enable CORS for frontend - Dynamic Origin for IIS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Vary: Origin');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session and check authentication
$sessionConfigPath = __DIR__ . '/../config/session.php';
if (file_exists($sessionConfigPath)) {
    require_once $sessionConfigPath;
    initializeSession();
} else {
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
    }
}

// Include database connection
require_once __DIR__ . '/../config/database.php';

// Get database instance
$db = getDb();

// Check if user is authenticated
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit();
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Fetch companies from multiple sources
        $allCompanies = [];
        
        // Source 1: From tickets table
        $sql1 = "
            SELECT DISTINCT company_name 
            FROM tickets 
            WHERE company_name IS NOT NULL 
              AND company_name != ''
              AND TRIM(company_name) != ''
        ";
        $ticketCompanies = $db->fetchAll($sql1);
        foreach ($ticketCompanies as $row) {
            if (isset($row['company_name']) && !empty(trim($row['company_name']))) {
                $allCompanies[] = trim($row['company_name']);
            }
        }
        
        // Source 2: From users table who created tickets
        $sql2 = "
            SELECT DISTINCT u.company_name
            FROM users u
            INNER JOIN tickets t ON t.created_by_id = u.id
            WHERE u.company_name IS NOT NULL 
              AND u.company_name != ''
              AND TRIM(u.company_name) != ''
        ";
        $userCompanies = $db->fetchAll($sql2);
        foreach ($userCompanies as $row) {
            if (isset($row['company_name']) && !empty(trim($row['company_name']))) {
                $allCompanies[] = trim($row['company_name']);
            }
        }
        
        // Source 3: From allowed_domains table (master list)
        $sql3 = "
            SELECT DISTINCT company_name 
            FROM allowed_domains 
            WHERE is_active = 1 
              AND company_name IS NOT NULL 
              AND company_name != ''
              AND TRIM(company_name) != ''
        ";
        $allowedCompanies = $db->fetchAll($sql3);
        foreach ($allowedCompanies as $row) {
            if (isset($row['company_name']) && !empty(trim($row['company_name']))) {
                $allCompanies[] = trim($row['company_name']);
            }
        }
        
        // Smart deduplication algorithm
        $deduplicatedCompanies = deduplicateCompanyNames($allCompanies);
        
        // Sort alphabetically
        sort($deduplicatedCompanies, SORT_STRING | SORT_FLAG_CASE);
        
        echo json_encode(array_values($deduplicatedCompanies));
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log("Companies API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Smart company name deduplication
 * Merges similar company names (case-insensitive, partial matching)
 * Returns the most descriptive/canonical version of each company
 */
function deduplicateCompanyNames($companies) {
    if (empty($companies)) {
        return [];
    }
    
    // Remove exact duplicates first (case-insensitive)
    $uniqueCompanies = [];
    $seenLowercase = [];
    
    foreach ($companies as $company) {
        $lowercase = mb_strtolower(trim($company));
        if (!isset($seenLowercase[$lowercase])) {
            $uniqueCompanies[] = $company;
            $seenLowercase[$lowercase] = true;
        }
    }
    
    // Group similar companies (where one is a substring of another)
    $groups = [];
    $processed = [];
    
    foreach ($uniqueCompanies as $i => $company1) {
        if (isset($processed[$i])) continue;
        
        $group = [$company1];
        $processed[$i] = true;
        
        foreach ($uniqueCompanies as $j => $company2) {
            if ($i === $j || isset($processed[$j])) continue;
            
            $lower1 = mb_strtolower(trim($company1));
            $lower2 = mb_strtolower(trim($company2));
            
            // Check if one is a substring of the other
            if (strpos($lower1, $lower2) !== false || strpos($lower2, $lower1) !== false) {
                $group[] = $company2;
                $processed[$j] = true;
            }
        }
        
        $groups[] = $group;
    }
    
    // For each group, select the most descriptive name (usually the longest)
    $result = [];
    foreach ($groups as $group) {
        if (count($group) === 1) {
            $result[] = $group[0];
        } else {
            // Sort by length descending, and select the longest (most descriptive)
            usort($group, function($a, $b) {
                return strlen($b) - strlen($a);
            });
            $result[] = $group[0];
        }
    }
    
    return $result;
}
?>
