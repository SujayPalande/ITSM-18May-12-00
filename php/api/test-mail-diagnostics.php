<?php
/**
 * Mail Diagnostics & Testing Page
 * Use this to test email sending and verify SPF/DKIM/DMARC setup
 * Access: /php/api/test-mail-diagnostics.php?to=yourgmail@gmail.com
 */

header('Content-Type: application/json');
require_once dirname(__DIR__) . '/lib/mailer.php';

$to = $_GET['to'] ?? ($_POST['to'] ?? null);
$action = $_GET['action'] ?? ($_POST['action'] ?? 'send');

if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'error' => 'Provide valid to=email address via GET/POST'
    ]);
    exit(1);
}

if ($action === 'send') {
    // Send a test email
    $subject = 'ITSM Mail Test - ' . date('Y-m-d H:i:s');
    $body = '<html><body>';
    $body .= '<h2>ITSM Mail Delivery Test</h2>';
    $body .= '<p>This email tests SPF, DKIM, and DMARC configuration.</p>';
    $body .= '<p><strong>If this arrived in your inbox (not spam):</strong></p>';
    $body .= '<ul>';
    $body .= '<li>SPF is likely passing</li>';
    $body .= '<li>DKIM may be configured (check email headers)</li>';
    $body .= '<li>DMARC policy is likely not rejecting</li>';
    $body .= '</ul>';
    $body .= '<p><strong>To verify authentication:</strong></p>';
    $body .= '<ol>';
    $body .= '<li>Open this email in Gmail</li>';
    $body .= '<li>Click the three dots (⋮) → Show original</li>';
    $body .= '<li>Look for "Authentication-Results" header</li>';
    $body .= '<li>Check for: spf=pass, dkim=pass, dmarc=pass</li>';
    $body .= '</ol>';
    $body .= '<p>Time sent: ' . date('c') . '</p>';
    $body .= '</body></html>';
    
    $result = send_mail($to, 'Test User', $subject, $body);
    
    $response = [
        'success' => !empty($result['success']),
        'message' => $result['success'] ? 'Email sent successfully' : 'Email send failed',
        'details' => $result
    ];
    
    if ($result['success']) {
        $response['next_steps'] = [
            'step1' => 'Check your email inbox (and spam folder) for the message',
            'step2' => 'Right-click the email and select "Show original" to view headers',
            'step3' => 'Look for "Authentication-Results" header to verify SPF/DKIM/DMARC',
            'logs' => 'Check php/logs/mail_debug.log for SMTP details'
        ];
    }
    
    echo json_encode($response);
} elseif ($action === 'verify-dns') {
    // Check DNS records (requires shell commands, may not work on all hosts)
    $domain = substr(strrchr($to, '@'), 1);
    $checks = [];
    
    // Check SPF
    $spf = @dns_get_record($domain, DNS_TXT);
    $spf_found = false;
    if ($spf) {
        foreach ($spf as $record) {
            if (strpos($record['txt'], 'v=spf1') === 0) {
                $spf_found = true;
                $checks['spf'] = ['status' => 'found', 'value' => $record['txt']];
                break;
            }
        }
    }
    if (!$spf_found) {
        $checks['spf'] = ['status' => 'not_found', 'message' => 'SPF record not found'];
    }
    
    // Check DKIM (common selectors)
    $selectors = ['default', 'selector1', 'selector2', 'mail'];
    $dkim_found = false;
    foreach ($selectors as $sel) {
        $dkim_domain = "$sel._domainkey.$domain";
        $dkim = @dns_get_record($dkim_domain, DNS_TXT);
        if ($dkim) {
            foreach ($dkim as $record) {
                if (strpos($record['txt'], 'v=DKIM1') === 0) {
                    $dkim_found = true;
                    $checks['dkim'] = ['status' => 'found', 'selector' => $sel, 'key_bits' => strlen($record['txt'])];
                    break 2;
                }
            }
        }
    }
    if (!$dkim_found) {
        $checks['dkim'] = ['status' => 'not_found', 'message' => 'DKIM record not found (checked: ' . implode(', ', $selectors) . ')'];
    }
    
    // Check DMARC
    $dmarc_domain = "_dmarc.$domain";
    $dmarc = @dns_get_record($dmarc_domain, DNS_TXT);
    $dmarc_found = false;
    if ($dmarc) {
        foreach ($dmarc as $record) {
            if (strpos($record['txt'], 'v=DMARC1') === 0) {
                $dmarc_found = true;
                $checks['dmarc'] = ['status' => 'found', 'value' => $record['txt']];
                break;
            }
        }
    }
    if (!$dmarc_found) {
        $checks['dmarc'] = ['status' => 'not_found', 'message' => 'DMARC record not found'];
    }
    
    echo json_encode([
        'success' => true,
        'domain' => $domain,
        'dns_checks' => $checks,
        'summary' => ($spf_found ? '✓' : '✗') . ' SPF | ' . ($dkim_found ? '✓' : '✗') . ' DKIM | ' . ($dmarc_found ? '✓' : '✗') . ' DMARC'
    ]);
} else {
    echo json_encode(['error' => 'Unknown action: ' . $action]);
}

?>
