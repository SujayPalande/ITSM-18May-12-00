<?php
require_once '../config/database.php';

try {
    $db = getDb();
    
    // Get existing categories to map correctly
    $categories = $db->fetchAll("SELECT id, name FROM categories");
    $catMap = [];
    foreach ($categories as $cat) {
        $catMap[strtolower($cat['name'])] = $cat['id'];
    }

    // Ensure we have some base categories if they don't exist
    $standardCats = ['Software', 'Hardware', 'Network', 'Account', 'Security', 'Email', 'Infrastructure'];
    foreach ($standardCats as $catName) {
        if (!isset($catMap[strtolower($catName)])) {
            $id = $db->insert('categories', ['name' => $catName]);
            $catMap[strtolower($catName)] = $id;
        }
    }

    $faqs = [
        // Software
        ['question' => 'How do I reset my Windows password?', 'answer' => "1. Press Ctrl+Alt+Del\n2. Select 'Change a password'\n3. Enter your old password and the new password twice.\n4. If you've forgotten your password, please use the self-service portal at https://reset.company.com", 'cat' => 'software'],
        ['question' => 'Microsoft Teams is crashing on startup', 'answer' => "Try clearing the Teams cache:\n1. Quit Teams completely.\n2. Go to %appdata%\\Microsoft\\Teams and delete all files in that folder.\n3. Restart Teams.", 'cat' => 'software'],
        ['question' => 'How to install the latest VPN client?', 'answer' => "The latest GlobalProtect VPN client is available in the Company Portal app. Open Company Portal from your Start menu, search for 'VPN', and click Install.", 'cat' => 'software'],
        ['question' => 'Where can I find the MS Office license key?', 'answer' => "Office 365 is licensed via your corporate email login. Simply sign in with your email address in any Office app (Word/Excel) to activate.", 'cat' => 'software'],
        ['question' => 'My browser is slow and shows ads', 'answer' => "You might have unwanted extensions. Go to Settings > Extensions and remove any you don't recognize. We recommend using Google Chrome or Microsoft Edge.", 'cat' => 'software'],
        
        // Hardware
        ['question' => 'My laptop screen is flickering', 'answer' => "1. Check if the flickering happens in BIOS. If yes, it's a hardware issue.\n2. Update your graphics drivers via Windows Update.\n3. If it persists, visit the IT desk for a hardware diagnostic.", 'cat' => 'hardware'],
        ['question' => 'Printer is showing "Paper Jam" but there is none', 'answer' => "1. Open and close all trays and covers.\n2. Gently clean the rollers with a lint-free cloth.\n3. Perform a power cycle by unplugging the printer for 60 seconds.", 'cat' => 'hardware'],
        ['question' => 'External monitor is not detected', 'answer' => "1. Ensure the HDMI/DisplayPort cable is firmly plugged in.\n2. Press Win+P and select 'Extend'.\n3. Check if the monitor is powered on and set to the correct input.", 'cat' => 'hardware'],
        ['question' => 'Battery is not charging above 80%', 'answer' => "Many corporate laptops have 'Battery Lifespan' mode enabled in BIOS. This is normal and prevents battery wear. If you need 100% for travel, change the setting in the Power Manager app.", 'cat' => 'hardware'],
        
        // Network
        ['question' => 'What is the Guest Wi-Fi password?', 'answer' => "Guest Wi-Fi (Corp-Guest) uses a captive portal. Connect to the network and follow the prompts to register with your phone number for a temporary access code.", 'cat' => 'network'],
        ['question' => 'I cannot access the internal file share (Z: drive)', 'answer' => "1. Ensure you are connected to the corporate network or VPN.\n2. Open File Explorer and enter \\\\fileserver\\shared in the address bar.\n3. If prompted for credentials, use 'CORP\\username'.", 'cat' => 'network'],
        ['question' => 'VPN keeps disconnecting every hour', 'answer' => "This is usually due to session timeouts or poor internet stability. Ensure your home router is up to date and try using an Ethernet cable instead of Wi-Fi.", 'cat' => 'network'],
        ['question' => 'Slow internet speeds in the office', 'answer' => "If you are on Wi-Fi, try connecting to the 5GHz frequency. If you are on Ethernet, ensure the cable is CAT5e or higher. Report low signal areas to IT.", 'cat' => 'network'],
        
        // Security
        ['question' => 'How to report a suspicious email?', 'answer' => "Click the 'Report Phishing' button in the Outlook Ribbon. If you don't see it, forward the email as an attachment to security-ops@company.com", 'cat' => 'security'],
        ['question' => 'My account is locked out', 'answer' => "Accounts are locked after 5 failed attempts. Wait 15 minutes for automatic unlock, or use the self-service portal to reset your password and unlock now.", 'cat' => 'security'],
        ['question' => 'What is MFA and why do I need it?', 'answer' => "Multi-Factor Authentication (MFA) adds a second layer of security by requiring a code from your phone (Microsoft Authenticator) after you enter your password.", 'cat' => 'security'],
        ['question' => 'Lost my corporate laptop/phone', 'answer' => "IMMEDIATELY call the 24/7 Security Hotline at +1-800-555-0199 so we can remotely wipe the device and protect company data.", 'cat' => 'security'],
        
        // Email
        ['question' => 'Enabling "Out of Office" auto-reply', 'answer' => "In Outlook: File > Automatic Replies. In Web Outlook: Settings > View all Outlook settings > Mail > Automatic replies.", 'cat' => 'email'],
        ['question' => 'How to increase my mailbox size?', 'answer' => " mailbox limit is 50GB. If you are near the limit, use the 'Archive' folder to move older emails to cloud storage, or request an E5 license if your role requires more space.", 'cat' => 'email'],
        ['question' => 'Email search is not working locally', 'answer' => "Index might be corrupted. Go to Control Panel > Indexing Options > Advanced > Rebuild. This may take several hours to complete.", 'cat' => 'email'],
        ['question' => 'Cannot send large attachments', 'answer' => "Individual email limit is 25MB. For larger files, upload to OneDrive and share the link instead of attaching the file.", 'cat' => 'email'],
    ];

    $count = 0;
    foreach ($faqs as $faq) {
        $check = $db->fetchOne("SELECT id FROM faqs WHERE question = ?", [$faq['question']]);
        if (!$check) {
            $catId = $catMap[$faq['cat']] ?? null;
            $db->insert('faqs', [
                'question' => $faq['question'],
                'answer' => $faq['answer'],
                'category_id' => $catId,
                'view_count' => 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            $count++;
        }
    }

    echo "Successfully seeded " . $count . " new FAQs.";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
