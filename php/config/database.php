<?php
/**
 * Database Configuration for cPanel Hosting
 * IT Helpdesk Portal - MySQL Connection
 */

// Load .env file manually if Dotenv is not available
if (!function_exists('loadEnv')) {
    function loadEnv($path) {
        if (!file_exists($path)) return false;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) < 2) continue;
            $name = trim($parts[0]);
            $value = trim($parts[1]);
            // Remove quotes if present
            $value = trim($value, '"\'');
            if (!isset($_SERVER[$name]) && !isset($_ENV[$name])) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
        return true;
    }
}

// Robust .env discovery: Check current, parent, and root paths
$envPaths = [
    __DIR__ . '/../../.env',           // From php/config/
    dirname(__DIR__, 2) . '/.env',     // Standard
    'C:/inetpub/wwwroot/ITSM 25Feb-16-00/.env' // Absolute fallback
];
foreach ($envPaths as $path) {
    if (loadEnv($path)) break;
}

// Database configuration - Local MySQL (itsm_helpdesk)
define('DB_HOST', '127.0.0.1'); // Local MySQL server
define('DB_NAME', 'itsm_helpdesk'); // Local database name
define('DB_USER', 'root'); // Local MySQL username
define('DB_PASS', ''); // Local MySQL password (empty for default WAMP/XAMPP)
define('DB_CHARSET', 'utf8mb4');

// Application configuration
define('APP_NAME', 'IT Helpdesk Portal');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', false); // Set to false in production

// Session configuration
define('SESSION_LIFETIME', 86400); // 24 hours
define('SESSION_NAME', 'ITSM_SESSION');

// Security
define('BCRYPT_COST', 10);
define('CSRF_TOKEN_NAME', '_token');

// File upload configuration
define('UPLOAD_MAX_SIZE', 10485760); // 10MB
define('UPLOAD_ALLOWED_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']);
define('UPLOAD_PATH', '../uploads/');

// Global settings
date_default_timezone_set('Asia/Kolkata');

/**
 * Database Connection Class
 */
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . ", time_zone = '+05:30'"
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            die("Database connection failed. Please contact administrator.");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage() . " SQL: " . $sql . " Params: " . json_encode($params));
            // For debugging: include more specific error information
            throw new Exception("Database query failed: " . $e->getMessage());
        }
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
    
    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    public function insert($table, $data) {
        $columns = implode(',', array_keys($data));
        
        // Use positional parameters (?) instead of named parameters for cPanel compatibility
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        
        $sql = "INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, array_values($data)); // Pass values as indexed array for positional parameters
        
        return $this->connection->lastInsertId();
    }
    
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            $setClause[] = "`{$key}` = ?";
            $params[] = $value;
        }
        $setClause = implode(', ', $setClause);
        
        $whereClause = $where;
        $finalWhereParams = $whereParams;
        
        if (is_array($where)) {
            $whereParts = [];
            $finalWhereParams = [];
            foreach ($where as $key => $value) {
                $whereParts[] = "`{$key}` = ?";
                $finalWhereParams[] = $value;
            }
            $whereClause = implode(' AND ', $whereParts);
        }
        
        $sql = "UPDATE `{$table}` SET {$setClause} WHERE {$whereClause}";
        $allParams = array_merge($params, $finalWhereParams);
        
        return $this->query($sql, $allParams);
    }
    
    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM `{$table}` WHERE {$where}";
        return $this->query($sql, $params);
    }
    
    public function count($table, $where = '1=1', $params = []) {
        $sql = "SELECT COUNT(*) as count FROM `{$table}` WHERE {$where}";
        $result = $this->fetchOne($sql, $params);
        return (int)$result['count'];
    }
}

/**
 * Utility Functions
 */
function getDb() {
    return Database::getInstance();
}

function generateCsrfToken() {
    if (!isset($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

function verifyCsrfToken($token) {
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// --- FIX: Remove duplicate jsonResponse and sanitizeInput (handled in helpers/auth.php) ---
// function jsonResponse($data, $statusCode = 200) { ... }
// function sanitizeInput($input) { ... }
// --- END FIX ---

// --- FIX: Remove duplicate requireAuth and requireRole (handled in helpers/auth.php) ---
// function requireAuth() { ... }
// function requireRole($allowedRoles) { ... }
// --- END FIX ---

// Initialize database connection
$db = getDb();
?>