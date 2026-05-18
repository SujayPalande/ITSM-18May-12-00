<?php
/**
 * Zoho People API Helper
 * Handles OAuth2 token refresh and fetching employee data
 */

require_once dirname(__DIR__) . '/config/database.php';

class ZohoPeopleAPI {
    private $clientId;
    private $clientSecret;
    private $refreshToken;
    private $accessToken;

    public function __construct() {
        $this->clientId = $_ENV['ZOHO_CLIENT_ID'] ?? '';
        $this->clientSecret = $_ENV['ZOHO_CLIENT_SECRET'] ?? '';
        $this->refreshToken = $_ENV['ZOHO_REFRESH_TOKEN'] ?? '';
    }

    /**
     * Refresh the Access Token using the Refresh Token
     */
    public function refreshAccessToken() {
        if (empty($this->clientId) || empty($this->clientSecret) || empty($this->refreshToken)) {
            throw new Exception("Zoho API credentials missing in .env");
        }

        $url = "https://accounts.zoho.in/oauth/v2/token";
        $params = [
            'refresh_token' => $this->refreshToken,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'refresh_token'
        ];

        $options = [
            'http' => [
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($params),
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ]
        ];
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            throw new Exception("Network error refreshing Zoho token.");
        }

        $data = json_decode($response, true);
        if (isset($data['access_token'])) {
            $this->accessToken = $data['access_token'];
            return $this->accessToken;
        } else {
            throw new Exception("Failed to refresh Zoho token: " . ($data['error'] ?? $response));
        }
    }

    /**
     * Fetch all employees from Zoho People using multiple API attempts for compatibility
     */
    public function fetchEmployees() {
        if (empty($this->accessToken)) {
            $this->refreshAccessToken();
        }

        // Try Attempt 1: Forms API (Highly reliable for India DC)
        // URL with /json/ seems to fail on some Windows PHP setups, using the standard one
        $url = "https://people.zoho.in/people/api/forms/employee/getRecords?sIndex=0&limit=200";
        $results = $this->makeGetRequest($url);
        
        $flattened = [];
        if (!empty($results) && isset($results['response']['result'])) {
            $rawList = $results['response']['result'];
            foreach ($rawList as $recordWrapper) {
                foreach ($recordWrapper as $id => $fieldsList) {
                    if (isset($fieldsList[0])) {
                        $flattened[] = $fieldsList[0];
                    }
                }
            }
            return $flattened;
        }

        // Try Attempt 2: v2 API (Fallback)
        $url = "https://people.zoho.in/people/api/v2/employee?limit=200";
        $results = $this->makeGetRequest($url);
        if (isset($results['data'])) return $results['data'];
        if (isset($results['response']['data'])) return $results['response']['data'];

        return [];
    }

    /**
     * Fetch attendance for a specific employee on a specific date
     */
    public function getAttendance($email, $date) {
        if (empty($this->accessToken)) {
            $this->refreshAccessToken();
        }

        $url = "https://people.zoho.in/people/api/forms/attendance/getRecords?sIndex=0&limit=100";
        return $this->makeGetRequest($url);
    }

    public function syncAttendance($db) {
        $date = date('Y-m-d');
        // Try multiple DC URLs if needed, start with India
        $url = "https://people.zoho.in/people/api/attendance/getAttendanceEntries?date=$date";
        $response = $this->makeGetRequest($url);
        
        // If this bulk fetch fails due to scope, we might have to stick to webhooks
        // But let's log the error if any
        if (isset($response['response']['errors'])) {
            error_log("Zoho Attendance Sync Error: " . json_encode($response['response']['errors']));
            return false;
        }
        
        return $response;
    }

    public function makeGetRequest($url) {
        $options = [
            'http' => [
                'method' => 'GET',
                'header' => "Authorization: Zoho-oauthtoken {$this->accessToken}\r\n",
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ]
        ];
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
        if (!$response) return null;
        return json_decode($response, true);
    }

    /**
     * Sync Zoho employees to local database and cleanup old records
     */
    public function syncEmployees($db) {
        $employees = $this->fetchEmployees();
        $count = 0;
        $syncedEmails = [];

        foreach ($employees as $emp) {
            // Normalize field names
            $email = strtolower($emp['EmailID'] ?? $emp['emailId'] ?? $emp['email'] ?? '');
            if (empty($email)) continue;

            // CRITICAL: Protect Rohan from any sync changes or role downgrades
            if ($email === 'rohan@cybaemtech.com') {
                $syncedEmails[] = $email;
                continue;
            }

            if (empty($email)) continue;
            $email = strtolower(trim($email));

            // Normalize .in to .com to match portal preference (e.g., Shivam Jagtap)
            $email = str_replace('@cybaemtech.in', '@cybaemtech.com', $email);

            // Only sync active employees
            $status = $emp['Employeestatus'] ?? $emp['status'] ?? 'Active';
            if (strtolower($status) !== 'active') continue;

            $syncedEmails[] = $email;

            $firstName = $emp['FirstName'] ?? $emp['First Name'] ?? $emp['firstName'] ?? '';
            $lastName = $emp['LastName'] ?? $emp['Last Name'] ?? $emp['lastName'] ?? '';
            $fullName = trim($firstName . ' ' . $lastName) ?: ($emp['Name'] ?? $emp['full_name'] ?? $email);
            
            $department = $emp['Department'] ?? $emp['department'] ?? '';
            $designation = $emp['Designation'] ?? $emp['designation'] ?? '';
            $phone = $emp['Mobile'] ?? $emp['mobile'] ?? $emp['phone'] ?? '';
            $deptName = strtoupper(is_array($department) ? ($department['name'] ?? '') : $department);

            // 1. Sync to ITSM 'users' table
            $existingUser = $db->fetchOne("SELECT id FROM users WHERE LOWER(email) = ?", [$email]);
            $userRole = 'user';
            if ($deptName === 'SUPPORT - TECHNICAL') {
                $userRole = 'agent';
            }

            $userData = [
                'name' => $fullName,
                'email' => $email,
                'username' => explode('@', $email)[0],
                'role' => $userRole, 
                'department' => is_array($department) ? ($department['name'] ?? '') : $department,
                'contact_number' => $phone,
                'designation' => is_array($designation) ? ($designation['name'] ?? '') : $designation,
                'company_name' => 'Cybaem Tech'
            ];

            if ($existingUser) {
                $db->update('users', $userData, 'id = ?', [$existingUser['id']]);
            } else {
                $userData['password'] = password_hash('Cybaem@123', PASSWORD_DEFAULT);
                $userData['is_verified'] = 1;
                $db->insert('users', $userData);
            }

            // 2. Sync to Site Engineering 'se_profiles' table
            $existingProfile = $db->fetchOne("SELECT id FROM se_profiles WHERE LOWER(email) = ?", [$email]);
            
            // Map role based on department
            $profileRole = 'user';
            if ($deptName === 'SUPPORT - TECHNICAL') {
                $profileRole = 'engineer';
            } elseif ($deptName === 'HR') {
                $profileRole = 'hr';
            } elseif ($deptName === 'MANAGEMENT') {
                $profileRole = 'admin';
            }
            
            $profileData = [
                'full_name' => $fullName,
                'email' => $email,
                'role' => $profileRole,
                'phone' => $phone,
                'designation' => is_array($designation) ? ($designation['name'] ?? '') : $designation
            ];

            if ($existingProfile) {
                // Preserve manually assigned roles if they are already admin or super_admin
                $existingRole = $existingProfile['role'];
                if (in_array($existingRole, ['admin', 'super_admin']) && $profileRole !== 'admin') {
                    $profileData['role'] = $existingRole;
                }
                $db->update('se_profiles', $profileData, 'id = ?', [$existingProfile['id']]);
            } else {
                $profileData['id'] = bin2hex(random_bytes(8));
                $profileData['password_hash'] = password_hash('password123', PASSWORD_DEFAULT);
                $profileData['created_at'] = date('Y-m-d H:i:s');
                $db->insert('se_profiles', $profileData);
            }

            $count++;
        }

        // Cleanup: Remove users NOT in the Zoho sync list
        if (!empty($syncedEmails)) {
            $placeholders = implode(',', array_fill(0, count($syncedEmails), '?'));
            
            // Delete from se_profiles (except protected roles if necessary, but user wants ONLY 42)
            // To be safe, we keep the currently logged-in user if they aren't in Zoho for some reason
            $currentUserId = $_SESSION['site_engg_user_id'] ?? 'none';
            
            $deleteSql = "DELETE FROM se_profiles WHERE LOWER(email) NOT IN ($placeholders) AND id != ?";
            $db->query($deleteSql, array_merge($syncedEmails, [$currentUserId]));

            // Optional: Cleanup users table too if desired, but focus on Site Engg (se_profiles)
            $db->query("DELETE FROM users WHERE LOWER(email) NOT IN ($placeholders) AND company_name = 'Cybaem Tech'", $syncedEmails);
        }

        return $count;
    }
}
