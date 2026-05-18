<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$clientId = '1000.CFIWRF48S1PT77W3RL88VX8N25QC5R';
$clientSecret = 'd78edf6ecffa8461f593e884268d77af350134e924';
$code = '1000.8b1d3e2aee6fc4ce5d93a8f38980fc52.8df360d77194c8b4c002069b6e8e6a54';

$url = "https://accounts.zoho.in/oauth/v2/token";
$params = [
    'code' => $code,
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'grant_type' => 'authorization_code'
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($params),
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

echo "EXCHANGE_RESPONSE: " . $response . "\n";
