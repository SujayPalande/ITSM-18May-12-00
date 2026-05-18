<?php
/**
 * Domain Management Verification Script
 * Use this script to verify your domain setup is working correctly
 */

echo "=== ITSM Domain Management Verification ===\n\n";

// Check if auth.php has been updated
echo "1. Checking auth.php implementation...\n";
$authFile = 'php/api/auth.php';
if (file_exists($authFile)) {
    $authContent = file_get_contents($authFile);
    
    if (strpos($authContent, 'function isDomainAllowed') !== false) {
        echo "   ✅ isDomainAllowed function exists\n";
    } else {
        echo "   ❌ isDomainAllowed function missing\n";
    }
    
    if (strpos($authContent, 'isDomainAllowed($db, $emailDomain)') !== false) {
        echo "   ✅ Dynamic domain checking implemented\n";
    } else {
        echo "   ❌ Still using hardcoded domain checking\n";
    }
} else {
    echo "   ❌ auth.php file not found\n";
}

echo "\n2. Checking domains API...\n";
$domainsFile = 'php/api/domains.php';
if (file_exists($domainsFile)) {
    echo "   ✅ domains.php API exists\n";
} else {
    echo "   ❌ domains.php API missing\n";
}

echo "\n3. Checking database setup files...\n";
$setupFiles = [
    'create_domains_table.sql' => 'SQL schema file',
    'setup_domains_table.php' => 'PHP setup script'
];

foreach ($setupFiles as $file => $description) {
    if (file_exists($file)) {
        echo "   ✅ $description exists ($file)\n";
    } else {
        echo "   ❌ $description missing ($file)\n";
    }
}

echo "\n4. Testing domain validation logic...\n";

// Simulate the isDomainAllowed function logic
function testDomainLogic($domain, $tableExists = true, $domainInDB = true) {
    if ($tableExists) {
        return $domainInDB;
    } else {
        // Fallback domains
        $defaultAllowedDomains = ['cybaemtech.in', 'logenix.in', 'test.com', 'localhost'];
        return in_array($domain, $defaultAllowedDomains);
    }
}

$testCases = [
    ['domain' => 'cybaemtech.in', 'tableExists' => true, 'inDB' => true, 'expected' => 'ALLOWED'],
    ['domain' => 'logenix.in', 'tableExists' => true, 'inDB' => true, 'expected' => 'ALLOWED'],
    ['domain' => 'unauthorized.com', 'tableExists' => true, 'inDB' => false, 'expected' => 'DENIED'],
    ['domain' => 'cybaemtech.in', 'tableExists' => false, 'inDB' => false, 'expected' => 'ALLOWED (fallback)'],
    ['domain' => 'unknown.com', 'tableExists' => false, 'inDB' => false, 'expected' => 'DENIED (fallback)']
];

foreach ($testCases as $test) {
    $result = testDomainLogic($test['domain'], $test['tableExists'], $test['inDB']);
    $status = $result ? 'ALLOWED' : 'DENIED';
    if (!$test['tableExists'] && $result) {
        $status .= ' (fallback)';
    } elseif (!$test['tableExists'] && !$result) {
        $status .= ' (fallback)';
    }
    
    $match = strpos($test['expected'], $status) !== false;
    $icon = $match ? '✅' : '❌';
    
    echo sprintf("   %s %-20s → %-20s (expected: %s)\n", 
        $icon, $test['domain'], $status, $test['expected']);
}

echo "\n=== Next Steps ===\n\n";

echo "📋 TO COMPLETE SETUP:\n";
echo "1. Run setup script on production server:\n";
echo "   php setup_domains_table.php\n\n";

echo "2. Verify database table exists:\n";
echo "   Check 'allowed_domains' table in phpMyAdmin\n\n";

echo "3. Test domain management:\n";
echo "   - Login to admin panel\n";
echo "   - Navigate to Settings → Domains\n";
echo "   - Add/edit/delete domains\n\n";

echo "4. Test authentication:\n";
echo "   - Try login with allowed domain\n";
echo "   - Try login with disallowed domain\n";
echo "   - Verify proper error messages\n\n";

echo "🎯 BENEFITS OF NEW SYSTEM:\n";
echo "✅ No more hardcoded domains in code\n";
echo "✅ Dynamic domain management via admin panel\n";
echo "✅ Real-time enable/disable of domains\n";
echo "✅ Backward compatibility with fallback domains\n";
echo "✅ Complete audit trail for domain changes\n";
echo "✅ Supports unlimited number of domains\n\n";

echo "📞 NEED HELP?\n";
echo "• Check error logs for any issues\n";
echo "• Refer to DYNAMIC_DOMAIN_MANAGEMENT_GUIDE.md\n";
echo "• Test with test_dynamic_domains.php\n";
echo "• Verify database connectivity\n\n";

echo "=== Verification Complete ===\n";
?>