<?php
/**
 * Enhanced Email Helper Functions
 * IT Helpdesk Portal - PHP Backend
 */

require_once dirname(__DIR__) . '/config/config.php';

/**
 * Enhanced version of sendEmailNotification with improved MIME formatting
 * and SPF/DKIM compatibility
 */
function sendEnhancedEmail($to, $subject, $message, $extras = []) {
    // Generate unique boundary for multipart message
    $boundary = md5(uniqid(time()));
    
    // Base headers required for all emails
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'From: ITSM Helpdesk <support@cybaemtech.com>',
        'Reply-To: support@cybaemtech.com',
        'Return-Path: support@cybaemtech.com',
        'Message-ID: <' . time() . '-' . md5(uniqid(rand(), true)) . '@cybaemtech.com>',
        'X-Mailer: PHP/' . phpversion(),
        'Date: ' . date('r'),
        'X-Priority: 1 (Highest)',
        'X-MSMail-Priority: High',
        'Importance: High'
    ];
    
    // Add any extra headers
    if (!empty($extras['headers'])) {
        $headers = array_merge($headers, $extras['headers']);
    }
    
    // Convert HTML message to plain text
    $plainText = strip_tags(str_replace(['<br>', '</p>'], ["\n", "\n\n"], $message));
    
    // Construct multipart message
    $body = "";
    
    // Plain text part
    $body .= "--" . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
    $body .= quoted_printable_encode($plainText) . "\r\n\r\n";
    
    // HTML part
    $body .= "--" . $boundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
    $body .= quoted_printable_encode($message) . "\r\n\r\n";
    
    // Close boundary
    $body .= "--" . $boundary . "--\r\n";
    
    // Normalize email headers
    $headers = implode("\r\n", $headers);
    
    // Additional mail parameters
    $params = "-f support@cybaemtech.com";
    
    try {
        // Enable error logging
        error_log("[Email] Attempting to send email to: $to");
        error_log("[Email] Subject: $subject");
        
        // Send email with enhanced parameters
        $success = mail($to, $subject, $body, $headers, $params);
        
        if ($success) {
            error_log("[Email] Successfully sent email to: $to");
            return true;
        } else {
            $error = error_get_last();
            error_log("[Email] Failed to send email to: $to");
            error_log("[Email] Error: " . ($error['message'] ?? 'Unknown error'));
            return false;
        }
    } catch (Exception $e) {
        error_log("[Email] Exception while sending email: " . $e->getMessage());
        error_log("[Email] Failed attempt to: $to");
        return false;
    }
}

/**
 * Send verification email using enhanced email sending
 */
function sendEnhancedVerificationEmail($email, $name, $username, $verificationLink) {
    $subject = "🔐 Verify Your Email - ITSM Helpdesk Portal";
    
    // Load template
    $template = file_get_contents(__DIR__ . '/templates/verification.html');
    
    if (!$template) {
        // Use fallback template if file not found
        $template = getBasicVerificationTemplate();
    }
    
    // Replace placeholders
    $replacements = [
        '{{name}}' => htmlspecialchars($name),
        '{{username}}' => htmlspecialchars($username),
        '{{verificationLink}}' => htmlspecialchars($verificationLink),
        '{{year}}' => date('Y')
    ];
    
    $message = str_replace(array_keys($replacements), array_values($replacements), $template);
    
    // Add List-Unsubscribe header for better deliverability
    $extras = [
        'headers' => [
            'List-Unsubscribe: <mailto:unsubscribe@cybaemtech.com>',
            'Precedence: bulk',
            'Auto-Submitted: auto-generated'
        ]
    ];
    
    return sendEnhancedEmail($email, $subject, $message, $extras);
}

/**
 * Basic verification email template
 */
function getBasicVerificationTemplate() {
    return '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - ITSM Helpdesk</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #4f46e5;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
            }
            .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Email Verification</h1>
            <p>Hello {{name}},</p>
            <p>Thank you for registering with the ITSM Helpdesk Portal. Please verify your email address to activate your account.</p>
            <p><strong>Username:</strong> {{username}}</p>
            <div style="text-align: center;">
                <a href="{{verificationLink}}" class="button">Verify Email Address</a>
            </div>
            <p style="font-size: 13px;">
                Or copy and paste this URL in your browser:<br>
                {{verificationLink}}
            </p>
            <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p>If you did not create an account, you can safely ignore this email.</p>
                <p>&copy; {{year}} ITSM Helpdesk Portal</p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Send welcome email after verification
 */
function sendEnhancedWelcomeEmail($email, $name, $username) {
    $subject = "🎉 Welcome to ITSM Helpdesk Portal!";
    
    // Load template
    $template = file_get_contents(__DIR__ . '/templates/welcome.html');
    
    if (!$template) {
        // Use fallback template if file not found
        $template = getBasicWelcomeTemplate();
    }
    
    // Replace placeholders
    $replacements = [
        '{{name}}' => htmlspecialchars($name),
        '{{username}}' => htmlspecialchars($username),
        '{{year}}' => date('Y')
    ];
    
    $message = str_replace(array_keys($replacements), array_values($replacements), $template);
    
    // Add email list headers
    $extras = [
        'headers' => [
            'List-Unsubscribe: <mailto:unsubscribe@cybaemtech.com>',
            'Precedence: bulk',
            'Auto-Submitted: auto-generated'
        ]
    ];
    
    return sendEnhancedEmail($email, $subject, $message, $extras);
}

/**
 * Basic welcome email template
 */
function getBasicWelcomeTemplate() {
    return '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ITSM Helpdesk</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #4f46e5;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
            }
            .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to ITSM Helpdesk!</h1>
            <p>Hello {{name}},</p>
            <p>Your account has been successfully verified. You can now access all features of the ITSM Helpdesk Portal.</p>
            <p><strong>Username:</strong> {{username}}</p>
            <div style="text-align: center;">
                <a href="https://itsm.cybaemtech.app/auth" class="button">Access Portal</a>
            </div>
            <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p>&copy; {{year}} ITSM Helpdesk Portal</p>
            </div>
        </div>
    </body>
    </html>';
}

?>