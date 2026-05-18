<?php
// Simple test endpoint for cPanel deployment verification
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

$response = [
    "status" => "success",
    "message" => "ITSM API is working on cPanel",
    "timestamp" => date("Y-m-d H:i:s"),
    "php_version" => PHP_VERSION,
    "server_software" => $_SERVER["SERVER_SOFTWARE"] ?? "Unknown",
    "session_status" => session_status() === PHP_SESSION_ACTIVE ? "active" : "inactive"
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>