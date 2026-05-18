<?php
// Mock session
session_name('ITSM_SESSION');
session_id('8716dec687662cfbee91c244b1f0d51a');
session_start();

$_SESSION['user_id'] = 47;
$_SESSION['user_role'] = 'admin,agent';
$_SESSION['user_email'] = 'shivam.jagtap@cybaemtech.com';

$_GET['type'] = '';
$_GET['action'] = '';
$_GET['dateRange'] = '30days';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/reports?dateRange=30days';

// Execute the report
require_once __DIR__ . '/reports.php';
