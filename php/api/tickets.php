<?php
/**
 * Tickets API Endpoints - FULL DATA VERSION
 */

error_log("!!! TICKETS.PHP INITIALIZED !!! Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A'));

ini_set('memory_limit', '512M');
ini_set('max_execution_time', '300');
set_time_limit(300);

try {
    set_error_handler(function($errno, $errstr, $errfile, $errline) {
        error_log("CUSTOM ERROR: [$errno] $errstr in $errfile on line $errline");
        return false; 
    });

    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error !== NULL && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
            error_log("FATAL ERROR CAUGHT: " . print_r($error, true));
            if (!headers_sent()) {
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(['error' => 'Fatal server error', 'details' => $error['message']]);
            }
        }
    });

    function sanitizeDateForJS($dateValue) {
        if (is_null($dateValue) || empty($dateValue) || $dateValue === '0000-00-00 00:00:00') return null;
        $timestamp = strtotime($dateValue);
        return ($timestamp === false) ? null : date('c', $timestamp);
    }

    $configPath = dirname(__DIR__) . '/config/database.php';
    if (!file_exists($configPath)) { $configPath = __DIR__ . '/../config/database.php'; }
    require_once $configPath;
    require_once __DIR__ . '/../config/session.php';
    require_once __DIR__ . '/../helpers/auth.php';
    require_once __DIR__ . '/../helpers/email_notifications.php';
    require_once __DIR__ . '/../helpers/notifications.php';

    if (function_exists('initializeSession')) { initializeSession(); }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Vary: Origin');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

    $method = $_SERVER['REQUEST_METHOD'];
    $request = [];
    if (isset($_REQUEST_DATA) && !empty($_REQUEST_DATA)) {
        $request = $_REQUEST_DATA;
    } else {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $request = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $request = $_POST ?? [];
        }
    }

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $pathParts = explode('/', trim($path, '/'));
    $action = $_GET['action'] ?? '';
    $ticketId = $_GET['id'] ?? null;
    
    $ticketsIndex = array_search('tickets', $pathParts);
    if ($ticketsIndex === false) $ticketsIndex = array_search('tickets.php', $pathParts);

    if ($ticketsIndex !== false && isset($pathParts[$ticketsIndex + 1])) {
        $nextPart = $pathParts[$ticketsIndex + 1];
        if (is_numeric($nextPart)) {
            $ticketId = $nextPart;
            if (isset($pathParts[$ticketsIndex + 2]) && $pathParts[$ticketsIndex + 2] === 'comments') $action = 'comment';
        } elseif ($nextPart === 'my') {
            $_GET['filter'] = 'my';
        }
    }
    
    switch ($method) {
        case 'GET':
            if ($action === 'comment') handleGetComments($ticketId);
            elseif ($ticketId) handleGetSingleTicket($ticketId);
            else handleGetTickets();
            break;
        case 'POST':
            if ($action === 'comment') handleCreateComment($ticketId ?? $_GET['id'], $request);
            else handleCreateTicket($request);
            break;
        case 'PUT':
            handleUpdateTicket($ticketId ?? $_GET['id'], $request);
            break;
        case 'DELETE':
            handleDeleteTicket($ticketId ?? $_GET['id']);
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Throwable $e) {
    error_log("TOP-LEVEL FATAL: " . $e->getMessage());
    if (!headers_sent()) { header('Content-Type: application/json'); http_response_code(500); }
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

function handleGetTickets() {
    requireAuth();
    try {
        $db = getDb();
        $filter = $_GET['filter'] ?? ($_GET['user'] ?? 'all');
        $userId = $_SESSION['user_id'];
        $userRole = $_SESSION['user_role'];
        
        $sql = "
            SELECT t.*, c.name as category_name, sc.name as subcategory_name, 
                   cb.name as created_by_name, cb.email as created_by_email, cb.contact_number as created_by_phone,
                   at.name as assigned_to_name, at.email as assigned_to_email, at.contact_number as assigned_to_phone
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories sc ON t.subcategory_id = sc.id
            LEFT JOIN users cb ON t.created_by_id = cb.id
            LEFT JOIN users at ON t.assigned_to_id = at.id
            WHERE 1=1
        ";
        $params = [];
        if ($filter === 'my' || !userHasRole($userRole, ['admin', 'agent'])) {
            $sql .= " AND (t.created_by_id = ? OR t.assigned_to_id = ?)";
            $params[] = $userId; $params[] = $userId;
        }

        // Additional Filters
        if (!empty($_GET['status'])) {
            $sql .= " AND t.status = ?";
            $params[] = $_GET['status'];
        }
        if (!empty($_GET['priority'])) {
            $sql .= " AND t.priority = ?";
            $params[] = $_GET['priority'];
        }
        if (!empty($_GET['categoryId'])) {
            $sql .= " AND t.category_id = ?";
            $params[] = (int)$_GET['categoryId'];
        }
        if (isset($_GET['assignedToId']) && $_GET['assignedToId'] !== '') {
            if ($_GET['assignedToId'] == '0' || $_GET['assignedToId'] === 'unassigned') {
                $sql .= " AND t.assigned_to_id IS NULL";
            } else {
                $sql .= " AND t.assigned_to_id = ?";
                $params[] = (int)$_GET['assignedToId'];
            }
        }
        if (!empty($_GET['companyName'])) {
            $sql .= " AND t.company_name LIKE ?";
            $params[] = '%' . $_GET['companyName'] . '%';
        }
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $sql .= " AND (t.title LIKE ? OR t.description LIKE ? OR t.id LIKE ?)";
            $params[] = $search; $params[] = $search; $params[] = $search;
        }
        
        $sql .= " ORDER BY t.created_at DESC";
        $tickets = $db->fetchAll($sql, $params);
        
        jsonResponse(array_map(function($t) {
            return transformTicket($t);
        }, $tickets));
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function handleGetSingleTicket($ticketId) {
    requireAuth();
    try {
        $db = getDb();
        $ticket = $db->fetchOne("
            SELECT t.*, c.name as category_name, sc.name as subcategory_name, 
                   cb.name as created_by_name, cb.email as created_by_email, cb.contact_number as created_by_phone,
                   at.name as assigned_to_name, at.email as assigned_to_email, at.contact_number as assigned_to_phone
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories sc ON t.subcategory_id = sc.id
            LEFT JOIN users cb ON t.created_by_id = cb.id
            LEFT JOIN users at ON t.assigned_to_id = at.id
            WHERE t.id = ?
        ", [$ticketId]);
        
        if (!$ticket) jsonResponse(['error' => 'Not found'], 404);
        
        $output = transformTicket($ticket);
        
        // Fetch comments
        $comments = $db->fetchAll("
            SELECT c.*, u.name as user_name, u.email as user_email, u.role as user_role
            FROM comments c LEFT JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = ? ORDER BY c.created_at ASC
        ", [$ticketId]);
        
        $output['comments'] = array_map(function($c) {
            return [
                'id' => (int)$c['id'], 
                'content' => $c['comment'], 
                'userId' => (int)$c['user_id'],
                'isInternal' => (bool)$c['is_internal'], 
                'createdAt' => sanitizeDateForJS($c['created_at']),
                'user' => ['id' => (int)$c['user_id'], 'name' => $c['user_name'], 'role' => $c['user_role']]
            ];
        }, $comments);
        
        jsonResponse($output);
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function transformTicket($t) {
    return [
        'id' => (int)$t['id'],
        'title' => $t['title'],
        'description' => $t['description'],
        'status' => $t['status'],
        'priority' => $t['priority'],
        'supportType' => $t['support_type'],
        'categoryId' => (int)$t['category_id'],
        'subcategoryId' => $t['subcategory_id'] ? (int)$t['subcategory_id'] : null,
        'createdById' => (int)$t['created_by_id'],
        'assignedToId' => $t['assigned_to_id'] ? (int)$t['assigned_to_id'] : null,
        'dueDate' => sanitizeDateForJS($t['due_date']),
        'createdAt' => sanitizeDateForJS($t['created_at']),
        'updatedAt' => sanitizeDateForJS($t['updated_at']),
        'attachmentUrl' => $t['attachment_url'],
        'attachmentName' => $t['attachment_name'],
        'contactName' => $t['contact_name'] ?: ($t['created_by_name'] ?? 'Unknown User'),
        'contactEmail' => $t['contact_email'] ?: ($t['created_by_email'] ?? 'No email'),
        'contactPhone' => $t['contact_phone'] ?: ($t['created_by_phone'] ?? 'No phone'),
        'companyName' => $t['company_name'] ?: 'N/A',
        'location' => $t['location'] ?: 'N/A',
        'category' => ['id' => (int)$t['category_id'], 'name' => $t['category_name']],
        'subcategory' => $t['subcategory_id'] ? ['id' => (int)$t['subcategory_id'], 'name' => $t['subcategory_name']] : null,
        'createdBy' => [
            'id' => (int)$t['created_by_id'], 
            'name' => $t['created_by_name'] ?? 'Unknown User', 
            'email' => $t['created_by_email'] ?? 'No email',
            'contactNumber' => $t['created_by_phone'] ?? 'No phone'
        ],
        'assignedTo' => $t['assigned_to_id'] ? [
            'id' => (int)$t['assigned_to_id'], 
            'name' => $t['assigned_to_name'] ?? 'Unknown Agent', 
            'email' => $t['assigned_to_email'] ?? 'No email',
            'contactNumber' => $t['assigned_to_phone'] ?? 'No phone'
        ] : null
    ];
}

function handleCreateTicket($request) {
    try {
        requireAuth();
        $db = getDb();
        $ticketData = [
            'title' => sanitizeInput($request['title'] ?? ''),
            'description' => sanitizeInput($request['description'] ?? ''),
            'status' => 'open',
            'priority' => sanitizeInput($request['priority'] ?? 'medium'),
            'support_type' => sanitizeInput($request['supportType'] ?? 'remote'),
            'contact_email' => sanitizeInput($request['contactEmail'] ?? ''),
            'contact_name' => sanitizeInput($request['contactName'] ?? ''),
            'contact_phone' => sanitizeInput($request['contactPhone'] ?? ''),
            'contact_department' => sanitizeInput($request['contactDepartment'] ?? ''),
            'company_name' => sanitizeInput($request['companyName'] ?? ''),
            'location' => sanitizeInput($request['location'] ?? ''),
            'category_id' => (int)($request['categoryId'] ?? 0),
            'subcategory_id' => !empty($request['subcategoryId']) ? (int)$request['subcategoryId'] : null,
            'created_by_id' => $_SESSION['user_id'],
            'assigned_to_id' => !empty($request['assignedToId']) ? (int)$request['assignedToId'] : null,
            'due_date' => !empty($request['dueDate']) ? (new DateTime($request['dueDate']))->format('Y-m-d H:i:s') : null
        ];
        
        $tid = $db->insert('tickets', $ticketData);
        
        // --- NOTIFICATION: Ticket Created ---
        $creatorName = $_SESSION['user_name'] ?? 'A user';
        $title = "New Ticket Created: #$tid";
        $msg = "$creatorName created a new ticket: " . $ticketData['title'];
        $url = "/tickets/$tid";
        
        // Prepare ticket data for email helpers
        $emailTicketData = $ticketData;
        $emailTicketData['id'] = $tid;
        $emailTicketData['createdBy'] = [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email']
        ];

        // 1. In-App Notifications
        notifyAdmins('ticket_created', $title, $msg, $tid, $url);
        
        // 2. Email Notifications
        // Fetch fresh creator data from DB to avoid session stale issues
        $creator = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$_SESSION['user_id']]);
        if ($creator && !empty($creator['email']) && strpos($creator['email'], '@imported.local') === false) {
            notifyUserTicketCreation($emailTicketData, $creator);
        }

        // Notify Admins and Mandatory Recipients in BATCH for speed
        $admins = $db->fetchAll("SELECT email FROM users WHERE role LIKE '%admin%' AND is_verified = 1");
        $recipients = ['shivam.jagtap@cybaemtech.com', 'support@cybaemtech.com'];
        foreach ($admins as $admin) {
            if (!empty($admin['email']) && strpos($admin['email'], '@imported.local') === false) {
                $recipients[] = strtolower($admin['email']);
            }
        }
        $recipients = array_unique($recipients);
        
        // Use a single call to notify all staff/admins
        if (!empty($recipients)) {
            $staffSubject = "ITSM Portal - New Ticket Created: #$tid - " . $ticketData['title'];
            $staffContent = "
                <p>Hello Team,</p>
                <p>A new ticket has been created in the ITSM Portal:</p>
                <ul>
                    <li><strong>ID:</strong> #$tid</li>
                    <li><strong>Title:</strong> {$ticketData['title']}</li>
                    <li><strong>User:</strong> {$creator['name']} ({$creator['email']})</li>
                    <li><strong>Priority:</strong> {$ticketData['priority']}</li>
                </ul>
                <p><a href='https://itsm.cybaemtech.app/tickets/$tid'>View Ticket Details</a></p>
            ";
            $staffMsg = generateEmailTemplate("New Ticket Alert", $staffContent);
            
            // Centralized helper for batch sending via bcc
            require_once __DIR__ . '/../lib/mailer.php';
            send_mail('support@cybaemtech.com', 'ITMS Team', $staffSubject, $staffMsg, ['bcc' => $recipients]);
        }
        
        // Notify assigned agent specifically if any
        if ($ticketData['assigned_to_id']) {
            createNotification($ticketData['assigned_to_id'], 'ticket_assigned', "Ticket Assigned: #$tid", "You have been assigned to ticket #$tid", $tid, $url);
            
            // Send assignment email
            $agent = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$ticketData['assigned_to_id']]);
            if ($agent && !empty($agent['email']) && strpos($agent['email'], '@imported.local') === false) {
                notifyAgentTicketAssignment($emailTicketData, $agent);
            }
        }
        // --- END NOTIFICATION ---
        
        // Handle attachment (multipart from web)
        if (!empty($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            // Save to persistent uploads/ at site root (dist/uploads/ for IIS)
            $siteRoot = dirname(__DIR__, 2);
            $dir = $siteRoot . '/uploads/';
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            $fn = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $_FILES['attachment']['name']);
            if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dir . $fn)) {
                $db->update('tickets', ['attachment_url' => '/uploads/'.$fn, 'attachment_name' => $_FILES['attachment']['name']], 'id = ?', [$tid]);
            }
        }

        // Handle attachment (base64 payload from mobile fallback)
        if (empty($_FILES['attachment']) && !empty($request['attachmentBase64'])) {
            $siteRoot = dirname(__DIR__, 2);
            $dir = $siteRoot . '/uploads/';
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $originalName = sanitizeInput($request['attachmentName'] ?? 'attachment');
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
            $fileName = time() . '_' . $safeName;
            $targetPath = $dir . $fileName;
            $binary = base64_decode($request['attachmentBase64'], true);

            if ($binary !== false && file_put_contents($targetPath, $binary) !== false) {
                $db->update(
                    'tickets',
                    ['attachment_url' => '/uploads/' . $fileName, 'attachment_name' => $originalName],
                    'id = ?',
                    [$tid]
                );
            }
        }
        
        jsonResponse(['id' => (int)$tid], 201);
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function handleUpdateTicket($id, $request) {
    requireAuth();
    try {
        $db = getDb();
        $data = ['updated_at' => date('Y-m-d H:i:s')];
        if (isset($request['status'])) $data['status'] = $request['status'];
        if (isset($request['priority'])) $data['priority'] = $request['priority'];
        if (isset($request['assignedToId'])) $data['assigned_to_id'] = $request['assignedToId'] ?: null;
        
        // --- NOTIFICATION: Ticket Updated ---
        $ticket = $db->fetchOne("SELECT title, created_by_id, assigned_to_id, status as old_status, priority as old_priority FROM tickets WHERE id = ?", [$id]);
        if ($ticket) {
            $url = "/tickets/$id";
            $creator = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$ticket['created_by_id']]);
            $ticketDataForEmail = ['id' => $id, 'title' => $ticket['title'], 'status' => $request['status'] ?? $ticket['old_status'], 'priority' => $request['priority'] ?? $ticket['old_priority']];

            // 1. Status Changes
            if (isset($request['status']) && $request['status'] !== $ticket['old_status']) {
                $status = ucfirst($request['status']);
                createNotification($ticket['created_by_id'], 'status_changed', "Ticket Status Updated: #$id", "Your ticket #$id has been moved to $status", $id, $url);
                
                // Email to Creator
                if ($creator && !empty($creator['email'])) {
                    notifyTicketStatusUpdate($ticketDataForEmail, $creator['email'], $creator['name'], [
                        'status' => ['from' => $ticket['old_status'], 'to' => $request['status']]
                    ]);
                }

                // Notify assigned agent
                if ($ticket['assigned_to_id']) {
                    createNotification($ticket['assigned_to_id'], 'status_changed', "Ticket Status Updated: #$id", "Ticket #$id has been moved to $status", $id, $url);
                    $agent = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$ticket['assigned_to_id']]);
                    if ($agent && !empty($agent['email'])) {
                        notifyTicketStatusUpdate($ticketDataForEmail, $agent['email'], $agent['name'], [
                            'status' => ['from' => $ticket['old_status'], 'to' => $request['status']]
                        ]);
                    }
                }

                // If closed, send special closure email
                if (strtolower($request['status']) === 'closed') {
                    if ($creator && !empty($creator['email'])) {
                        notifyTicketClosed($ticketDataForEmail, $creator['email'], $creator['name']);
                    }
                }
            }

            // 2. Assignment Changes
            if (isset($request['assignedToId']) && $request['assignedToId'] != $ticket['assigned_to_id']) {
                if ($request['assignedToId']) {
                    createNotification($request['assignedToId'], 'ticket_assigned', "New Ticket Assignment: #$id", "You have been assigned to ticket #$id", $id, $url);
                    
                    $newAgent = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$request['assignedToId']]);
                    if ($newAgent && !empty($newAgent['email'])) {
                        notifyAgentTicketAssignment($ticketDataForEmail, $newAgent);
                    }

                    // Also notify the requester that someone is now working on it
                    if ($creator && !empty($creator['email'])) {
                        $ticketDataForEmail['assignedTo'] = ['name' => $newAgent['name'] ?? 'Agent'];
                        notifyUserTicketAssignment($ticketDataForEmail, $creator);
                    }
                }
            }
        }
        // --- END NOTIFICATION ---
        
        $db->update('tickets', $data, 'id = ?', [$id]);
        jsonResponse(['success' => true]);
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function handleDeleteTicket($id) {
    requireAuth();
    try {
        $db = getDb();
        $db->query("DELETE FROM tickets WHERE id = ?", [$id]);
        jsonResponse(['success' => true]);
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function handleGetComments($tid) {
    requireAuth();
    try {
        $db = getDb();
        $comments = $db->fetchAll("SELECT c.*, u.name as user_name, u.role as user_role FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC", [$tid]);
        jsonResponse(array_map(function($c) {
            return [
                'id' => (int)$c['id'], 
                'content' => $c['comment'], 
                'isInternal' => (bool)$c['is_internal'],
                'user' => ['name' => $c['user_name'], 'role' => $c['user_role'] ?? 'user'], 
                'createdAt' => sanitizeDateForJS($c['created_at'])
            ];
        }, $comments));
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}

function handleCreateComment($tid, $request) {
    requireAuth();
    try {
        $db = getDb();
        
        // Debug logging
        error_log("handleCreateComment: tid=$tid, request=" . json_encode($request));
        
        $commentText = $request['content'] ?? ($request['comment'] ?? null);
        if (!$commentText && isset($_POST['content'])) $commentText = $_POST['content'];
        if (!$commentText && isset($_POST['comment'])) $commentText = $_POST['comment'];
        
        if (!$commentText) {
            jsonResponse(['error' => 'Comment text is required', 'received' => $request], 400);
        }
        
        $db->insert('comments', [
            'ticket_id' => $tid, 
            'user_id' => $_SESSION['user_id'], 
            'comment' => $commentText, 
            'is_internal' => !empty($request['isInternal']) ? 1 : 0,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // --- NOTIFICATION: New Comment ---
        $ticket = $db->fetchOne("SELECT title, created_by_id, assigned_to_id FROM tickets WHERE id = ?", [$tid]);
        if ($ticket) {
            $authorName = $_SESSION['user_name'] ?? 'Someone';
            $msg = "$authorName commented on ticket #$tid";
            $url = "/tickets/$tid";
            
            $ticketDataForEmail = ['id' => $tid, 'title' => $ticket['title']];
            require_once __DIR__ . '/../lib/mailer.php';

            // Function to send comment email
            $sendCommentMail = function($targetUserId, $subject, $msgText) use ($db, $ticketDataForEmail, $commentText, $authorName) {
                $user = $db->fetchOne("SELECT name, email FROM users WHERE id = ?", [$targetUserId]);
                if ($user && !empty($user['email'])) {
                    $content = "
                        <p>Hello <strong>{$user['name']}</strong>,</p>
                        <p>A new comment has been added to ticket <strong>#{$ticketDataForEmail['id']}</strong>:</p>
                        <div style='background:#f8fafc; padding:20px; border-radius:12px; border-left:4px solid #2563eb; margin:20px 0;'>
                            <p style='margin:0; font-size:14px; color:#64748b; margin-bottom:8px;'><strong>$authorName wrote:</strong></p>
                            <p style='margin:0; color:#1e293b; font-size:16px;'>$commentText</p>
                        </div>
                        <p><a href='https://itsm.cybaemtech.app/tickets/{$ticketDataForEmail['id']}'>View Discussion</a></p>
                    ";
                    $html = generateEmailTemplate("New Comment Alert", $content);
                    send_mail($user['email'], $user['name'], $subject, $html);
                }
            };

            $subject = "ITSM Portal - New Comment on Ticket #$tid";

            // If author is requester, notify assigned agent
            if ($_SESSION['user_id'] == $ticket['created_by_id']) {
                if ($ticket['assigned_to_id']) {
                    createNotification($ticket['assigned_to_id'], 'new_comment', "New Comment: #$tid", $msg, $tid, $url);
                    $sendCommentMail($ticket['assigned_to_id'], $subject, $msg);
                }
            } else {
                // author is someone else (agent/admin), notify requester
                createNotification($ticket['created_by_id'], 'new_comment', "New Comment: #$tid", $msg, $tid, $url);
                $sendCommentMail($ticket['created_by_id'], $subject, $msg);
                
                // If there's an assigned agent who is NOT the author, notify them too
                if ($ticket['assigned_to_id'] && $_SESSION['user_id'] != $ticket['assigned_to_id']) {
                    createNotification($ticket['assigned_to_id'], 'new_comment', "New Comment: #$tid", $msg, $tid, $url);
                    $sendCommentMail($ticket['assigned_to_id'], $subject, $msg);
                }
            }
        }
        // --- END NOTIFICATION ---

        jsonResponse(['success' => true]);
    } catch (Throwable $e) { jsonResponse(['error' => $e->getMessage()], 500); }
}
