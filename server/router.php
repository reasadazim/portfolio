<?php
// Local API server. Only this endpoint is exposed; private PHP/configuration files are never served.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/api/assistant.php') {
    require dirname(__DIR__) . '/public/api/assistant.php';
    return;
}
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found.']);
