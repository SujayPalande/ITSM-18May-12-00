<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    include 'tickets.php';
} catch (Throwable $e) {
    echo "<h1>PROXY CAUGHT ERROR</h1>";
    echo "<pre>";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString();
    echo "</pre>";
}
