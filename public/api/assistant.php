<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$backend = dirname(__DIR__, 2) . '/server/bootstrap.php';
if (!is_file($backend)) {
    http_response_code(503);
    echo json_encode(['error' => 'Chat is temporarily unavailable. Please email contact@reasadazim.com.']);
    exit;
}
require $backend;
