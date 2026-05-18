<?php
/**
 * ITSM Setup Utility
 * This script creates the uploads directory and sets correct permissions
 */

// Set headers for HTML response
header('Content-Type: text/html; charset=utf-8');

// Define paths
$baseDir = dirname(__DIR__);
$uploadsDir = $baseDir . '/uploads';
$results = [];

// Create uploads directory if it doesn't exist
if (!is_dir($uploadsDir)) {
    $created = mkdir($uploadsDir, 0755, true);
    $results['create_uploads'] = [
        'action' => 'Create uploads directory',
        'status' => $created ? 'SUCCESS' : 'FAILED',
        'path' => $uploadsDir
    ];
} else {
    $results['create_uploads'] = [
        'action' => 'Check uploads directory',
        'status' => 'EXISTS',
        'path' => $uploadsDir
    ];
}

// Set uploads directory permissions
$chmodResult = chmod($uploadsDir, 0755);
$results['chmod_uploads'] = [
    'action' => 'Set uploads directory permissions (755)',
    'status' => $chmodResult ? 'SUCCESS' : 'FAILED',
    'path' => $uploadsDir,
    'permissions' => sprintf('%o', fileperms($uploadsDir) & 0777)
];

// Create a test file in uploads directory to verify write permissions
$testFile = $uploadsDir . '/test_write.txt';
$writeTest = file_put_contents($testFile, 'Test file to verify write permissions. ' . date('Y-m-d H:i:s'));
$results['write_test'] = [
    'action' => 'Test write to uploads directory',
    'status' => $writeTest !== false ? 'SUCCESS' : 'FAILED',
    'bytes_written' => $writeTest
];

// Get directory information
$dirInfo = [
    'owner' => function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($uploadsDir))['name'] : 'Unknown',
    'group' => function_exists('posix_getgrgid') ? posix_getgrgid(filegroup($uploadsDir))['name'] : 'Unknown',
    'permissions' => sprintf('%o', fileperms($uploadsDir) & 0777),
    'is_writable' => is_writable($uploadsDir) ? 'Yes' : 'No'
];

// Output HTML report
echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ITSM Directory Setup</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .success { color: green; font-weight: bold; }
        .failed { color: red; font-weight: bold; }
        .exists { color: blue; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #5bc0de; padding: 15px; margin: 20px 0; }
        .command-box { background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>ITSM Directory Setup</h1>
    
    <h2>Setup Results</h2>
    <table>
        <tr>
            <th>Action</th>
            <th>Status</th>
            <th>Details</th>
        </tr>';

foreach ($results as $result) {
    $statusClass = strtolower($result['status']) === 'success' ? 'success' : 
                  (strtolower($result['status']) === 'exists' ? 'exists' : 'failed');
    
    echo '<tr>
            <td>' . htmlspecialchars($result['action']) . '</td>
            <td class="' . $statusClass . '">' . htmlspecialchars($result['status']) . '</td>
            <td>' . htmlspecialchars(isset($result['path']) ? $result['path'] : '') . '</td>
          </tr>';
}

echo '</table>

    <h2>Directory Information</h2>
    <table>
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Path</td><td>' . htmlspecialchars($uploadsDir) . '</td></tr>
        <tr><td>Owner</td><td>' . htmlspecialchars($dirInfo['owner']) . '</td></tr>
        <tr><td>Group</td><td>' . htmlspecialchars($dirInfo['group']) . '</td></tr>
        <tr><td>Permissions</td><td>' . htmlspecialchars($dirInfo['permissions']) . '</td></tr>
        <tr><td>Is Writable</td><td>' . htmlspecialchars($dirInfo['is_writable']) . '</td></tr>
    </table>
    
    <div class="info-box">
        <h3>If Permissions Still Fail</h3>
        <p>If the directory still isn\'t writable after running this script, you need to set permissions using SSH or your cPanel File Manager.</p>
        
        <h4>Using SSH:</h4>
        <div class="command-box">
            chmod -R 755 ' . htmlspecialchars($uploadsDir) . '<br>
            chown -R ' . htmlspecialchars($dirInfo['owner']) . ':' . htmlspecialchars($dirInfo['group']) . ' ' . htmlspecialchars($uploadsDir) . '
        </div>
        
        <h4>Using cPanel File Manager:</h4>
        <ol>
            <li>Go to File Manager in cPanel</li>
            <li>Navigate to the uploads directory</li>
            <li>Right-click on the directory and select "Change Permissions"</li>
            <li>Set permissions to 755 (rwxr-xr-x)</li>
            <li>Make sure "Recurse into subdirectories" is checked</li>
            <li>Click "Change Permissions"</li>
        </ol>
    </div>
</body>
</html>';
?>
