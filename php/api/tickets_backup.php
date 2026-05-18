<?php
/**
 * Tickets API Endpoints - FIXED VERSION
 * IT Helpdesk Portal - PHP Backend
 */

// Function to sanitize dates for JavaScript consumption
function sanitizeDateForJS($dateValue) {
    // Handle NULL or empty dates
    if (is_null($dateValue) || empty($dateValue) || $dateValue === '0000-00-00 00:00:00') {
        return null;
    }
    
    // Ensure the date is in a valid format
    $timestamp = strtotime($dateValue);
    if ($timestamp === false) {
        return null;
    }
    
    // Return in ISO format that JavaScript can parse reliably
    return date('c', $timestamp); // ISO 8601 format (e.g., 2024-01-15T14:30:00+00:00)
}

// Get the correct path to database config regardless of working directory
$configPath = dirname(__DIR__) . '/config/database.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../config/database.php';
}
require_once $configPath;

// Enable CORS for frontend - Secure configuration
$allowedOrigins = ['https://cybaemtech.in', 'https://www.cybaemtech.in', 'https://cybaemtech.in/itsm_app', 'http://localhost:5173', 'http://localhost:5000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

// Handle both JSON and FormData requests
$request = [];

// Check if request data is provided by cPanel wrapper
if (isset($_REQUEST_DATA) && !empty($_REQUEST_DATA)) {
    $request = $_REQUEST_DATA;
    error_log("Using cPanel wrapper request data: " . print_r($request, true));
} else {
    // Original request handling
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $request = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $request = $_POST ?? [];
    }
    error_log("Using direct request data: " . print_r($request, true));
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

try {
    // Enhanced logging for debugging
    error_log("=== TICKETS API REQUEST START ===");
    error_log("Method: " . $method);
    error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
    error_log("Path parts: " . print_r($pathParts, true));
    error_log("Session ID: " . session_id());
    error_log("Session data: " . print_r($_SESSION, true));
    
    $action = $_GET['action'] ?? '';
    $ticketId = $_GET['id'] ?? null;
    
    // Handle RESTful routing: /tickets/123 or /tickets/123/comments
    if (count($pathParts) >= 2) {
        if ($pathParts[0] === 'tickets' && is_numeric($pathParts[1])) {
            $ticketId = $pathParts[1];
            if (isset($pathParts[2]) && $pathParts[2] === 'comments') {
                $action = 'comment';
            }
        }
    }
    
    switch ($method) {
        case 'GET':
            if ($action === 'comment') {
                handleGetComments($ticketId);
            } elseif ($ticketId) {
                handleGetSingleTicket($ticketId);
            } else {
                handleGetTickets();
            }
            break;
        case 'POST':
            if ($action === 'comment') {
                $ticketId = $_GET['id'] ?? null;
                handleCreateComment($ticketId, $request);
            } else {
                handleCreateTicket($request);
            }
            break;
        case 'PUT':
            $ticketId = $_GET['id'] ?? null;
            handleUpdateTicket($ticketId, $request);
            break;
        case 'DELETE':
            $ticketId = $_GET['id'] ?? null;
            handleDeleteTicket($ticketId);
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Tickets API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal server error'], 500);
}

function handleGetTickets() {
    requireAuth();
    
    $db = getDb();
    
    $filter = $_GET['filter'] ?? 'all';
    $user = $_GET['user'] ?? '';
    $status = $_GET['status'] ?? '';
    $priority = $_GET['priority'] ?? '';
    $categoryId = $_GET['categoryId'] ?? '';
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    $sql = "
        SELECT 
            t.*,
            c.name as category_name,
            sc.name as subcategory_name,
            cb.name as created_by_name,
            cb.email as created_by_email,
            at.name as assigned_to_name,
            at.email as assigned_to_email
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN categories sc ON t.subcategory_id = sc.id
        LEFT JOIN users cb ON t.created_by_id = cb.id
        LEFT JOIN users at ON t.assigned_to_id = at.id
        WHERE 1=1
    ";
    
    $params = [];
    
    // Apply user/role based filters first
    $userFilterApplied = false;
    
    if ($filter === 'my' || $user === 'my') {
        $sql .= " AND (t.created_by_id = ? OR t.assigned_to_id = ?)";
        $params[] = $userId;
        $params[] = $userId;
        $userFilterApplied = true;
    } elseif ($userRole === 'user') {
        $sql .= " AND (t.created_by_id = ? OR t.assigned_to_id = ?)";
        $params[] = $userId;
        $params[] = $userId;
        $userFilterApplied = true;
    }
    
    // Apply other filters
    if ($status) {
        $sql .= " AND t.status = ?";
        $params[] = $status;
    }
    
    if ($priority) {
        $sql .= " AND t.priority = ?";
        $params[] = $priority;
    }
    
    if ($categoryId) {
        $sql .= " AND t.category_id = ?";
        $params[] = $categoryId;
    }
    
    $sql .= " ORDER BY t.created_at DESC";
    
    $tickets = $db->fetchAll($sql, $params);
    
    // Transform tickets to match frontend expectations
    $transformedTickets = array_map(function($ticket) {
        return [
            'id' => (int)$ticket['id'],
            'title' => $ticket['title'],
            'description' => $ticket['description'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'supportType' => $ticket['support_type'],
            'contactEmail' => $ticket['contact_email'],
            'contactName' => $ticket['contact_name'],
            'contactPhone' => $ticket['contact_phone'],
            'contactDepartment' => $ticket['contact_department'],
            'categoryId' => (int)$ticket['category_id'],
            'subcategoryId' => $ticket['subcategory_id'] ? (int)$ticket['subcategory_id'] : null,
            'createdById' => (int)$ticket['created_by_id'],
            'assignedToId' => $ticket['assigned_to_id'] ? (int)$ticket['assigned_to_id'] : null,
            'dueDate' => $ticket['due_date'],
            'attachmentUrl' => $ticket['attachment_url'],
            'attachmentName' => $ticket['attachment_name'],
            'createdAt' => $ticket['created_at'],
            'updatedAt' => $ticket['updated_at'],
            'categoryName' => $ticket['category_name'],
            'subcategoryName' => $ticket['subcategory_name'],
            'createdByName' => $ticket['created_by_name'],
            'createdByEmail' => $ticket['created_by_email'],
            'assignedToName' => $ticket['assigned_to_name'],
            'assignedToEmail' => $ticket['assigned_to_email'],
            'category' => [
                'id' => (int)$ticket['category_id'],
                'name' => $ticket['category_name']
            ],
            'subcategory' => $ticket['subcategory_id'] ? [
                'id' => (int)$ticket['subcategory_id'],
                'name' => $ticket['subcategory_name']
            ] : null,
            'createdBy' => [
                'id' => (int)$ticket['created_by_id'],
                'name' => $ticket['created_by_name'],
                'email' => $ticket['created_by_email']
            ],
            'assignedTo' => $ticket['assigned_to_id'] ? [
                'id' => (int)$ticket['assigned_to_id'],
                'name' => $ticket['assigned_to_name'],
                'email' => $ticket['assigned_to_email']
            ] : null
        ];
    }, $tickets);
    
    jsonResponse($transformedTickets);
}

function handleCreateTicket($request) {
    error_log("=== handleCreateTicket START ===");
    error_log("Request data: " . print_r($request, true));
    error_log("Session data: " . print_r($_SESSION, true));
    error_log("Session ID: " . session_id());
    
    // Authentication check
    try {
        error_log("Step 1: Checking authentication...");
        requireAuth(); // This function doesn't return user data, just checks auth
        error_log("Authentication successful - User ID: " . $_SESSION['user_id']);
    } catch (Exception $e) {
        error_log("Authentication failed: " . $e->getMessage());
        jsonResponse(['error' => 'Authentication required', 'details' => $e->getMessage()], 401);
        return;
    }
    
    // Data extraction and validation
    error_log("Step 2: Extracting and validating data...");
    $title = sanitizeInput($request['title'] ?? '');
    $description = sanitizeInput($request['description'] ?? '');
    $priority = sanitizeInput($request['priority'] ?? 'medium');
    $categoryId = (int)($request['categoryId'] ?? 0);
    $subcategoryId = !empty($request['subcategoryId']) ? (int)$request['subcategoryId'] : null;
    $supportType = sanitizeInput($request['supportType'] ?? 'remote');
    $contactEmail = sanitizeInput($request['contactEmail'] ?? '');
    $contactName = sanitizeInput($request['contactName'] ?? '');
    $contactPhone = sanitizeInput($request['contactPhone'] ?? '');
    $contactDepartment = sanitizeInput($request['contactDepartment'] ?? '');
    
    error_log("Extracted data - title: '$title', description: '$description', categoryId: $categoryId");
    
    // Handle due date
    $dueDate = null;
    if (!empty($request['dueDate'])) {
        try {
            $dueDateTime = new DateTime($request['dueDate']);
            $dueDate = $dueDateTime->format('Y-m-d H:i:s');
            error_log("Due date processed: " . $dueDate);
        } catch (Exception $e) {
            error_log("Invalid due date format: " . $request['dueDate']);
            $dueDate = null;
        }
    }
    
    // Enhanced validation with specific error messages
    $validationErrors = [];
    
    if (empty($title)) {
        $validationErrors[] = 'Title is required and cannot be empty';
    } elseif (strlen($title) < 5) {
        $validationErrors[] = 'Title must be at least 5 characters long';
    } elseif (strlen($title) > 500) {
        $validationErrors[] = 'Title cannot exceed 500 characters';
    }
    
    if (empty($description)) {
        $validationErrors[] = 'Description is required and cannot be empty';
    } elseif (strlen($description) < 20) {
        $validationErrors[] = 'Description must be at least 20 characters long';
    }
    
    if ($categoryId === 0) {
        $validationErrors[] = 'Category is required - please select a valid category';
    }
    
    if (!in_array($priority, ['low', 'medium', 'high'])) {
        $validationErrors[] = 'Priority must be low, medium, or high';
    }
    
    if (!in_array($supportType, ['remote', 'telephonic', 'onsite_visit', 'other'])) {
        $validationErrors[] = 'Support type must be remote, telephonic, onsite_visit, or other';
    }
    
    if (!empty($validationErrors)) {
        error_log("Validation failed: " . implode(', ', $validationErrors));
        jsonResponse([
            'error' => 'Validation failed', 
            'details' => implode('. ', $validationErrors),
            'validation_errors' => $validationErrors
        ], 400);
        return;
    }
    
    // Database operations
    try {
        error_log("Step 3: Establishing database connection...");
        $db = getDb();
        error_log("Database connection successful");
        
        // Verify category exists
        $category = $db->fetchOne("SELECT id FROM categories WHERE id = :id", ['id' => $categoryId]);
        if (!$category) {
            error_log("Category not found: $categoryId");
            jsonResponse([
                'error' => 'Invalid category', 
                'details' => "Category with ID $categoryId does not exist"
            ], 400);
            return;
        }
        error_log("Category verified: ID $categoryId");
        
        // Verify subcategory exists if provided
        if ($subcategoryId !== null) {
            $subcategory = $db->fetchOne("SELECT id FROM categories WHERE id = :id", ['id' => $subcategoryId]);
            if (!$subcategory) {
                error_log("Subcategory not found: $subcategoryId, setting to null");
                $subcategoryId = null; // Set to null if invalid instead of failing
            } else {
                error_log("Subcategory verified: ID $subcategoryId");
            }
        }
        
        // Check if user exists
        $userExists = $db->fetchOne("SELECT id FROM users WHERE id = :id", ['id' => $_SESSION['user_id']]);
        if (!$userExists) {
            error_log("User not found: " . $_SESSION['user_id']);
            jsonResponse([
                'error' => 'Invalid user', 
                'details' => 'User session is invalid'
            ], 400);
            return;
        }
        error_log("User verified: ID " . $_SESSION['user_id']);
        
        // Prepare ticket data
        error_log("Step 4: Preparing ticket data...");
        $ticketData = [
            'title' => $title,
            'description' => $description,
            'status' => 'open',
            'priority' => $priority,
            'support_type' => $supportType,
            'contact_email' => $contactEmail,
            'contact_name' => $contactName,
            'contact_phone' => $contactPhone,
            'contact_department' => $contactDepartment,
            'category_id' => $categoryId,
            'subcategory_id' => $subcategoryId,
            'created_by_id' => $_SESSION['user_id'],
            'assigned_to_id' => null,
            'due_date' => $dueDate,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        error_log("Ticket data prepared: " . print_r($ticketData, true));
        
        // Handle file upload if present
        if (!empty($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            error_log("File upload detected, processing...");
            $uploadDir = '../../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $fileName = time() . '_' . basename($_FILES['attachment']['name']);
            $uploadPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['attachment']['tmp_name'], $uploadPath)) {
                $ticketData['attachment_url'] = '/uploads/' . $fileName;
                $ticketData['attachment_name'] = $_FILES['attachment']['name'];
                error_log("File uploaded successfully: $fileName");
            } else {
                error_log("File upload failed");
                jsonResponse([
                    'error' => 'File upload failed', 
                    'details' => 'Could not save uploaded file'
                ], 500);
                return;
            }
        }
        
        // Insert ticket into database
        error_log("Step 5: Inserting ticket into database...");
        $ticketId = $db->insert('tickets', $ticketData);
        
        if (!$ticketId) {
            error_log("Failed to insert ticket into database");
            jsonResponse([
                'error' => 'Database error', 
                'details' => 'Failed to create ticket in database'
            ], 500);
            return;
        }
        
        error_log("Ticket created successfully with ID: $ticketId");
        
        // Retrieve the created ticket with relations
        $ticket = $db->fetchOne("
            SELECT 
                t.*,
                c.name as category_name,
                sc.name as subcategory_name,
                cb.name as created_by_name
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories sc ON t.subcategory_id = sc.id
            LEFT JOIN users cb ON t.created_by_id = cb.id
            WHERE t.id = :id
        ", ['id' => $ticketId]);
        
        if (!$ticket) {
            error_log("Failed to retrieve created ticket");
            jsonResponse(['error' => 'Ticket created but failed to retrieve'], 500);
            return;
        }
        
        // Transform ticket to match frontend expectations
        $transformedTicket = [
            'id' => (int)$ticket['id'],
            'title' => $ticket['title'],
            'description' => $ticket['description'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'supportType' => $ticket['support_type'],
            'contactEmail' => $ticket['contact_email'],
            'contactName' => $ticket['contact_name'],
            'contactPhone' => $ticket['contact_phone'],
            'contactDepartment' => $ticket['contact_department'],
            'categoryId' => (int)$ticket['category_id'],
            'subcategoryId' => $ticket['subcategory_id'] ? (int)$ticket['subcategory_id'] : null,
            'createdById' => (int)$ticket['created_by_id'],
            'assignedToId' => $ticket['assigned_to_id'] ? (int)$ticket['assigned_to_id'] : null,
            'dueDate' => $ticket['due_date'],
            'attachmentUrl' => $ticket['attachment_url'],
            'attachmentName' => $ticket['attachment_name'],
            'createdAt' => $ticket['created_at'],
            'updatedAt' => $ticket['updated_at'],
            'categoryName' => $ticket['category_name'],
            'subcategoryName' => $ticket['subcategory_name'],
            'createdByName' => $ticket['created_by_name'],
            'category' => [
                'id' => (int)$ticket['category_id'],
                'name' => $ticket['category_name']
            ],
            'subcategory' => $ticket['subcategory_id'] ? [
                'id' => (int)$ticket['subcategory_id'],
                'name' => $ticket['subcategory_name']
            ] : null,
            'createdBy' => [
                'id' => (int)$ticket['created_by_id'],
                'name' => $ticket['created_by_name']
            ]
        ];
        
        error_log("Ticket creation successful: " . print_r($transformedTicket, true));
        jsonResponse($transformedTicket, 201);
        
    } catch (Exception $e) {
        error_log("Database error in handleCreateTicket: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleGetSingleTicket($ticketId) {
    requireAuth();
    
    if (!$ticketId) {
        jsonResponse(['error' => 'Ticket ID is required'], 400);
    }
    
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    $sql = "
        SELECT 
            t.*,
            c.name as category_name,
            sc.name as subcategory_name,
            cb.name as created_by_name,
            cb.email as created_by_email,
            at.name as assigned_to_name,
            at.email as assigned_to_email
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN categories sc ON t.subcategory_id = sc.id
        LEFT JOIN users cb ON t.created_by_id = cb.id
        LEFT JOIN users at ON t.assigned_to_id = at.id
        WHERE t.id = :id
    ";
    
    $params = ['id' => $ticketId];
    
    if ($userRole === 'user') {
        $sql .= " AND (t.created_by_id = :user_id OR t.assigned_to_id = :user_id)";
        $params['user_id'] = $userId;
    }
    
    $ticket = $db->fetchOne($sql, $params);
    
    if (!$ticket) {
        jsonResponse(['error' => 'Ticket not found'], 404);
    }
    
    // Fetch comments for this ticket
    $sql = "
        SELECT 
            c.*,
            u.name as user_name,
            u.email as user_email,
            u.role as user_role
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.ticket_id = ?
    ";
    
    // If user is not admin/agent, hide internal notes
    if ($userRole !== 'admin' && $userRole !== 'agent') {
        $sql .= " AND c.is_internal = 0";
    }
    
    $sql .= " ORDER BY c.created_at ASC";
    
    $comments = $db->fetchAll($sql, [$ticketId]);
    
    // Transform comments
    $transformedComments = array_map(function($comment) {
        return [
            'id' => (int)$comment['id'],
            'ticketId' => (int)$comment['ticket_id'],
            'userId' => (int)$comment['user_id'],
            'comment' => $comment['comment'],
            'isInternal' => (bool)$comment['is_internal'],
            'createdAt' => $comment['created_at'],
            'updatedAt' => $comment['updated_at'],
            'user' => [
                'id' => (int)$comment['user_id'],
                'name' => $comment['user_name'],
                'email' => $comment['user_email'],
                'role' => $comment['user_role']
            ]
        ];
    }, $comments);

    // Transform ticket to match frontend expectations
    $transformedTicket = [
        'id' => (int)$ticket['id'],
        'title' => $ticket['title'],
        'description' => $ticket['description'],
        'status' => $ticket['status'],
        'priority' => $ticket['priority'],
        'supportType' => $ticket['support_type'],
        'contactEmail' => $ticket['contact_email'],
        'contactName' => $ticket['contact_name'],
        'contactPhone' => $ticket['contact_phone'],
        'contactDepartment' => $ticket['contact_department'],
        'categoryId' => (int)$ticket['category_id'],
        'subcategoryId' => $ticket['subcategory_id'] ? (int)$ticket['subcategory_id'] : null,
        'createdById' => (int)$ticket['created_by_id'],
        'assignedToId' => $ticket['assigned_to_id'] ? (int)$ticket['assigned_to_id'] : null,
        'dueDate' => $ticket['due_date'],
        'attachmentUrl' => $ticket['attachment_url'],
        'attachmentName' => $ticket['attachment_name'],
        'createdAt' => $ticket['created_at'],
        'updatedAt' => $ticket['updated_at'],
        'categoryName' => $ticket['category_name'],
        'subcategoryName' => $ticket['subcategory_name'],
        'createdByName' => $ticket['created_by_name'],
        'createdByEmail' => $ticket['created_by_email'],
        'assignedToName' => $ticket['assigned_to_name'],
        'assignedToEmail' => $ticket['assigned_to_email'],
        'comments' => $transformedComments,
        'category' => [
            'id' => (int)$ticket['category_id'],
            'name' => $ticket['category_name']
        ],
        'subcategory' => $ticket['subcategory_id'] ? [
            'id' => (int)$ticket['subcategory_id'],
            'name' => $ticket['subcategory_name']
        ] : null,
        'createdBy' => [
            'id' => (int)$ticket['created_by_id'],
            'name' => $ticket['created_by_name'],
            'email' => $ticket['created_by_email']
        ],
        'assignedTo' => $ticket['assigned_to_id'] ? [
            'id' => (int)$ticket['assigned_to_id'],
            'name' => $ticket['assigned_to_name'],
            'email' => $ticket['assigned_to_email']
        ] : null
    ];
    
    jsonResponse($transformedTicket);
}

function handleUpdateTicket($ticketId, $request) {
    requireAuth();
    
    if (!$ticketId) {
        jsonResponse(['error' => 'Ticket ID is required'], 400);
    }
    
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Check if ticket exists and user has permission to update it
    $ticket = $db->fetchOne("
        SELECT id, created_by_id, assigned_to_id, status 
        FROM tickets 
        WHERE id = ?
    ", [$ticketId]);
    
    if (!$ticket) {
        jsonResponse(['error' => 'Ticket not found'], 404);
    }
    
    // Permission check: admin can update any ticket, users can only update their own or assigned tickets
    if ($userRole !== 'admin' && $userRole !== 'agent' && 
        $ticket['created_by_id'] != $userId && $ticket['assigned_to_id'] != $userId) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    try {
        $updateData = [];
        $allowedFields = ['title', 'description', 'status', 'priority', 'assignedToId', 'dueDate'];
        
        foreach ($allowedFields as $field) {
            if (isset($request[$field])) {
                switch ($field) {
                    case 'assignedToId':
                        $updateData['assigned_to_id'] = !empty($request[$field]) ? (int)$request[$field] : null;
                        break;
                    case 'dueDate':
                        $updateData['due_date'] = !empty($request[$field]) ? $request[$field] : null;
                        break;
                    default:
                        $updateData[$field] = $request[$field];
                }
            }
        }
        
        if (!empty($updateData)) {
            $updateData['updated_at'] = date('Y-m-d H:i:s');
            $db->update('tickets', $updateData, 'id = :ticket_id', ['ticket_id' => $ticketId]);
        }
        
        // Fetch updated ticket with relations
        $updatedTicket = $db->fetchOne("
            SELECT 
                t.*,
                c.name as category_name,
                sc.name as subcategory_name,
                cb.name as created_by_name,
                cb.email as created_by_email,
                at.name as assigned_to_name,
                at.email as assigned_to_email
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories sc ON t.subcategory_id = sc.id
            LEFT JOIN users cb ON t.created_by_id = cb.id
            LEFT JOIN users at ON t.assigned_to_id = at.id
            WHERE t.id = ?
        ", [$ticketId]);
        
        $transformedTicket = [
            'id' => (int)$updatedTicket['id'],
            'title' => $updatedTicket['title'],
            'description' => $updatedTicket['description'],
            'status' => $updatedTicket['status'],
            'priority' => $updatedTicket['priority'],
            'supportType' => $updatedTicket['support_type'],
            'contactEmail' => $updatedTicket['contact_email'],
            'contactName' => $updatedTicket['contact_name'],
            'contactPhone' => $updatedTicket['contact_phone'],
            'contactDepartment' => $updatedTicket['contact_department'],
            'categoryId' => (int)$updatedTicket['category_id'],
            'subcategoryId' => $updatedTicket['subcategory_id'] ? (int)$updatedTicket['subcategory_id'] : null,
            'createdById' => (int)$updatedTicket['created_by_id'],
            'assignedToId' => $updatedTicket['assigned_to_id'] ? (int)$updatedTicket['assigned_to_id'] : null,
            'dueDate' => $updatedTicket['due_date'],
            'attachmentUrl' => $updatedTicket['attachment_url'],
            'attachmentName' => $updatedTicket['attachment_name'],
            'createdAt' => $updatedTicket['created_at'],
            'updatedAt' => $updatedTicket['updated_at'],
            'categoryName' => $updatedTicket['category_name'],
            'subcategoryName' => $updatedTicket['subcategory_name'],
            'createdByName' => $updatedTicket['created_by_name'],
            'createdByEmail' => $updatedTicket['created_by_email'],
            'assignedToName' => $updatedTicket['assigned_to_name'],
            'assignedToEmail' => $updatedTicket['assigned_to_email'],
            'category' => [
                'id' => (int)$updatedTicket['category_id'],
                'name' => $updatedTicket['category_name']
            ],
            'subcategory' => $updatedTicket['subcategory_id'] ? [
                'id' => (int)$updatedTicket['subcategory_id'],
                'name' => $updatedTicket['subcategory_name']
            ] : null,
            'createdBy' => [
                'id' => (int)$updatedTicket['created_by_id'],
                'name' => $updatedTicket['created_by_name'],
                'email' => $updatedTicket['created_by_email']
            ],
            'assignedTo' => $updatedTicket['assigned_to_id'] ? [
                'id' => (int)$updatedTicket['assigned_to_id'],
                'name' => $updatedTicket['assigned_to_name'],
                'email' => $updatedTicket['assigned_to_email']
            ] : null
        ];
        
        jsonResponse($transformedTicket);
        
    } catch (Exception $e) {
        error_log("Database error in handleUpdateTicket: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleDeleteTicket($ticketId) {
    requireAuth();
    
    if (!$ticketId) {
        jsonResponse(['error' => 'Ticket ID is required'], 400);
    }
    
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Check if ticket exists and user has permission to delete it
    $ticket = $db->fetchOne("
        SELECT id, created_by_id, assigned_to_id 
        FROM tickets 
        WHERE id = ?
    ", [$ticketId]);
    
    if (!$ticket) {
        jsonResponse(['error' => 'Ticket not found'], 404);
    }
    
    // Only admin can delete tickets, or users can delete their own unassigned tickets
    if ($userRole !== 'admin' && 
        ($ticket['created_by_id'] != $userId || $ticket['assigned_to_id'] !== null)) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    try {
        // Delete related comments first
        $db->query("DELETE FROM comments WHERE ticket_id = ?", [$ticketId]);
        
        // Delete the ticket
        $db->query("DELETE FROM tickets WHERE id = ?", [$ticketId]);
        
        jsonResponse(['message' => 'Ticket deleted successfully']);
        
    } catch (Exception $e) {
        error_log("Database error in handleDeleteTicket: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleGetComments($ticketId) {
    requireAuth();
    
    if (!$ticketId) {
        jsonResponse(['error' => 'Ticket ID is required'], 400);
    }
    
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Check if user has access to this ticket
    $ticket = $db->fetchOne("
        SELECT id, created_by_id, assigned_to_id 
        FROM tickets 
        WHERE id = ?
    ", [$ticketId]);
    
    if (!$ticket) {
        jsonResponse(['error' => 'Ticket not found'], 404);
    }
    
    // Permission check: admin/agent can see all comments, users can see comments on their tickets
    if ($userRole !== 'admin' && $userRole !== 'agent' && 
        $ticket['created_by_id'] != $userId && $ticket['assigned_to_id'] != $userId) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    try {
        $sql = "
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
        ";
        
        // If user is not admin/agent, hide internal notes
        if ($userRole !== 'admin' && $userRole !== 'agent') {
            $sql .= " AND c.is_internal = 0";
        }
        
        $sql .= " ORDER BY c.created_at ASC";
        
        $comments = $db->fetchAll($sql, [$ticketId]);
        
        $transformedComments = array_map(function($comment) {
            return [
                'id' => (int)$comment['id'],
                'ticketId' => (int)$comment['ticket_id'],
                'userId' => (int)$comment['user_id'],
                'comment' => $comment['comment'],
                'isInternal' => (bool)$comment['is_internal'],
                'createdAt' => $comment['created_at'],
                'updatedAt' => $comment['updated_at'],
                'user' => [
                    'id' => (int)$comment['user_id'],
                    'name' => $comment['user_name'],
                    'email' => $comment['user_email'],
                    'role' => $comment['user_role']
                ]
            ];
        }, $comments);
        
        jsonResponse($transformedComments);
        
    } catch (Exception $e) {
        error_log("Database error in handleGetComments: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleCreateComment($ticketId, $request) {
    requireAuth();
    
    if (!$ticketId) {
        jsonResponse(['error' => 'Ticket ID is required'], 400);
    }
    
    $comment = trim($request['comment'] ?? '');
    $isInternal = (bool)($request['isInternal'] ?? false);
    
    if (empty($comment)) {
        jsonResponse(['error' => 'Comment is required'], 400);
    }
    
    $db = getDb();
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'];
    
    // Check if ticket exists and user has permission to comment
    $ticket = $db->fetchOne("
        SELECT id, created_by_id, assigned_to_id 
        FROM tickets 
        WHERE id = ?
    ", [$ticketId]);
    
    if (!$ticket) {
        jsonResponse(['error' => 'Ticket not found'], 404);
    }
    
    // Permission check: admin/agent can comment on any ticket, users can comment on their tickets
    if ($userRole !== 'admin' && $userRole !== 'agent' && 
        $ticket['created_by_id'] != $userId && $ticket['assigned_to_id'] != $userId) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    // Only admin and agents can create internal notes
    if ($isInternal && $userRole !== 'admin' && $userRole !== 'agent') {
        $isInternal = false;
    }
    
    try {
        $commentData = [
            'ticket_id' => $ticketId,
            'user_id' => $userId,
            'comment' => $comment,
            'is_internal' => $isInternal ? 1 : 0,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $commentId = $db->insert('comments', $commentData);
        
        // Update ticket's updated_at timestamp
        $db->update('tickets', 
            ['updated_at' => date('Y-m-d H:i:s')], 
            'id = :ticket_id',
            ['ticket_id' => $ticketId]
        );
        
        // Fetch the created comment with user info
        $createdComment = $db->fetchOne("
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ", [$commentId]);
        
        $transformedComment = [
            'id' => (int)$createdComment['id'],
            'ticketId' => (int)$createdComment['ticket_id'],
            'userId' => (int)$createdComment['user_id'],
            'comment' => $createdComment['comment'],
            'isInternal' => (bool)$createdComment['is_internal'],
            'createdAt' => $createdComment['created_at'],
            'updatedAt' => $createdComment['updated_at'],
            'user' => [
                'id' => (int)$createdComment['user_id'],
                'name' => $createdComment['user_name'],
                'email' => $createdComment['user_email'],
                'role' => $createdComment['user_role']
            ]
        ];
        
        jsonResponse($transformedComment, 201);
        
    } catch (Exception $e) {
        error_log("Database error in handleCreateComment: " . $e->getMessage());
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}
?>