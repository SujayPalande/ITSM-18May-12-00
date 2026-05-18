<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Adjust this path if needed!
require_once __DIR__ . '/../php/api/config/database.php';

header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Category name is required."]);
        exit;
    }

    $name = $data['name'];
    $parent_id = isset($data['parent_id']) ? $data['parent_id'] : null;

    $query = "INSERT INTO categories (name, parent_id) VALUES (?, ?)";
    $stmt = $pdo->prepare($query);

    try {
        $stmt->execute([$name, $parent_id]);
        $newCategoryId = $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            "id" => $newCategoryId,
            "name" => $name,
            "parent_id" => $parent_id
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "error" => "Failed to add category.",
            "details" => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed."]);
}