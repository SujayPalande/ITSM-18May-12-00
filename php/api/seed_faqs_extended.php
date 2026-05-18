<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDb();
    
    // Ensure categories exist or map them
    $categoryMap = [
        'VPN' => 'Network & Connectivity',
        'Network' => 'Network & Connectivity',
        'Hardware' => 'Hardware',
        'Software' => 'Software',
        'Security' => 'Security',
        'Email' => 'Software' // Fallback to software if Email category doesn't exist
    ];
    
    $faqs = [
        [
            'question' => 'How do I reset my VPN password?',
            'answer' => 'Navigate to the self-service portal at https://sso.example.com and select "Forgot Password". Follow the MFA prompts to reset your credentials. Note that VPN passwords sync with your primary AD account.',
            'category' => 'Network'
        ],
        [
            'question' => 'VPN connection drops every 2 hours. Why?',
            'answer' => 'Our security policy enforces a session re-authentication every 2 hours. Ensure you are using the latest GlobalProtect client version 6.1+. If issues persist, check your local ISP stability.',
            'category' => 'Network'
        ],
        [
            'question' => 'ERP System showing "License Limit Exceeded"',
            'answer' => 'This occurs when all concurrent sessions are in use. Usually, this happens if users do not log out properly. Please wait 10 minutes for the auto-timeout or contact IT to clear ghost sessions.',
            'category' => 'Software'
        ],
        [
            'question' => 'How to clear cache in the ITSM Portal?',
            'answer' => 'Press Ctrl + F5 for a hard refresh. For mobile apps, go to Settings > Apps > ITSM Tool > Storage and click "Clear Cache".',
            'category' => 'Software'
        ],
        [
            'question' => 'New Laptop setup guide',
            'answer' => '1. Connect to power. 2. Turn on. 3. Select "Work Account". 4. Log in with your company email. 5. Wait for Intune to install basic apps (Teams, Outlook, Chrome). This process takes ~20 minutes.',
            'category' => 'Hardware'
        ],
        [
            'question' => 'Monitor not detected on Docking Station',
            'answer' => 'Unplug the USB-C cable from your laptop, wait 5 seconds, and reconnect. Ensure the docking station power light is white. If orange, check the power adapter connection.',
            'category' => 'Hardware'
        ],
        [
            'question' => 'How to report a Phishing Email?',
            'answer' => 'Do not click any links. Select the email in Outlook and click the "Report Message" button in the top ribbon, then choose "Phishing". IT will automatically analyze and purge it if malicious.',
            'category' => 'Security'
        ],
        [
            'question' => 'Shared Mailbox not showing in Outlook',
            'answer' => 'Go to File > Account Settings > Account Settings. Select your email, click Change > More Settings > Advanced. Click "Add" and type the name of the shared mailbox. Click OK and restart Outlook.',
            'category' => 'Email'
        ],
        [
            'question' => 'Requesting software installation',
            'answer' => 'All software requests must go through the "Service Catalog" section. Once submitted, your manager will receive an approval notification. Upon approval, IT will push the software via Company Portal within 4 hours.',
            'category' => 'Software'
        ],
        [
            'question' => 'Slow internet speeds on Wi-Fi',
            'answer' => 'Ensure you are connected to the "Corporate-Secure" SSID and not "Guest". Stay within 30 feet of an Access Point. If speeds are still slow, forget the network and reconnect to refresh your DHCP lease.',
            'category' => 'Network'
        ],
        [
            'question' => 'BitLocker recovery key request',
            'answer' => 'If your device is locked, visit https://myaccount.microsoft.com on another device, go to "Devices", find your laptop, and select "View BitLocker Keys". Enter the 48-digit key on your laptop screen.',
            'category' => 'Security'
        ],
        [
            'question' => 'Printer showing "Offline"',
            'answer' => 'Go to Control Panel > Devices and Printers. Right-click your printer and ensure "Use Printer Offline" is UNCHECKED. If it persists, restart the "Print Spooler" service in Services.msc.',
            'category' => 'Hardware'
        ],
        [
            'question' => 'Outlook "Trying to Connect" error',
            'answer' => 'Check your internet connection. If connected, click "Work Offline" in the Send/Receive tab, wait 5 seconds, and click it again to reconnect. If it fails, restart Outlook in Safe Mode (Hold Ctrl while opening).',
            'category' => 'Email'
        ],
        [
            'question' => 'Getting authorized for Admin Rights',
            'answer' => 'Temporary local admin rights can be requested for 24 hours through the "PIM Request" portal. Provide a business justification and ticket number for the software you need to install.',
            'category' => 'Security'
        ],
        [
            'question' => 'Microsoft Teams microphone not working',
            'answer' => 'In Teams, click the 3 dots (...) next to your profile > Settings > Devices. Ensure the correct microphone is selected and click "Make a test call" to verify levels.',
            'category' => 'Software'
        ],
        [
            'question' => 'Broken screen or physical damage',
            'answer' => 'Bring the device to the IT bar immediately. Do not attempt to use as glass splinters may cause injury. We will provide a temporary loaner device while your primary unit is sent for repair.',
            'category' => 'Hardware'
        ]
    ];

    echo "Seeding extended FAQs...\n";
    $count = 0;
    foreach ($faqs as $faq) {
        $catName = $categoryMap[$faq['category']] ?? $faq['category'];
        $cat = $db->fetchOne("SELECT id FROM categories WHERE name = ?", [$catName]);
        
        if ($cat) {
            // Check if already exists
            $exists = $db->fetchOne("SELECT id FROM faqs WHERE question = ?", [$faq['question']]);
            if (!$exists) {
                // Use the query method for INSERT if execute is not defined to handle params
                $db->query(
                    "INSERT INTO faqs (question, answer, category_id, created_at) VALUES (?, ?, ?, NOW())",
                    [
                        $faq['question'],
                        $faq['answer'],
                        $cat['id']
                    ]
                );
                $count++;
            }
        }
    }
    
    echo "Successfully added $count extended FAQs.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
