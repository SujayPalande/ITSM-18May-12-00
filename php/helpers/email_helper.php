<?php
/**
 * Email Helper Functions
 * IT Helpdesk Portal - PHP Backend
 */

function sendEmail($to, $subject, $message, $fromName = 'ITSM Helpdesk') {
    // Email Headers for better deliverability, especially for Gmail
    $headers = array(
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . $fromName . ' <support@cybaemtech.com>',
        'Reply-To: support@cybaemtech.com',
        'X-Mailer: PHP/' . phpversion(),
        'List-Unsubscribe: <mailto:unsubscribe@cybaemtech.com>',
        'Sender: support@cybaemtech.com',
        'Return-Path: support@cybaemtech.com',
        'X-Priority: 1',
        'X-MSMail-Priority: High',
        'Importance: High'
    );
    
    // Gmail and other providers often require proper SPF and DKIM records
    // Add Message-ID to help prevent spam classification
    $headers[] = 'Message-ID: <' . time() . '-' . md5($to . $subject) . '@cybaemtech.com>';
    
    // Convert array to string
    $headerStr = implode("\r\n", $headers);
    
    // Set additional parameters for better deliverability
    $parameters = '-f support@cybaemtech.com';
    
    try {
        // Send email with proper error handling
        if (!mail($to, $subject, $message, $headerStr, $parameters)) {
            error_log("Failed to send email to: $to");
            error_log("Mail error: " . error_get_last()['message']);
            return false;
        }
        return true;
    } catch (Exception $e) {
        error_log("Email error: " . $e->getMessage());
        return false;
    }
}

function getVerificationEmailTemplate($name, $username, $verificationLink) {
    return "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
                background-color: #2563eb; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 4px;
                display: inline-block;
                margin: 20px 0;
            }
            .footer { font-size: 12px; color: #666; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <h2>Welcome to ITSM Helpdesk Portal!</h2>
            <p>Hello $name,</p>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <p><strong>Username:</strong> $username</p>
            <p>Click the button below to verify your email:</p>
            <a href='$verificationLink' class='button'>Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p>$verificationLink</p>
            <div class='footer'>
                <p>If you didn't create this account, please ignore this email.</p>
                <p>&copy; " . date('Y') . " ITSM Helpdesk Portal. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>";
}