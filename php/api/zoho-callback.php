<?php
/**
 * Zoho OAuth2 Callback Handler
 * Receives the grant token (code) and automatically exchanges it for a Refresh Token,
 * then saves it directly to the .env file.
 */

// Try multiple potential .env locations
$possiblePaths = [
    __DIR__ . '/../../.env',       // If running from root/php/api
    __DIR__ . '/../../../.env',    // If running from dist/php/api
    'C:/inetpub/wwwroot/ITSM 25Feb-16-00/.env' // Absolute fallback
];

$envFile = null;
foreach ($possiblePaths as $path) {
    if (file_exists($path)) {
        $envFile = $path;
        break;
    }
}

if ($envFile) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
} else {
    die("<h2>Critical Error</h2><p>Could not locate the .env file on the server.</p>");
}

$clientId = $_ENV['ZOHO_CLIENT_ID'] ?? '';
$clientSecret = $_ENV['ZOHO_CLIENT_SECRET'] ?? '';

if (empty($clientId) || empty($clientSecret)) {
    die("<h2>Error</h2><p>ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET is missing in the .env file.</p>");
}

if (!isset($_GET['code'])) {
    die("<h2>Error</h2><p>No authorization code received from Zoho.</p>");
}

$code = $_GET['code'];

// Exchange code for refresh token (Using .in domain based on user's registration)
$url = "https://accounts.zoho.in/oauth/v2/token";
$params = [
    'code' => $code,
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri' => 'https://itsm.cybaemtech.app/php/api/zoho-callback.php',
    'grant_type' => 'authorization_code'
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($params),
        'ignore_errors' => true // so we can still get the response body on 4xx errors
    ]
];
$context = stream_context_create($options);

$response = @file_get_contents($url, false, $context);

if ($response === false) {
    die("<h2>Network Error</h2><p>Failed to connect to Zoho server.</p>");
}

$data = json_decode($response, true);

if (isset($data['refresh_token'])) {
    $refreshToken = $data['refresh_token'];
    
    // Write new refresh token to .env
    $envContent = file_get_contents($envFile);
    
    if (strpos($envContent, 'ZOHO_REFRESH_TOKEN=') !== false) {
        $envContent = preg_replace('/ZOHO_REFRESH_TOKEN=(.*)/', 'ZOHO_REFRESH_TOKEN=' . $refreshToken, $envContent);
    } else {
        $envContent .= "\nZOHO_REFRESH_TOKEN=" . $refreshToken . "\n";
    }
    
    file_put_contents($envFile, $envContent);
    
    echo "<h2>Success!</h2>";
    echo "<p>The Refresh Token has been successfully generated and saved to your .env file.</p>";
    echo "<p>You can now go back to the Site Engineering Admin Dashboard and click <strong>Sync from Zoho</strong>.</p>";
    echo '<a href="/site-engg" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:5px;">Go to Admin Dashboard</a>';
} else {
    echo "<h2>Error Exchanging Token</h2>";
    echo "<p>Response from Zoho:</p>";
    echo "<pre>" . htmlspecialchars(print_r($data, true)) . "</pre>";
    echo "<p>Please try generating the code again.</p>";
}
?>
