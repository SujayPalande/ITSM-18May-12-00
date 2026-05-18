<?php
/**
 * Users API Endpoints  
 * IT Helpdesk Portal - PHP Backend
 */

// Get the correct path to database config regardless of working directory
$configPath = dirname(__DIR__) . '/config/database.php';
if (!file_exists($configPath)) {
    // Fallback for different directory structures
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;
require_once __DIR__ . '/../helpers/email_notifications.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/auth.php';

// --- FIX: Ensure session is initialized only once and before any session logic ---
if (function_exists('initializeSession')) {
    initializeSession();
}
// --- END FIX ---

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

$method = $_SERVER['REQUEST_METHOD'];

// Handle both JSON and FormData requests
$request = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    // JSON request
    $request = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    // FormData or regular POST
    $request = $_POST ?? [];
}

try {
    switch ($method) {
        case 'GET':
            handleGetUsers();
            break;
        case 'POST':
            handleCreateUser($request);
            break;
        case 'PUT':
            $userId = $_GET['id'] ?? null;
            handleUpdateUser($userId, $request);
            break;
        case 'DELETE':
            $userId = $_GET['id'] ?? null;
            handleDeleteUser($userId);
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Throwable $e) {
    error_log("Users API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("Request data: " . json_encode($request));
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function handleGetUsers() {
    requireAuth();
    
    $db = getDb();
    $currentUserId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Check if this is a simple request for dropdown (agents only)
    $roleFilter = $_GET['role'] ?? '';
    $simple = $_GET['simple'] ?? false;
    
    if ($roleFilter || $simple) {
        // Simple query for dropdowns - just return basic user info
        $sql = "SELECT id, name, email, role, department FROM users WHERE 1=1";
        $params = [];

        // Filter by role if specified. Use FIND_IN_SET to support comma-separated roles stored in DB (e.g. 'admin,agent')
        if ($roleFilter) {
            $roles = array_map('trim', explode(',', $roleFilter));
            $roleConditions = [];
            foreach ($roles as $roleItem) {
                $roleConditions[] = "FIND_IN_SET(?, role)";
                $params[] = $roleItem;
            }
            $sql .= " AND (" . implode(' OR ', $roleConditions) . ")";
        } else {
            // Default: include admins and agents (match comma-separated values)
            $sql .= " AND (FIND_IN_SET('admin', role) OR FIND_IN_SET('agent', role))";
        }

        // --- SPECIAL RESTRICTION: Sachin Jadhav (Site Engg) ---
        $currentUserName = $_SESSION['user_name'] ?? '';
        if (stripos($currentUserName, 'Sachin jadhav') !== false) {
            $sql .= " AND (company_name LIKE '%praj%' OR email LIKE '%praj%' OR name LIKE '%praj%')";
        }
        // --- END RESTRICTION ---

        $sql .= " ORDER BY name";

        $users = $db->fetchAll($sql, $params);
        
        // Return simple format for dropdowns
        $simpleUsers = array_map(function($user) {
            return [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'department' => $user['department'] ?? 'N/A'
            ];
        }, $users);
        
        // If no users found, return sample data for testing
        if (empty($simpleUsers)) {
            $simpleUsers = [
                [
                    'id' => 1,
                    'name' => 'Test Agent',
                    'email' => 'agent@test.com',
                    'role' => 'agent',
                    'department' => 'IT Support'
                ],
                [
                    'id' => 2,
                    'name' => 'Test Admin',
                    'email' => 'admin@test.com',
                    'role' => 'admin',
                    'department' => 'Administration'
                ]
            ];
        }
        
        error_log("Simple users response: " . json_encode($simpleUsers));
        jsonResponse($simpleUsers);
        return;
    }
    
    // Original complex query for user management pages
    $sql = "
        SELECT 
            id, username, name, email, role, company_name, department, 
            contact_number, designation, created_at,
            (SELECT COUNT(*) FROM tickets WHERE created_by_id = u.id) as tickets_created,
            (SELECT COUNT(*) FROM tickets WHERE assigned_to_id = u.id) as tickets_assigned
        FROM users u
        WHERE 1=1
    ";
    
    $params = [];
    
    // Regular users can only see their own profile; agents and admins can see all users
    if (!userHasRole($userRole, ['admin', 'agent'])) {
        $sql .= " AND id = ?";
        $params[] = $currentUserId;
    } else {
        // --- SPECIAL RESTRICTION: Sachin Jadhav (Site Engg) ---
        $currentUserName = $_SESSION['user_name'] ?? '';
        if (stripos($currentUserName, 'Sachin jadhav') !== false) {
            $sql .= " AND (company_name LIKE '%praj%' OR email LIKE '%praj%' OR name LIKE '%praj%' OR id = ?)";
            $params[] = $currentUserId;
        }
        // --- END RESTRICTION ---
    }
    
    $sql .= " ORDER BY role DESC, name";
    
    $users = $db->fetchAll($sql, $params);
    
    // Convert snake_case field names to camelCase for frontend compatibility
    $convertedUsers = array_map(function($user) {
        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'companyName' => $user['company_name'],
            'department' => $user['department'],
            'contactNumber' => $user['contact_number'],
            'designation' => $user['designation'],
            'createdAt' => $user['created_at'],
            'ticketsCreated' => $user['tickets_created'],
            'ticketsAssigned' => $user['tickets_assigned']
        ];
    }, $users);
    
    jsonResponse($convertedUsers);
}

function handleCreateUser($request) {
    set_time_limit(120); // Increase limit for mail sending
    requireRole(['admin', 'agent']);
    
    $username = sanitizeInput($request['username'] ?? '');
    $password = $request['password'] ?? '';
    $name = sanitizeInput($request['name'] ?? '');
    $email = sanitizeInput($request['email'] ?? '');
    $role = sanitizeInput($request['role'] ?? 'user');
    $companyName = sanitizeInput($request['companyName'] ?? '');
    $department = sanitizeInput($request['department'] ?? '');
    $contactNumber = sanitizeInput($request['contactNumber'] ?? '');
    $designation = sanitizeInput($request['designation'] ?? '');
    
    if (empty($username) || empty($password) || empty($name) || empty($email)) {
        jsonResponse(['error' => 'Username, password, name, and email are required'], 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }
    
    // Allow single role or comma-separated roles (e.g., 'admin,agent')
    $validRoles = ['admin', 'agent', 'user', 'hr', 'client', 'engineer'];
    $rolesInRequest = array_map('trim', explode(',', $role));
    foreach ($rolesInRequest as $r) {
        if (!in_array($r, $validRoles)) {
            jsonResponse(['error' => 'Invalid role: ' . $r], 400);
            return;
        }
    }
    
    $db = getDb();
    
    // Check if username or email already exists
    $existing = $db->fetchOne(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [$username, $email]
    );

    if ($existing) {
        jsonResponse(['error' => 'A user with this username or email already exists. Please use the Edit profile feature instead.'], 400);
    }
        // Create brand new user
        $hashedPassword = hashPassword($password);
        $verificationToken = bin2hex(random_bytes(32));
        $userId = $db->insert('users', [
            'username' => $username,
            'password' => $hashedPassword,
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'company_name' => $companyName,
            'department' => $department,
            'contact_number' => $contactNumber,
            'designation' => $designation,
            'verification_token' => $verificationToken,
            'is_verified' => 0
        ]);
        
        $userData = $db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
        $isExisting = false;

    // --- Unified Post-Save Logic (Email + Response) ---
    
    // Always use the latest verification token (either from existing or new)
    $token = $userData['verification_token'];
    $verificationLink = "https://itsm.cybaemtech.app/verify.php?token=$token";
    
    // Send welcome email with credentials
    $welcomeUserData = [
        'username' => $userData['username'],
        'password' => $password, // Original password (may be empty on update, handled by mailer template)
        'name' => $userData['name'],
        'email' => $userData['email'],
        'role' => $userData['role'],
        'companyName' => $userData['company_name'],
        'department' => $userData['department']
    ];
    
    require_once __DIR__ . '/../helpers/email_notifications.php';
    $mailSent = sendUserWelcomeEmail($welcomeUserData, $verificationLink);
    
    if (!$mailSent) {
        error_log("Failed to send welcome email to: " . $userData['email']);
    }

    $convertedUser = [
        'id' => $userData['id'],
        'username' => $userData['username'],
        'name' => $userData['name'],
        'email' => $userData['email'],
        'role' => $userData['role'],
        'companyName' => $userData['company_name'],
        'department' => $userData['department'],
        'contactNumber' => $userData['contact_number'],
        'designation' => $userData['designation'],
        'createdAt' => $userData['created_at'],
        'isVerified' => $userData['is_verified']
    ];
    
    // Notify admins
    try {
        $admins = $db->fetchAll("SELECT id, name, email FROM users WHERE FIND_IN_SET('admin', role)");
        foreach ($admins as $admin) {
            notifyAdminUserManagement($isExisting ? 'updated' : 'created', $convertedUser, $admin['email']);
        }
    } catch (Exception $e) {
        error_log("Failed to send user management notifications: " . $e->getMessage());
    }

    jsonResponse($convertedUser, $isExisting ? 200 : 201);
    return;
}


function handleUpdateUser($userId, $request) {
    set_time_limit(30);
    requireAuth(); // Allow any authenticated user (they can update their own profile)

    if (!$userId) {
        jsonResponse(['error' => 'User ID is required'], 400);
    }

    $currentUserId = $_SESSION['user_id'];
    $currentUserRole = $_SESSION['user_role'];
    $db = getDb();

    // Check if user exists
    $user = $db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }

    // Permission check: users can update their own profile; admin/agent can update anyone
    $roleArr = array_map('trim', explode(',', $currentUserRole));
    $isAdminOrAgent = !empty(array_intersect($roleArr, ['admin', 'agent']));
    if (!$isAdminOrAgent && $currentUserId != $userId) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }

    $updateData = [];

    // Build updateData array with sanitized values
    if (isset($request['name'])) {
        $name = trim($request['name']);
        if ($name !== '') {
            $updateData['name'] = sanitizeInput($name);
        }
    }

    if (isset($request['email'])) {
        $email = trim($request['email']);
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $updateData['email'] = sanitizeInput($email);
        }
    }

    if (array_key_exists('companyName', $request)) {
        $updateData['company_name'] = sanitizeInput($request['companyName'] ?? '');
    }

    if (array_key_exists('department', $request)) {
        $updateData['department'] = sanitizeInput($request['department'] ?? '');
    }

    if (array_key_exists('contactNumber', $request)) {
        $updateData['contact_number'] = sanitizeInput($request['contactNumber'] ?? '');
    }

    if (array_key_exists('designation', $request)) {
        $updateData['designation'] = sanitizeInput($request['designation'] ?? '');
    }

    // Admin/Agent only fields (multi-role aware)
    if (array_intersect($roleArr, ['admin', 'agent'])) {
        if (isset($request['username'])) {
            $username = trim($request['username']);
            if ($username !== '') {
                $updateData['username'] = sanitizeInput($username);
            }
        }

        if (isset($request['role'])) {
            $role = sanitizeInput($request['role']);
            // Support comma-separated roles (e.g., 'admin,agent')
            $rolesInRequest = array_map('trim', explode(',', $role));
            $validRoles = ['admin', 'agent', 'user'];
            $allValid = true;
            foreach ($rolesInRequest as $r) {
                if (!in_array($r, $validRoles)) {
                    $allValid = false;
                    break;
                }
            }
            if ($allValid) {
                $updateData['role'] = $role;
            }
        }
    }

    // Password update
    if (isset($request['password']) && trim($request['password']) !== '') {
        // Allow if current user is an admin (multi-role aware) or updating their own password
        if (in_array('admin', $roleArr) || $currentUserId == $userId) {
            $updateData['password'] = hashPassword($request['password']);
        }
    }

    if (empty($updateData)) {
        jsonResponse(['error' => 'No valid fields to update'], 400);
    }

    try {
        // Duplicate check for username/email
        $dupWhere = [];
        $dupParams = [$userId]; // Start with userId for the id != ? condition
        if (isset($updateData['username'])) {
            $dupWhere[] = "username = ?";
            $dupParams[] = $updateData['username'];
        }
        if (isset($updateData['email'])) {
            $dupWhere[] = "email = ?";
            $dupParams[] = $updateData['email'];
        }
        if ($dupWhere) {
            $dupSql = "SELECT id, username, email FROM users WHERE id != ? AND (" . implode(' OR ', $dupWhere) . ")";
            $duplicate = $db->fetchOne($dupSql, $dupParams);
            if ($duplicate) {
                $error = "Update failed: ";
                if (isset($updateData['username']) && $duplicate['username'] === $updateData['username']) {
                    $error .= "The username '{$updateData['username']}' is already taken. ";
                }
                if (isset($updateData['email']) && $duplicate['email'] === $updateData['email']) {
                    $error .= "The email '{$updateData['email']}' is already registered to another account. ";
                }
                jsonResponse(['error' => $error ?: 'Username or email already exists'], 400);
            }
        }

        // Update the user
        $db->update('users', $updateData, 'id = ?', [$userId]);

        // Fetch updated user
        $updatedUser = $db->fetchOne(
            "SELECT id, username, name, email, role, company_name, department, contact_number, designation, created_at FROM users WHERE id = ?",
            [$userId]
        );

        $convertedUser = [
            'id' => $updatedUser['id'],
            'username' => $updatedUser['username'],
            'name' => $updatedUser['name'],
            'email' => $updatedUser['email'],
            'role' => $updatedUser['role'],
            'companyName' => $updatedUser['company_name'],
            'department' => $updatedUser['department'],
            'contactNumber' => $updatedUser['contact_number'],
            'designation' => $updatedUser['designation'],
            'createdAt' => $updatedUser['created_at']
        ];
        
        // Send email notifications in BATCH when admin/agent updates ANOTHER user
        if ($isAdminOrAgent && $currentUserId != $userId) {
            try {
                // Notify all admins via BCC for speed
                $admins = $db->fetchAll("SELECT email FROM users WHERE FIND_IN_SET('admin', role) AND is_verified = 1");
                $bccEmails = [];
                foreach ($admins as $admin) {
                    if (!empty($admin['email']) && strpos($admin['email'], '@imported.local') === false) {
                        $bccEmails[] = $admin['email'];
                    }
                }
                
                if (!empty($bccEmails)) {
                    $subject = "ITSM Portal - User Account Updated: {$convertedUser['name']}";
                    $content = "
                        <p>Hello Admin,</p>
                        <p>A user account has been updated by an administrator:</p>
                        <ul>
                            <li><strong>Name:</strong> {$convertedUser['name']}</li>
                            <li><strong>Username:</strong> {$convertedUser['username']}</li>
                            <li><strong>Email:</strong> {$convertedUser['email']}</li>
                            <li><strong>Role:</strong> {$convertedUser['role']}</li>
                        </ul>
                    ";
                    $msg = generateEmailTemplate("User Account Updated", $content);
                    require_once __DIR__ . '/../lib/mailer.php';
                    send_mail('support@cybaemtech.com', 'ITMS Team', $subject, $msg, ['bcc' => $bccEmails]);
                }
                
                // Still send a direct one to the user being updated
                if (!empty($convertedUser['email']) && strpos($convertedUser['email'], '@imported.local') === false) {
                    notifyUserAccountUpdate($convertedUser);
                }
            } catch (Exception $e) {
                error_log("Failed to send user update notifications: " . $e->getMessage());
            }
        }

        jsonResponse($convertedUser);

    } catch (Exception $e) {
        error_log("Database error in handleUpdateUser: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleDeleteUser($userId) {
    set_time_limit(120); // Increase limit for mail sending
    requireRole(['admin', 'agent']);
    
    if (!$userId) {
        jsonResponse(['error' => 'User ID is required'], 400);
    }
    
    $currentUserId = $_SESSION['user_id'];
    
    if ($currentUserId == $userId) {
        jsonResponse(['error' => 'Cannot delete your own account'], 400);
    }
    
    $db = getDb();
    
    // Check if user exists and fetch complete user data for notifications
    $user = $db->fetchOne("SELECT id, username, name, email, role, company_name, department, contact_number, designation, created_at FROM users WHERE id = ?", [$userId]);
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Check if user has tickets and provide detailed information
    $ticketCounts = $db->fetchOne(
        "SELECT 
            SUM(CASE WHEN created_by_id = ? THEN 1 ELSE 0 END) as created_count,
            SUM(CASE WHEN assigned_to_id = ? THEN 1 ELSE 0 END) as assigned_count
        FROM tickets 
        WHERE created_by_id = ? OR assigned_to_id = ?",
        [$userId, $userId, $userId, $userId]
    );
    
    $totalTickets = ($ticketCounts['created_count'] ?? 0) + ($ticketCounts['assigned_count'] ?? 0);
    
    if ($totalTickets > 0) {
        $message = "Cannot delete user with existing tickets. ";
        if ($ticketCounts['created_count'] > 0) {
            $message .= "User has created " . $ticketCounts['created_count'] . " ticket(s). ";
        }
        if ($ticketCounts['assigned_count'] > 0) {
            $message .= "User is assigned to " . $ticketCounts['assigned_count'] . " ticket(s). ";
        }
        $message .= "Please reassign or close these tickets first.";
        
        jsonResponse(['error' => $message], 400);
    }
    
    $db->delete('users', 'id = ?', [$userId]);
    
    // Send email notifications for user deletion in BATCH
    try {
        error_log("User data before deletion: " . json_encode($user));
        
        $deletedUserInfo = [
            'id' => $user['id'] ?? 'Unknown ID',
            'username' => $user['username'] ?? 'Unknown Username',
            'name' => $user['name'] ?? 'Unknown User',
            'email' => $user['email'] ?? 'Unknown Email',
            'role' => $user['role'] ?? 'user',
            'companyName' => $user['company_name'] ?? 'Not Specified',
            'department' => $user['department'] ?? 'Not Specified',
            'contactNumber' => $user['contact_number'] ?? 'Not Specified',
            'designation' => $user['designation'] ?? 'Not Specified',
            'createdAt' => $user['created_at'] ?? date('Y-m-d H:i:s')
        ];

        // Notify all admins via BCC
        $admins = $db->fetchAll("SELECT email FROM users WHERE FIND_IN_SET('admin', role) AND is_verified = 1");
        $bccEmails = [];
        foreach ($admins as $admin) {
            if (!empty($admin['email']) && strpos($admin['email'], '@imported.local') === false) {
                $bccEmails[] = $admin['email'];
            }
        }
        
        if (!empty($bccEmails)) {
            $subject = "ITSM Portal - User Account DELETED: {$deletedUserInfo['name']}";
            $content = "
                <p>Hello Admin,</p>
                <p>A user account has been deleted from the ITSM Portal:</p>
                <ul>
                    <li><strong>Name:</strong> {$deletedUserInfo['name']}</li>
                    <li><strong>Username:</strong> {$deletedUserInfo['username']}</li>
                    <li><strong>Email:</strong> {$deletedUserInfo['email']}</li>
                </ul>
            ";
            $msg = generateEmailTemplate("User Account Deleted", $content);
            require_once __DIR__ . '/../lib/mailer.php';
            send_mail('support@cybaemtech.com', 'ITMS Team', $subject, $msg, ['bcc' => $bccEmails]);
        }
    } catch (Exception $e) {
        error_log("Failed to send user deletion notifications: " . $e->getMessage());
    }
    
    jsonResponse(['message' => 'User deleted successfully']);
}
?>