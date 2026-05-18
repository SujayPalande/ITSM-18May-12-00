<?php
/**
 * QUICK FIX: Create allowed_domains table and fix 500 error
 * Upload this file to your server and run it ONCE
 */

header('Content-Type: text/plain');

echo "=== DOMAINS TABLE CREATION SCRIPT ===\n\n";

try {
    // Include database connection
    require_once 'php/config/database.php';
    $db = getDb();
    
    echo "✅ Database connected successfully\n";
    
    // Check if table exists
    $tableCheck = $db->fetchOne("SHOW TABLES LIKE 'allowed_domains'");
    
    if (!$tableCheck) {
        echo "📋 Creating allowed_domains table...\n";
        
        $createSQL = "
        CREATE TABLE `allowed_domains` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `domain` VARCHAR(255) NOT NULL UNIQUE,
            `company_name` VARCHAR(255) NOT NULL,
            `description` TEXT NULL,
            `is_active` BOOLEAN DEFAULT TRUE,
            `created_by_id` INT(11) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX `idx_domain` (`domain`),
            INDEX `idx_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $db->query($createSQL);
        echo "✅ Table created successfully!\n";
    } else {
        echo "✅ Table already exists\n";
    }
    
    // Check domain count
    $count = $db->fetchOne("SELECT COUNT(*) as count FROM allowed_domains");
    
    if ($count['count'] == 0) {
        echo "📋 Adding default domains...\n";
        
        $domains = [
            ['cybaemtech.in', 'Cybaemtech India'],
            ['logenix.in', 'Logenix India'],
            ['gmail.com', 'Gmail Users (Test)']
        ];
        
        foreach ($domains as $domainData) {
            $db->insert('allowed_domains', [
                'domain' => $domainData[0],
                'company_name' => $domainData[1],
                'description' => 'Auto-added default domain',
                'created_by_id' => 1,
                'is_active' => 1
            ]);
            echo "✅ Added: {$domainData[0]}\n";
        }
    } else {
        echo "✅ Table has {$count['count']} domains\n";
    }
    
    // Show current domains
    echo "\n=== CURRENT DOMAINS ===\n";
    $domains = $db->fetchAll("SELECT domain, company_name, is_active FROM allowed_domains ORDER BY domain");
    
    foreach ($domains as $domain) {
        $status = $domain['is_active'] ? 'ACTIVE' : 'INACTIVE';
        echo "- {$domain['domain']} ({$domain['company_name']}) [{$status}]\n";
    }
    
    echo "\n🎉 SUCCESS! Domain management is now ready.\n";
    echo "📱 You can now add domains through Settings → Domains\n";
    echo "🗑️  DELETE this file after running for security\n";
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "📍 Location: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\n🔧 TROUBLESHOOTING:\n";
    echo "- Check database connection settings\n";
    echo "- Verify database user has CREATE TABLE permissions\n";
    echo "- Check server error logs for more details\n";
}
?>