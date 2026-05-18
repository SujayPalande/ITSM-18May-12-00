<?php
/**
 * Cron script to notify Admin & HR about engineers who haven't checked in today.
 * Suggested run time: 10:30 AM daily.
 */

require_once __DIR__ . '/../helpers/email_notifications.php';

$db = getDb();
$today = date('Y-m-d');

// 1. Get all active engineers
$engineers = $db->fetchAll("SELECT id, full_name, email FROM se_profiles WHERE role = 'engineer'");

// 2. Get today's check-ins
$checkIns = $db->fetchAll("SELECT engineer_id FROM se_check_ins WHERE date = ?", [$today]);
$checkedInIds = array_column($checkIns, 'engineer_id');

// 3. Find who hasn't checked in
$notCheckedIn = [];
foreach ($engineers as $eng) {
    if (!in_array($eng['id'], $checkedInIds)) {
        $notCheckedIn[] = $eng;
    }
}

if (empty($notCheckedIn)) {
    echo "All engineers have checked in today.\n";
    exit;
}

// 4. Prepare email content
$subject = "🚨 MISSING CHECK-IN ALERT: " . count($notCheckedIn) . " Engineers (" . $today . ")";

$content = "
<p>The following engineers have not checked in today as of " . date('h:i A') . ":</p>
<table style='width:100%; border-collapse: collapse; margin: 20px 0;'>
    <thead>
        <tr style='background: #f1f5f9; text-align: left;'>
            <th style='padding: 12px; border: 1px solid #e2e8f0;'>Engineer Name</th>
            <th style='padding: 12px; border: 1px solid #e2e8f0;'>Email</th>
        </tr>
    </thead>
    <tbody>";

foreach ($notCheckedIn as $eng) {
    $content .= "
        <tr>
            <td style='padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;'>{$eng['full_name']}</td>
            <td style='padding: 12px; border: 1px solid #e2e8f0; color: #64748b;'>{$eng['email']}</td>
        </tr>";
}

$content .= "
    </tbody>
</table>
<p style='color: #ef4444; font-weight: 600;'>Please check with them if they are on site or on unannounced leave.</p>";

$fullBody = generateEmailTemplate("Missing Check-in Alert", $content, "Daily Attendance Monitoring");

// 5. Send to Specific Recipients
$recipients = [
    ['email' => 'rohan@cybaemtech.com', 'name' => 'Rohan Bhosale'],
    ['email' => 'shivam.jagtap@cybaemtech.com', 'name' => 'Shivam Jagtap'],
    ['email' => 'support@cybaemtech.com', 'name' => 'ITSM Support']
];

foreach ($recipients as $r) {
    // Attempt to use the robust centralized mailer via the helper
    $res = send_mail($r['email'], $r['name'], $subject, $fullBody);
    if ($res['success']) {
        echo "Notification sent to {$r['name']} ({$r['email']})\n";
    } else {
        echo "Failed to send to {$r['name']}: " . $res['error'] . "\n";
    }
}
