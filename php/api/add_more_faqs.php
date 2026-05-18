<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDb();
    
    $faqs = [
        [
            'question' => 'How to setup MFA (Multi-Factor Authentication)?',
            'answer' => "1. Download 'Microsoft Authenticator' on your mobile device.\n2. Log in to your company portal.\n3. Go to Security Info > Add Method > Authenticator App.\n4. Scan the QR code shown on your screen with the app.\n5. Complete the verification test.",
            'category' => 'Security'
        ],
        [
            'question' => 'Teams showing "Offline" even when I am online',
            'answer' => 'Go to Settings > General and ensure "Register Teams as the chat app for Office" is checked. Then, sign out and sign back in. If it persist, clear Teams cache in %appdata%\Microsoft\Teams.',
            'category' => 'Software'
        ],
        [
            'question' => 'How can I request a new peripheral (Keyboard/Mouse)?',
            'answer' => 'Low-cost peripherals can be ordered directly through the Internal IT Portal under the "Hardware Request" tab. No manager approval is needed for items under $50. Once requested, pick it up from the IT desk.',
            'category' => 'Hardware'
        ],
        [
            'question' => 'Wi-Fi keeps disconnecting on MacBook',
            'answer' => 'Go to System Settings > Network > Wi-Fi > Details... > Forget this network. Then, reconnect to Corporate-Secure. If it continues, go to Advanced and ensure your IP is handled by DHCP.',
            'category' => 'Network'
        ],
        [
            'question' => 'I cannot see the "HR" folder on the Shared Drive',
            'answer' => 'Access to sensitive folders like HR requires specific AD group membership. Please have your department head submit a "Folder Access Request" ticket. Once approved, the folder will automatically map within 60 minutes.',
            'category' => 'Security'
        ],
        [
            'question' => 'How to archive old emails in Outlook?',
            'answer' => 'Use the "AutoArchive" feature. Go to File > Options > Advanced > AutoArchive Settings. Choose a frequency and a local .pst file path. This will keep your primary mailbox under the 50GB limit.',
            'category' => 'Software'
        ],
        [
            'question' => 'Printer Jam - How to fix?',
            'answer' => 'Open the front panel and follow the numbered steps on the internal sticker. Pull the paper SLOWLY in the direction of the rollers to avoid tearing. Once cleared, wait for the self-test to complete.',
            'category' => 'Hardware'
        ],
        [
            'question' => 'Can I use my personal mobile for work email?',
            'answer' => 'Yes, provided you install the "Intune Company Portal" app. This creates a "Work Profile" that isolates company data from your personal data. IT only has control over the work profile, not your personal photos or apps.',
            'category' => 'Security'
        ],
        [
            'question' => 'Excel file is slow and freezing',
            'answer' => 'This usually happens due to excessive formatting or external links. Try saving the file as .xlsb (Binary format) to reduce size. Also, check for "Invisible" objects using the Selection Pane and remove them.',
            'category' => 'Software'
        ],
        [
            'question' => 'Guest Wi-Fi password?',
            'answer' => 'The Guest Wi-Fi password changes weekly. You can find the current 8-digit code on the digital signage in the reception area or by asking our virtual assistant on Slack/Teams.',
            'category' => 'Network'
        ],
        [
            'question' => 'Zoom vs Teams - which one should I use?',
            'answer' => 'Teams is our primary collaboration tool for internal meetings. Use Zoom only for external client calls if specifically requested by the client. Both are pre-installed on all corporate laptops.',
            'category' => 'Software'
        ],
        [
            'question' => 'How to clean my laptop screen?',
            'answer' => 'Use a dry microfiber cloth only. For stubborn smudges, use a 70% isopropyl alcohol solution applied to the CLOTH (never directly to the screen). Avoid using water or window cleaners.',
            'category' => 'Hardware'
        ]
    ];

    echo "Adding even more FAQs...\n";
    $count = 0;
    foreach ($faqs as $faq) {
        $cat = $db->fetchOne("SELECT id FROM categories WHERE name = ? OR name LIKE ?", [$faq['category'], '%' . $faq['category'] . '%']);
        
        if ($cat) {
            $exists = $db->fetchOne("SELECT id FROM faqs WHERE question = ?", [$faq['question']]);
            if (!$exists) {
                $db->query(
                    "INSERT INTO faqs (question, answer, category_id, created_at) VALUES (?, ?, ?, NOW())",
                    [$faq['question'], $faq['answer'], $cat['id']]
                );
                $count++;
            }
        }
    }
    
    echo "Added $count new FAQs.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
