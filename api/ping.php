<?php
// Simple diagnostic endpoint to help verify deployment paths and permissions.
header('Content-Type: application/json');

$baseDir = __DIR__; // should be php/api
$reportFile = $baseDir . '/project-bug-reports.php';
$configFile = dirname(__DIR__) . '/config/database.php';
$uploadsDir = dirname(__DIR__) . '/uploads/bug-screenshots/';

$response = [
    'ok' => true,
    'report_file_path' => $reportFile,
    'report_exists' => file_exists($reportFile),
    'config_file_path' => $configFile,
    'config_exists' => file_exists($configFile),
    'uploads_dir' => $uploadsDir,
    'uploads_exists' => is_dir($uploadsDir),
    'uploads_writable' => is_dir($uploadsDir) ? is_writable($uploadsDir) : null,
    'php_version' => phpversion(),
    'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : null,
];

echo json_encode($response);
