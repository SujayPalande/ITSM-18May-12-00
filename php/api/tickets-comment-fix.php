<?php
// Hotpatch for REST-style comment POST routing
// Include this file at the top of tickets.php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/api/tickets', PHP_URL_PATH);
    $pathParts = explode('/', trim($path, '/'));
    // Detect /api/tickets/{id}/comments POST
    if (count($pathParts) >= 4 && $pathParts[2] === 'comments' && is_numeric($pathParts[1])) {
        // Load request body
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $request = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $request = $_POST ?? [];
        }
        handleCreateComment($pathParts[1], $request);
        exit;
    }
}
