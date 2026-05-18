<?php
// Prevent whitespace before output
ob_start();
/**
 * Authentication API Endpoints
 * IT Helpdesk Portal - PHP Backend
 */

// Get the correct path to database config regardless of working directory
$configPath = dirname(__DIR__) . '/config/database.php';
if (!file_exists($configPath)) {
    // Fallback for different directory structures
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;

// --- FIX: Ensure session and auth helpers are included for jsonResponse/sanitizeInput ---
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../helpers/auth.php';
if (function_exists('initializeSession')) {
    initializeSession();
}
// --- END FIX ---

// Enable CORS for frontend - Dynamic Origin for IIS/Localhost
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

// Support for testing with $_REQUEST_DATA
if (empty($request) && isset($_REQUEST_DATA)) {
    $request = $_REQUEST_DATA;
}

try {
    switch ($method) {
        case 'POST':
            $action = $_GET['action'] ?? '';
            
            $db = getDb();
            switch ($action) {
                case 'login':
                    handleLogin($request);
                    break;
                case 'register':
                    handleRegister($request);
                    break;
                case 'logout':
                    handleLogout();
                    break;
                case 'forgot-password':
                    handleForgotPassword($db, $request);
                    break;
                case 'reset-password':
                    handleResetPassword($db, $request);
                    break;
                default:
                    jsonResponse(['error' => 'Invalid action'], 400);
            }
            break;
            
        case 'GET':
            handleGetUser();
            break;
            
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal server error'], 500);
}

function handleLogin($request) {
    // Initialize session using shared configuration
    initializeSession();
    
    $usernameOrEmail = sanitizeInput($request['username'] ?? $request['email'] ?? '');
    $password = $request['password'] ?? '';
    
    if (empty($usernameOrEmail) || empty($password)) {
        jsonResponse(['error' => 'Username/Email and password are required'], 400);
    }
    
    $db = getDb();
    
    // First try exact match on username or email
    $user = $db->fetchOne(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [$usernameOrEmail, $usernameOrEmail]
    );
    
    // If no match, try case-insensitive email match
    if (!$user && filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL)) {
        $user = $db->fetchOne(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
            [$usernameOrEmail]
        );
    }

    if (!$user || !verifyPassword($password, $user['password'])) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }

    // Check if user is verified
    try {
        $columns = $db->fetchAll("SHOW COLUMNS FROM users");
        $hasVerificationFields = false;
        foreach ($columns as $column) {
            if ($column['Field'] === 'is_verified') {
                $hasVerificationFields = true;
                break;
            }
        }
        
        if ($hasVerificationFields) {
            if (!$user['is_verified']) {
                // Send new verification link if needed
                $verificationToken = bin2hex(random_bytes(32));
                $db->update('users', 
                    ['verification_token' => $verificationToken],
                    ['id' => $user['id']]
                );
                
                // Generate and send new verification email
                $verificationLink = "https://itsm.cybaemtech.app/verify.php?token=$verificationToken";
                $subject = "ITSM Portal - Email Verification Required";
                $message = "Hello {$user['name']},<br><br>Please verify your email address to access your account:<br><br><a href='$verificationLink'>$verificationLink</a><br><br>If you didn't request this verification, please ignore this email.<br><br>Thank you!";
                
                // Release session lock before long email operation
                session_write_close();
                require_once dirname(__DIR__) . '/lib/mailer.php';
                $mailResult = send_mail($user['email'], $user['name'], $subject, $message, ['from' => 'support@cybaemtech.com', 'fromName' => 'ITSM Portal']);
                if (empty($mailResult['success'])) {
                    error_log('Failed to send verification email: ' . ($mailResult['error'] ?? json_encode($mailResult['attempts'])));
                    throw new Exception('Failed to send verification email');
                }
                
                jsonResponse([
                    'error' => 'Email not verified',
                    'message' => 'Please check your email for a new verification link.'
                ], 403);
            }
        }
    } catch (Exception $e) {
        // If verification fields don't exist, log and continue (backward compatibility)
        error_log("Verification check skipped: " . $e->getMessage());
    }

    // Check if user's email domain is still allowed (skip for admins)
    if ($user['role'] !== 'admin') {
        $emailDomain = strtolower(substr(strrchr($user['email'], "@"), 1));
        
        if (!isDomainAllowed($db, $emailDomain)) {
            jsonResponse(['error' => 'Access restricted. Your domain is no longer authorized. Please contact your administrator.'], 403);
        }
    }

    // Set session with all user details including company info
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_username'] = $user['username'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['role'] = $user['role']; // For domain API access check
    $_SESSION['company_name'] = $user['company_name'] ?? '';
    $_SESSION['location'] = $user['location'] ?? '';
    $_SESSION['department'] = $user['department'];

    // Sync with Site Engineering
    syncSESession($db, $user);
    $user['engineerId'] = $_SESSION['site_engg_user_id'] ?? null;
    // Include actual SE role so frontend can render correct dashboard - USE EMAIL for total accuracy
    $seProfileLogin = $db->fetchOne("SELECT role, client_id FROM se_profiles WHERE LOWER(email) = LOWER(?)", [$user['email']]);
    $user['seRole'] = $seProfileLogin['role'] ?? null;
    $user['seClientId'] = $seProfileLogin['client_id'] ?? null;

    // Remove password from response
    unset($user['password']);

    jsonResponse($user);
}

/**
 * Ensures a user has a Site Engineering profile and session
 */
function syncSESession($db, $user) {
    try {
        $email = strtolower($user['email']);

        // Map ITSM role to SE role (default mapping)
        $itsmRole = strtolower($user['role'] ?? 'user');
        $mappedSeRole = 'client';
        if (strpos($itsmRole, 'admin') !== false) $mappedSeRole = 'admin';
        else if (strpos($itsmRole, 'hr') !== false)    $mappedSeRole = 'hr';
        else if (strpos($itsmRole, 'agent') !== false) $mappedSeRole = 'engineer';
        
        // --- SPECIAL OVERRIDE: Sachin Jadhav (Site Engg) ---
        if ($email === 'sachin.jadhav@praj.net') {
            $mappedSeRole = 'client';
        }
        // --- END OVERRIDE ---

        $seProfile = $db->fetchOne("SELECT * FROM se_profiles WHERE LOWER(email) = ?", [$email]);

        if (!$seProfile) {
            // Create new SE profile
            $id = bin2hex(random_bytes(8));
            $db->insert('se_profiles', [
                'id'           => $id,
                'email'        => $email,
                'full_name'    => $user['name'] ?? $user['username'],
                'password_hash'=> $user['password'],
                'role'         => $mappedSeRole,
                'phone'        => $user['contact_number'] ?? '',
                'designation'  => $user['designation'] ?? 'ITSM User',
                'engineer_id'  => 'ENG-' . str_pad($user['id'], 4, '0', STR_PAD_LEFT),
                'created_at'   => date('Y-m-d H:i:s')
            ]);
            $seProfileId = $id;
        } else {
            $seProfileId = $seProfile['id'];
            $currentSeRole = $seProfile['role'];

            // 🛡️ Privileged roles (admin/hr) set manually should NOT be auto-downgraded.
            // Only sync if: the mapped role is "higher" OR current role is not privileged.
            $privileged = ['admin', 'hr'];
            $shouldUpdate = (!in_array($currentSeRole, $privileged) && $currentSeRole !== $mappedSeRole) || ($email === 'sachin.jadhav@praj.net');

            // Still allow upgrading to admin/hr based on ITSM role
            if ($mappedSeRole === 'admin' || $mappedSeRole === 'hr') {
                $shouldUpdate = ($currentSeRole !== $mappedSeRole);
                
                // ⚠️ SPECIAL CASE: If current is 'hr' and mapped is 'admin', keep 'hr' (for users like Shivam)
                if ($currentSeRole === 'hr' && $mappedSeRole === 'admin') {
                    $shouldUpdate = false;
                }
            }

            if ($shouldUpdate) {
                $db->query("UPDATE se_profiles SET role = ? WHERE id = ?", [$mappedSeRole, $seProfileId]);
                error_log("Updated SE role for $email: $currentSeRole → $mappedSeRole");
            }
        }

        $_SESSION['site_engg_user_id'] = $seProfileId;
        error_log("Synced Site Engg Session for user: $email (SE_ID: $seProfileId)");
    } catch (Exception $e) {
        error_log("Site Engg Sync Error: " . $e->getMessage());
    }
}

function handleRegister($request) {
    $username = sanitizeInput($request['username'] ?? '');
    $password = $request['password'] ?? '';
    $name = sanitizeInput($request['name'] ?? '');
    $email = sanitizeInput($request['email'] ?? '');
    $companyName = sanitizeInput($request['companyName'] ?? '');
    $department = sanitizeInput($request['department'] ?? '');
    $contactNumber = sanitizeInput($request['contactNumber'] ?? '');
    $designation = sanitizeInput($request['designation'] ?? '');
    $role = sanitizeInput($request['role'] ?? 'user');
    
    if (empty($username) || empty($password) || empty($name) || empty($email)) {
        jsonResponse(['error' => 'Username, password, name, and email are required'], 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }

    $db = getDb();
    
    // Check if email domain is allowed
    $emailDomain = strtolower(substr(strrchr($email, "@"), 1));
    
    if (!isDomainAllowed($db, $emailDomain)) {
        jsonResponse(['error' => 'Registration is restricted to authorized domains. Please contact your administrator for access.'], 403);
    }
    
    // Check if username or email already exists and is verified
    $existingUser = $db->fetchOne(
        "SELECT id, is_verified FROM users WHERE username = ? OR email = ?",
        [$username, $email]
    );
    if ($existingUser) {
        // If user exists but is not verified, allow re-registration and update verification token
        if (isset($existingUser['is_verified']) && !$existingUser['is_verified']) {
            // Update verification token and resend email
            $verificationToken = bin2hex(random_bytes(32));
            $db->update('users', [
                'verification_token' => $verificationToken,
                'is_verified' => 0,
                'password' => hashPassword($password),
                'name' => $name,
                'company_name' => !empty($companyName) ? $companyName : null,
                'department' => !empty($department) ? $department : null,
                'contact_number' => !empty($contactNumber) ? $contactNumber : null,
                'designation' => !empty($designation) ? $designation : null,
                'role' => $role
            ], 'id = ?', [$existingUser['id']]);
            // Send verification email
            $verificationLink = "https://itsm.cybaemtech.app/verify.php?token=$verificationToken";
            $subject = "Welcome to ITSM Portal - Verify Your Email";
            $message = "Hello $name,<br><br>Your account has been created.<br>Username: $username<br>Password: $password<br>Please click the link below to verify your email and activate your account:<br><a href='$verificationLink'>$verificationLink</a><br><br>Thank you!";
            // Use centralized mail helper to send verification/resend emails
            require_once dirname(__DIR__) . '/lib/mailer.php';
            $mailResult = send_mail($email, $name, $subject, $message, ['from' => 'support@cybaemtech.com', 'fromName' => 'ITSM Portal']);
            if (empty($mailResult['success'])) {
                jsonResponse(['error' => 'Failed to send verification email', 'details' => $mailResult], 500);
            }
            jsonResponse(['message' => 'Verification link resent. Please check your email.'], 200);
        } else {
            jsonResponse(['error' => 'Username or email already exists'], 400);
        }
        return;
    }
    
    // Create new user with verification token
    $hashedPassword = hashPassword($password);
    $verificationToken = bin2hex(random_bytes(32));
    // Prepare verification email
    $verificationLink = "https://itsm.cybaemtech.app/verify.php?token=$verificationToken";
    $subject = "Welcome to ITSM Portal - Verify Your Email";
    $message = "Hello $name,<br><br>Your account has been created.<br>Username: $username<br>Password: $password<br>Please click the link below to verify your email and activate your account:<br><a href='$verificationLink'>$verificationLink</a><br><br>Thank you!";
    // First create the user in database
    $columns = $db->fetchAll("SHOW COLUMNS FROM users");
    $hasVerificationFields = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'verification_token') {
            $hasVerificationFields = true;
            break;
        }
    }
    $userData = [
        'username' => $username,
        'password' => $hashedPassword,
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'company_name' => !empty($companyName) ? $companyName : null,
        'department' => !empty($department) ? $department : null,
        'contact_number' => !empty($contactNumber) ? $contactNumber : null,
        'designation' => !empty($designation) ? $designation : null
    ];
    if ($hasVerificationFields) {
        $userData['verification_token'] = $verificationToken;
        $userData['is_verified'] = 0;
    }
        
        try {
            $userId = $db->insert('users', $userData);
        } catch (Exception $e) {
            jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        
        // Release session lock
        session_write_close();
        require_once dirname(__DIR__) . '/lib/mailer.php';
        $mailResult = send_mail($email, $name, $subject, $message, ['from' => 'support@cybaemtech.com', 'fromName' => 'ITSM Portal']);
        if (empty($mailResult['success'])) {
            jsonResponse(['error' => 'Failed to send verification email', 'details' => $mailResult], 500);
        }
        error_log("Verification email sent successfully to: $email");
        
        // Get created user data for response
        try {
            $user = $db->fetchOne("SELECT id, username, name, email, role, company_name, department, contact_number, designation, created_at, is_verified FROM users WHERE id = ?", [$userId]);
        } catch (Exception $e) {
            // Fallback without verification fields
            $user = $db->fetchOne("SELECT id, username, name, email, role, company_name, department, contact_number, designation, created_at FROM users WHERE id = ?", [$userId]);
        }
        
        // Custom response for frontend toast
        jsonResponse([
            'user' => $user,
            'message' => 'Verification link sent to your email. Please check your inbox.'
        ], 201);
        
    }

function handleLogout() {
    // Initialize session using shared configuration
    initializeSession();
    session_destroy();
    jsonResponse(['message' => 'Logged out successfully']);
}

function handleGetUser() {
    // Initialize session using shared configuration
    initializeSession();
    
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Not authenticated', 'authenticated' => false], 200);
    }
    
    $db = getDb();
    $user = $db->fetchOne(
        "SELECT id, username, name, email, role, company_name, department, contact_number, designation, created_at, password FROM users WHERE id = ?",
        [$_SESSION['user_id']]
    );
    
    if (!$user) {
        session_destroy();
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Sync Site Engg session if missing
    if (!isset($_SESSION['site_engg_user_id'])) {
        syncSESession($db, $user);
    }
    
    // Convert database field names to frontend-expected camelCase
    $frontendUser = [
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
        'engineerId' => $_SESSION['site_engg_user_id'] ?? null
    ];
    
    // Include actual SE role so frontend can render correct dashboard - USE EMAIL for total accuracy
    $seRoleResult = $db->fetchOne("SELECT role, client_id FROM se_profiles WHERE LOWER(email) = LOWER(?)", [$user['email']]);
    $frontendUser['seRole'] = $seRoleResult['role'] ?? null;
    $frontendUser['seClientId'] = $seRoleResult['client_id'] ?? null;

    jsonResponse($frontendUser);
}

function isDomainAllowed($db, $emailDomain) {
    try {
        // Check if allowed_domains table exists
        $tableExists = $db->fetchOne("SHOW TABLES LIKE 'allowed_domains'");
        
        if ($tableExists) {
            // If table exists, check how many active domains are configured
            $activeCountRow = $db->fetchOne("SELECT COUNT(*) as total FROM allowed_domains WHERE is_active = 1");
            $activeTotal = ($activeCountRow['total'] ?? 0);

            // If the table exists but no active domains are configured, allow registration by default
            if ($activeTotal === 0) {
                return true;
            }

            // Use database to check allowed domains
            $allowedDomain = $db->fetchOne(
                "SELECT COUNT(*) as count FROM allowed_domains WHERE domain = ? AND is_active = 1",
                [$emailDomain]
            );

            return ($allowedDomain && $allowedDomain['count'] > 0);
        } else {
            // Fallback: if table doesn't exist, use default allowed domains for backward compatibility
            $defaultAllowedDomains = ['cybaemtech.com', 'cybaemtech.in', 'logenix.in', 'test.com', 'localhost', 'gmail.com'];
            return in_array($emailDomain, $defaultAllowedDomains);
        }
    } catch (Exception $e) {
        // Log error and use fallback
        error_log("Domain check failed: " . $e->getMessage());
        
        // Fallback to default domains if database check fails
        $defaultAllowedDomains = ['cybaemtech.com', 'cybaemtech.in', 'logenix.in', 'test.com', 'localhost', 'gmail.com'];
        return in_array($emailDomain, $defaultAllowedDomains);
    }
}

function handleForgotPassword($db, $request) {
    $email = trim($request['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'A valid email address is required'], 400);
    }

    // Find user by email (case-insensitive)
    $user = $db->fetchOne(
        "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)",
        [$email]
    );

    // Always return success to prevent email enumeration
    $successMsg = 'If an account with that email exists, a password reset link has been sent.';

    if (!$user) {
        jsonResponse(['message' => $successMsg]);
    }

    // Generate secure token and store it
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Check if reset_tokens table exists, create it if not
    try {
        $db->fetchOne("SELECT 1 FROM password_reset_tokens LIMIT 1");
    } catch (Exception $e) {
        $db->query("CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_user_id (user_id)
        )");
    }

    // Delete any existing tokens for this user
    try { $db->query("DELETE FROM password_reset_tokens WHERE user_id = ?", [$user['id']]); } catch (Exception $e) {}

    // Insert new token
    $db->insert('password_reset_tokens', [
        'user_id' => $user['id'],
        'token' => $token,
        'expires_at' => $expiresAt
    ]);

    // Build reset URL  
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $resetUrl = "{$protocol}://{$host}/auth?reset={$token}";

    // Send email - release session lock
    session_write_close();
    try {
        require_once dirname(__DIR__) . '/lib/mailer.php';
        $subject = "ITSM Portal - Password Reset Request";
        $body = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #4a5568; font-size: 16px;">Hello <strong>' . htmlspecialchars($user['name']) . '</strong>,</p>
                <p style="color: #4a5568;">We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="' . $resetUrl . '" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #718096; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #718096; font-size: 14px;">If you didn\'t request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #a0aec0; font-size: 12px; text-align: center;">ITSM Support System</p>
            </div>
        </div>';

        send_mail($user['email'], $user['name'], $subject, $body, ['fromName' => 'ITSM Portal']);
    } catch (Exception $e) {
        error_log("Failed to send reset email: " . $e->getMessage());
    }

    jsonResponse(['message' => 'If an account with that email exists, a password reset link has been sent.']);
}

function handleResetPassword($db, $request) {
    $token = trim($request['token'] ?? '');
    $newPassword = $request['newPassword'] ?? '';

    if (empty($token) || empty($newPassword)) {
        jsonResponse(['error' => 'Token and new password are required'], 400);
    }

    if (strlen($newPassword) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
    }

    // Find valid token
    $tokenRecord = $db->fetchOne(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()",
        [$token]
    );

    if (!$tokenRecord) {
        jsonResponse(['error' => 'Invalid or expired reset token. Please request a new one.'], 400);
    }

    // Update password
    $hashedPassword = hashPassword($newPassword);
    $db->update('users', ['password' => $hashedPassword], 'id = ?', [$tokenRecord['user_id']]);

    // Mark token as used
    $db->update('password_reset_tokens', ['used' => 1], 'id = ?', [$tokenRecord['id']]);

    jsonResponse(['message' => 'Password has been reset successfully. You can now log in with your new password.']);
}

// Prevent whitespace after output
ob_end_flush();
?>