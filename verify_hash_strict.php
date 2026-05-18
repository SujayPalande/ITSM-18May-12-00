<?php
$hash = '$2y$10$R3FtlmSo93Kv3qzUWAHLlO1DtrUrd6Vhbt47my3NeP9InG3mt0.TO';
$pass = 'password123';
echo "Checking 'password123': " . (password_verify($pass, $hash) ? 'YES' : 'NO') . "\n";
$pass = 'admin123';
echo "Checking 'admin123': " . (password_verify($pass, $hash) ? 'YES' : 'NO') . "\n";
$pass = 'itsm@123';
echo "Checking 'itsm@123': " . (password_verify($pass, $hash) ? 'YES' : 'NO') . "\n";
?>
