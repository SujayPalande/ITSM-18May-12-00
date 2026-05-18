<?php
/**
 * Email Notification Helper Functions
 * IT Helpdesk Portal - PHP Backend
 */

/**
 * Format an ISO/DB timestamp for email display in a target timezone.
 * Defaults to Asia/Kolkata for user-friendly display in the project's primary region.
 * Accepts either an ISO string (e.g. 2025-11-11T08:00:00Z) or a DB datetime string (Y-m-d H:i:s).
 */
function formatTimestampForEmail($dateValue = null, $targetTz = 'Asia/Kolkata') {
    try {
        if (empty($dateValue)) {
            // Use current UTC time if none provided
            $dt = new DateTime('now', new DateTimeZone('UTC'));
        } else {
            // Let DateTime parse the incoming value (ISO or DB string)
            $dt = new DateTime($dateValue);
        }
        // Convert to target timezone
        $dt->setTimezone(new DateTimeZone($targetTz));
        return $dt->format('F j, Y \a\t g:i A') . " ({$targetTz})";
    } catch (Exception $e) {
        // Fallback to server-local formatted time
        return date('F j, Y \a\t g:i A');
    }
}


require_once dirname(__DIR__) . '/lib/mailer.php';

/**
 * Send email notification using PHPMailer via centralized lib/mailer.php
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $message HTML email content
 * @return bool True if email was sent successfully, false otherwise
 */
function sendEmailNotification($to, $subject, $message) {
    // Attempt to use the robust centralized mailer
    $result = send_mail($to, "ITSM Portal User", $subject, $message, [
        'fromName' => 'ITSM Portal'
    ]);
    
    if ($result['success']) {
        error_log("Email notification sent successfully via SMTP to: $to");
        return true;
    } else {
        error_log("SMTP Mail failure for $to: " . ($result['error'] ?? 'Unknown error'));
        return false;
    }
}

/**
 * Generate HTML email template with consistent styling
 * 
 * @param string $title Email title
 * @param string $content Email content/body
 * @param string $footer Optional footer text
 * @return string HTML email template
 */
function generateEmailTemplate($title, $content, $footer = "") {
    $template = "
    <html>
      <body style='background:linear-gradient(135deg,#e0e7ff 0%,#f8fafc 100%);margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;'>
        <div style='max-width:520px;margin:48px auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px #c7d2fe;padding:48px 32px;text-align:center;'>
          <div style='margin-bottom:32px;'>
            <img src='https://cybaemtech.com/assets/img/cybaem/logo-dark.png' alt='Cybaemtech Logo' style='height:40px;'/>
          </div>
          <h1 style='color:#2563eb;margin-bottom:18px;font-size:2rem;'>$title</h1>
          <div style='color:#334155;font-size:18px;margin-bottom:32px;line-height:1.6;text-align:left;'>
            $content
          </div>
          <div style='margin-top:36px;padding-top:24px;border-top:1px solid #e2e8f0;'>
            <div style='margin-bottom:20px;'>
               <a href='https://itsm.cybaemtech.app/' style='display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>🚀 Open ITSM Portal</a>
            </div>
            <p style='color:#64748b;font-size:15px;margin-bottom:0;'>
              $footer<br><br>
              Thanks,<br>
              <span style='color:#2563eb;font-weight:bold;'>ITSM Helpdesk Team</span>
            </p>
          </div>
          <hr style='margin:40px 0 24px 0;border:none;border-top:1px solid #e2e8f0;'/>
          <p style='color:#94a3b8;font-size:13px;'>
            &copy; 2026 Cybaemtech ITSM. All rights reserved.
          </p>
        </div>
      </body>
    </html>
    ";
    
    return $template;
}

/**
 * Notify admin about user management changes
 * 
 * @param string $action Action performed (created, updated, deleted)
 * @param array $userData User data
 * @param string $adminEmail Admin email address
 * @return bool True if email was sent successfully
 */
function notifyAdminUserManagement($action, $userData, $adminEmail) {
    $actionText = ucfirst($action);
    $title = "User Management Alert - $actionText";
    
    // Get the person who performed the action
    $performedBy = $_SESSION['user_name'] ?? $_SESSION['username'] ?? 'System';
    $performedByRole = $_SESSION['user_role'] ?? 'Unknown';
    $performedByEmail = $_SESSION['user_email'] ?? 'N/A';
    
    // Action-specific content and styling
    $actionIcon = '';
    $actionColor = '';
    $actionDescription = '';
    
    switch ($action) {
        case 'created':
            $actionIcon = '👤';
            $actionColor = '#22c55e';
            $actionDescription = 'A new user account has been created in the system.';
            break;
        case 'updated':
            $actionIcon = '✏️';
            $actionColor = '#3b82f6';
            $actionDescription = 'An existing user account has been modified.';
            break;
        case 'deleted':
            $actionIcon = '🗑️';
            $actionColor = '#ef4444';
            $actionDescription = 'A user account has been permanently removed from the system.';
            break;
        default:
            $actionIcon = '📋';
            $actionColor = '#6b7280';
            $actionDescription = 'A user management operation has been performed.';
    }
    
    $content = "
    <div style='background: linear-gradient(135deg, {$actionColor}15 0%, {$actionColor}05 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid {$actionColor};'>
        <h2 style='color: {$actionColor}; margin: 0 0 12px 0; font-size: 1.5rem; display: flex; align-items: center;'>
            <span style='margin-right: 8px; font-size: 1.8rem;'>{$actionIcon}</span>
            User {$actionText}
        </h2>
        <p style='color: #64748b; margin: 0; font-size: 16px;'>{$actionDescription}</p>
    </div>
    
    <div style='background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;'>" . ($action === 'deleted' ? 'Deleted User Details:' : 'User Details:') . "</h3>
        " . ($action === 'deleted' ? "<p style='color: #ef4444; font-size: 14px; margin: 0 0 16px 0; font-style: italic; background: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #ef4444;'>⚠️ <strong>Note:</strong> This user account has been permanently deleted from the system.</p>" : "") . "
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569; width: 140px;'>Name:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['name']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Email:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['email']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Username:</td>
                <td style='padding: 8px 0; color: #1e293b; font-family: monospace;'>" . htmlspecialchars($userData['username']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Role:</td>
                <td style='padding: 8px 0;'>
                    <span style='background: " . getRoleColor($userData['role']) . "; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;'>
                        " . htmlspecialchars($userData['role']) . "
                    </span>
                </td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Department:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['department']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Company:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['companyName']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Contact:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['contactNumber']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Designation:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['designation']) . "</td>
            </tr>
        </table>
    </div>
    
    <div style='background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px;'>Action Details:</h3>
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569; width: 140px;'>Performed by:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($performedBy) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Role:</td>
                <td style='padding: 8px 0;'>
                    <span style='background: " . getRoleColor($performedByRole) . "; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;'>
                        " . htmlspecialchars($performedByRole) . "
                    </span>
                </td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Email:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($performedByEmail) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Date & Time:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . date('F j, Y \a\t g:i A') . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>IP Address:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . ($_SERVER['REMOTE_ADDR'] ?? 'N/A') . "</td>
            </tr>
        </table>
    </div>
    
    <div style='background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px; border-radius: 8px; text-align: center;'>
        <a href='https://itsm.cybaemtech.app/admin/users' 
           style='color: white; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3);'>
            📊 View User Management Dashboard
        </a>
    </div>
    ";
    
    $footer = "This is an automated security notification about user management activities in the ITSM Portal. All user management actions are logged and monitored for security purposes.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "🚨 ITSM Portal - User Management Alert: User " . $actionText . " - " . ($userData['name'] ?? 'Unknown User');
    
    return sendEmailNotification($adminEmail, $subject, $message);
}

/**
 * Send welcome email with credentials to newly created user
 * 
 * @param array $userData User data including credentials
 * @param string $verificationLink Email verification link
 * @return bool True if email was sent successfully
 */
function sendUserWelcomeEmail($userData, $verificationLink) {
    $title = "Welcome to ITSM Helpdesk Portal! 🎉";
    
    $content = "
    <div style='background: linear-gradient(135deg, #22c55e15 0%, #22c55e05 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #22c55e;'>
        <h2 style='color: #22c55e; margin: 0 0 12px 0; font-size: 1.5rem; display: flex; align-items: center;'>
            <span style='margin-right: 8px; font-size: 1.8rem;'>🎉</span>
            Account Created Successfully!
        </h2>
        <p style='color: #64748b; margin: 0; font-size: 16px;'>Your account has been created by an administrator. Welcome to the ITSM Helpdesk Portal!</p>
    </div>
    
    <div style='text-align: center; margin-bottom: 24px;'>
        <p style='color: #334155; font-size: 18px; margin-bottom: 16px;'>
            Hello <strong style='color: #2563eb;'>" . htmlspecialchars($userData['name']) . "</strong>! 👋
        </p>
        <p style='color: #64748b; font-size: 16px; line-height: 1.6;'>
            Your account has been successfully created in our IT Helpdesk Portal. You can now submit tickets, track issues, and get support from our team.
        </p>
    </div>
    
    <div style='background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #e2e8f0;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem; text-align: center;'>🔐 Your Login Credentials</h3>
        <div style='background: white; padding: 16px; border-radius: 6px; border: 1px solid #cbd5e1;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 12px 0; font-weight: 600; color: #475569; width: 120px; border-bottom: 1px solid #f1f5f9;'>Username:</td>
                    <td style='padding: 12px 0; color: #2563eb; font-weight: 600; font-family: monospace; font-size: 16px; border-bottom: 1px solid #f1f5f9;'>" . htmlspecialchars($userData['username']) . "</td>
                </tr>
                <tr>
                    <td style='padding: 12px 0; font-weight: 600; color: #475569;'>Password:</td>
                    <td style='padding: 12px 0; color: #22c55e; font-weight: 600; font-family: monospace; font-size: 16px;'>" . htmlspecialchars($userData['password']) . "</td>
                </tr>
            </table>
        </div>
        <p style='color: #ef4444; font-size: 14px; margin: 12px 0 0 0; font-style: italic; text-align: center;'>
            ⚠️ Please save these credentials securely and change your password after first login.
        </p>
    </div>
    
    <div style='background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem;'>📋 Your Account Details:</h3>
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569; width: 120px;'>Role:</td>
                <td style='padding: 8px 0;'>
                    <span style='background: " . getRoleColor($userData['role'] ?? 'user') . "; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;'>
                        " . htmlspecialchars($userData['role'] ?? 'User') . "
                    </span>
                </td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Email:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['email']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Department:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['department'] ?? 'N/A') . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Company:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['companyName'] ?? 'N/A') . "</td>
            </tr>
        </table>
    </div>
    
    <div style='background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;'>
        <h3 style='color: white; margin: 0 0 16px 0; font-size: 1.2rem;'>🚀 Get Started Now!</h3>
        <p style='color: rgba(255,255,255,0.9); margin: 0 0 20px 0; font-size: 14px;'>
            Click the button below to verify your email address and activate your account:
        </p>
        <a href='" . $verificationLink . "' 
           style='color: white; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; background: rgba(255,255,255,0.2); padding: 14px 28px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3); transition: all 0.3s ease;'>
            ✅ Verify Email & Activate Account
        </a>
    </div>
    
    <div style='background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 24px;'>
        <h4 style='color: #92400e; margin: 0 0 8px 0; font-size: 1rem;'>📱 What's Next?</h4>
        <ul style='color: #78350f; margin: 0; padding-left: 20px; font-size: 14px;'>
            <li>Verify your email address by clicking the button above</li>
            <li>Log in to the portal using your credentials</li>
            <li>Complete your profile information</li>
            <li>Submit your first support ticket if needed</li>
            <li>Explore the knowledge base for common solutions</li>
        </ul>
    </div>
    ";
    
    $footer = "Welcome to our IT Helpdesk Portal! If you have any questions about using the system, please don't hesitate to contact our support team. We're here to help you get the most out of our platform.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "🎉 Welcome to ITSM Portal - Your Account is Ready! Please Verify Email";
    
    return sendEmailNotification($userData['email'], $subject, $message);
}

/**
 * Notify user about ticket creation
 * 
 * @param array $ticketData Ticket data
 * @param array $userData User data
 * @return bool True if email was sent successfully
 */
function notifyUserTicketCreation($ticketData, $userData) {
    $title = "New Ticket Created - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($userData['name']) . "</strong>,</p>";
    $content .= "<p>A new ticket has been created in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Description:</strong> " . htmlspecialchars($ticketData['description']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Created by:</strong> " . htmlspecialchars($ticketData['createdBy']['name'] ?? 'System') . "</li>";
    // Try to use ticket's createdAt when provided; fall back to current time.
    $createdAtForEmail = $ticketData['createdAt'] ?? null;
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail($createdAtForEmail) . "</li>";
    $content .= "</ul>";
    $content .= "<p>You can view and track this ticket in the ITSM Portal.</p>";
    
    $footer = "This is an automated notification about a new ticket created in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - New Ticket Created: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($userData['email'], $subject, $message);
}

/**
 * Notify admin about ticket creation
 * 
 * @param array $ticketData Ticket data
 * @param array $adminData Admin data
 * @return bool True if email was sent successfully
 */
function notifyAdminTicketCreation($ticketData, $adminData) {
    $title = "New Ticket Created - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($adminData['name']) . "</strong>,</p>";
    $content .= "<p>A new ticket has been created in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Description:</strong> " . htmlspecialchars($ticketData['description']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Created by:</strong> " . htmlspecialchars($ticketData['createdBy']['name'] ?? 'System') . "</li>";
    $content .= "<li><strong>User Email:</strong> " . htmlspecialchars($ticketData['createdBy']['email'] ?? 'N/A') . "</li>";
    $createdAtForEmail = $ticketData['createdAt'] ?? null;
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail($createdAtForEmail) . "</li>";
    $content .= "</ul>";
    $content .= "<p>You can manage this ticket in the ITSM Portal.</p>";
    
    $footer = "This is an automated notification about a new ticket created in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - New Ticket Created: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($adminData['email'], $subject, $message);
}

/**
 * Notify agent about ticket assignment
 * 
 * @param array $ticketData Ticket data
 * @param array $agentData Agent data
 * @return bool True if email was sent successfully
 */
function notifyAgentTicketAssignment($ticketData, $agentData) {
    $title = "Ticket Assigned to You - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($agentData['name']) . "</strong>,</p>";
    $content .= "<p>A ticket has been assigned to you in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Description:</strong> " . htmlspecialchars($ticketData['description']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Assigned by:</strong> " . htmlspecialchars($_SESSION['user_name'] ?? 'System') . "</li>";
    $createdAtForEmail = $ticketData['createdAt'] ?? null;
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail($createdAtForEmail) . "</li>";
    $content .= "</ul>";
    $content .= "<p>Please review and take appropriate action on this ticket.</p>";
    
    $footer = "This is an automated notification about a ticket assigned to you in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - Ticket Assigned: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($agentData['email'], $subject, $message);
}

/**
 * Notify user about ticket assignment
 * 
 * @param array $ticketData Ticket data
 * @param array $userData User data
 * @return bool True if email was sent successfully
 */
function notifyUserTicketAssignment($ticketData, $userData) {
    $title = "Your Ticket Has Been Assigned - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($userData['name']) . "</strong>,</p>";
    $content .= "<p>Your ticket has been assigned to an agent in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Description:</strong> " . htmlspecialchars($ticketData['description']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Assigned Agent:</strong> " . htmlspecialchars($ticketData['assignedTo']['name'] ?? 'N/A') . "</li>";
    $createdAtForEmail = $ticketData['createdAt'] ?? null;
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail($createdAtForEmail) . "</li>";
    $content .= "</ul>";
    $content .= "<p>Your ticket is now being processed. You will receive updates as the agent works on it.</p>";
    
    $footer = "This is an automated notification about your ticket assignment in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - Your Ticket Assigned: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($userData['email'], $subject, $message);
}

/**
 * Notify admin about ticket assignment
 * 
 * @param array $ticketData Ticket data
 * @param array $adminData Admin data
 * @return bool True if email was sent successfully
 */
function notifyAdminTicketAssignment($ticketData, $adminData) {
    $title = "Ticket Assignment Update - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($adminData['name']) . "</strong>,</p>";
    $content .= "<p>A ticket assignment has been updated in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Description:</strong> " . htmlspecialchars($ticketData['description']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Assigned Agent:</strong> " . htmlspecialchars($ticketData['assignedTo']['name'] ?? 'Unassigned') . "</li>";
    $content .= "<li><strong>Assigned by:</strong> " . htmlspecialchars($_SESSION['user_name'] ?? 'System') . "</li>";
    $createdAtForEmail = $ticketData['createdAt'] ?? null;
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail($createdAtForEmail) . "</li>";
    $content .= "</ul>";
    $content .= "<p>You can monitor this ticket assignment in the ITSM Portal.</p>";
    
    $footer = "This is an automated notification about a ticket assignment update in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - Ticket Assignment Update: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($adminData['email'], $subject, $message);
}

/**
 * Get role-specific color for badges
 * 
 * @param string $role User role
 * @return string Hex color code
 */
function getRoleColor($role) {
    switch (strtolower($role)) {
        case 'admin':
            return '#dc2626'; // Red
        case 'agent':
            return '#2563eb'; // Blue
        case 'user':
        default:
            return '#059669'; // Green
    }
}

/**
 * Notify user about their account update
 * 
 * @param array $userData Updated user data
 * @param array $updatedFields List of fields that were changed
 * @return bool True if email was sent successfully
 */
function notifyUserAccountUpdate($userData, $updatedFields = []) {
    $title = "Your Account Has Been Updated 📝";
    
    // Get the person who performed the action
    $performedBy = $_SESSION['user_name'] ?? $_SESSION['username'] ?? 'Administrator';
    $performedByRole = $_SESSION['user_role'] ?? 'Admin';
    
    $content = "
    <div style='background: linear-gradient(135deg, #3b82f615 0%, #3b82f605 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #3b82f6;'>
        <h2 style='color: #3b82f6; margin: 0 0 12px 0; font-size: 1.5rem; display: flex; align-items: center;'>
            <span style='margin-right: 8px; font-size: 1.8rem;'>📝</span>
            Account Updated
        </h2>
        <p style='color: #64748b; margin: 0; font-size: 16px;'>Your account information has been updated by an administrator.</p>
    </div>
    
    <div style='text-align: center; margin-bottom: 24px;'>
        <p style='color: #334155; font-size: 18px; margin-bottom: 16px;'>
            Hello <strong style='color: #2563eb;'>" . htmlspecialchars($userData['name']) . "</strong>! 👋
        </p>
        <p style='color: #64748b; font-size: 16px; line-height: 1.6;'>
            An administrator has made changes to your account in the ITSM Helpdesk Portal. Here are the current details of your account:
        </p>
    </div>
    
    <div style='background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;'>📋 Your Current Account Details:</h3>
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569; width: 140px;'>Name:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['name']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Email:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['email']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Username:</td>
                <td style='padding: 8px 0; color: #1e293b; font-family: monospace;'>" . htmlspecialchars($userData['username']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Role:</td>
                <td style='padding: 8px 0;'>
                    <span style='background: " . getRoleColor($userData['role']) . "; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;'>
                        " . htmlspecialchars($userData['role']) . "
                    </span>
                </td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Department:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['department']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Company:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['companyName']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Contact:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['contactNumber']) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Designation:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($userData['designation']) . "</td>
            </tr>
        </table>
    </div>
    ";
    
    if (!empty($updatedFields)) {
        $content .= "
        <div style='background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 24px;'>
            <h4 style='color: #92400e; margin: 0 0 8px 0; font-size: 1rem;'>📝 Fields Updated:</h4>
            <ul style='color: #78350f; margin: 0; padding-left: 20px; font-size: 14px;'>";
        
        foreach ($updatedFields as $field) {
            $content .= "<li>" . htmlspecialchars($field) . "</li>";
        }
        
        $content .= "
            </ul>
        </div>";
    }
    
    $content .= "
    <div style='background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px;'>
        <h3 style='color: #334155; margin: 0 0 16px 0; font-size: 1.2rem; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px;'>👤 Update Performed By:</h3>
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569; width: 100px;'>Name:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . htmlspecialchars($performedBy) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Role:</td>
                <td style='padding: 8px 0;'>
                    <span style='background: " . getRoleColor($performedByRole) . "; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;'>
                        " . htmlspecialchars($performedByRole) . "
                    </span>
                </td>
            </tr>
            <tr>
                <td style='padding: 8px 0; font-weight: 600; color: #475569;'>Date & Time:</td>
                <td style='padding: 8px 0; color: #1e293b;'>" . date('F j, Y \a\t g:i A') . "</td>
            </tr>
        </table>
    </div>
    
    <div style='background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;'>
        <a href='https://itsm.cybaemtech.app/' 
           style='color: white; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3);'>
            🚀 Access Your Portal
        </a>
    </div>
    
    <div style='background: #dbeafe; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;'>
        <p style='color: #1e40af; margin: 0; font-size: 14px;'>
            ℹ️ <strong>Note:</strong> If you notice any unauthorized changes or have questions about these updates, please contact your system administrator immediately.
        </p>
    </div>
    ";
    
    $footer = "This is an automated notification about changes to your account in the ITSM Portal. If you did not expect these changes, please contact your administrator.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "📝 ITSM Portal - Your Account Has Been Updated";
    
    return sendEmailNotification($userData['email'], $subject, $message);
}

/**
 * Notify about ticket status/priority update
 */
function notifyTicketStatusUpdate($ticketData, $recipientEmail, $recipientName, $changes = []) {
    $title = "Ticket Updated - ITSM Portal";
    
    $changesHtml = '';
    if (!empty($changes)) {
        $changesHtml = "<div style='background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 16px;'>
            <h4 style='color: #92400e; margin: 0 0 8px 0;'>📝 Changes Made:</h4>
            <ul style='color: #78350f; margin: 0; padding-left: 20px; font-size: 14px;'>";
        foreach ($changes as $field => $vals) {
            $changesHtml .= "<li><strong>" . htmlspecialchars(ucfirst($field)) . ":</strong> " 
                . htmlspecialchars($vals['from'] ?? 'N/A') . " → <strong>" . htmlspecialchars($vals['to'] ?? 'N/A') . "</strong></li>";
        }
        $changesHtml .= "</ul></div>";
    }
    
    $content = "<p>Hello <strong>" . htmlspecialchars($recipientName) . "</strong>,</p>";
    $content .= "<p>A ticket has been updated in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Status:</strong> " . ucfirst($ticketData['status']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Updated by:</strong> " . htmlspecialchars($_SESSION['user_name'] ?? 'System') . "</li>";
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail() . "</li>";
    $content .= "</ul>";
    $content .= $changesHtml;
    $content .= "<p>You can view the ticket details in the ITSM Portal.</p>";
    
    $footer = "This is an automated notification about a ticket update in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - Ticket Updated: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($recipientEmail, $subject, $message);
}

/**
 * Notify about ticket closure
 */
function notifyTicketClosed($ticketData, $recipientEmail, $recipientName) {
    $title = "Ticket Closed - ITSM Portal";
    
    $content = "<p>Hello <strong>" . htmlspecialchars($recipientName) . "</strong>,</p>";
    $content .= "<p>A ticket has been <strong style='color:#22c55e;'>closed</strong> in the ITSM Portal:</p>";
    $content .= "<ul style='text-align:left;'>";
    $content .= "<li><strong>Ticket ID:</strong> #" . $ticketData['id'] . "</li>";
    $content .= "<li><strong>Title:</strong> " . htmlspecialchars($ticketData['title']) . "</li>";
    $content .= "<li><strong>Priority:</strong> " . ucfirst($ticketData['priority']) . "</li>";
    $content .= "<li><strong>Closed by:</strong> " . htmlspecialchars($_SESSION['user_name'] ?? 'System') . "</li>";
    $content .= "<li><strong>Date/Time:</strong> " . formatTimestampForEmail() . "</li>";
    $content .= "</ul>";
    $content .= "<div style='background: #dcfce7; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;'>
        <p style='color: #166534; margin: 0; font-size: 14px;'>✅ This ticket has been resolved and closed. If you need further assistance, please create a new ticket.</p>
    </div>";
    
    $footer = "This is an automated notification about a ticket closure in the ITSM Portal.";
    
    $message = generateEmailTemplate($title, $content, $footer);
    $subject = "ITSM Portal - Ticket Closed: #" . $ticketData['id'] . " - " . $ticketData['title'];
    
    return sendEmailNotification($recipientEmail, $subject, $message);
}
?>