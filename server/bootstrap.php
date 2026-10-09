<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

try {
    $config = require __DIR__ . '/config.example.php';
    if (is_file(__DIR__ . '/config.local.php')) $config = array_replace($config, require __DIR__ . '/config.local.php');
    foreach (['GEMINI_API_KEY' => 'gemini_api_key', 'GEMINI_MODEL' => 'gemini_model', 'SMTP_HOST' => 'smtp_host', 'SMTP_USERNAME' => 'smtp_username', 'SMTP_PASSWORD' => 'smtp_password', 'SMTP_FROM' => 'smtp_from', 'SMTP_PORT' => 'smtp_port', 'SMTP_ENCRYPTION' => 'smtp_encryption'] as $environment => $key) {
        $value = getenv($environment);
        if ($value !== false && $value !== '') $config[$key] = $value;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && !in_array($origin, $config['allowed_origins'], true)) throw new AssistantError('This origin is not allowed.', 403);
    session_name('portfolio_assistant');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (!isset($_SESSION['started']) || time() - $_SESSION['started'] > 7200) {
        session_regenerate_id(true);
        $_SESSION = ['started' => time(), 'csrf' => bin2hex(random_bytes(32)), 'history' => []];
    }
    if (($_SESSION['provider'] ?? '') !== 'gemini-private-enquiry-v1') {
        $_SESSION['history'] = []; // Do not forward old-provider conversations to Gemini.
        $_SESSION['provider'] = 'gemini-private-enquiry-v1';
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET') {
        respond(['csrf' => $_SESSION['csrf'], 'aiReady' => !empty($config['gemini_api_key']), 'emailReady' => emailReady($config), 'history' => $_SESSION['history'], 'draft' => ($_SESSION['draft']['status'] ?? '') === 'draft' && time() - $_SESSION['draft']['created'] <= 900 ? $_SESSION['draft'] : null]);
    }
    if ($method !== 'POST') throw new AssistantError('Method not allowed.', 405);
    if (!$origin) throw new AssistantError('A same-site origin is required.', 403);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 24000) throw new AssistantError('Your message is too long.', 413);
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) throw new AssistantError('JSON is required.', 415);
    $raw = file_get_contents('php://input', false, null, 0, 24001);
    if (strlen($raw) > 24000) throw new AssistantError('Your message is too long.', 413);
    try { $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException $error) { throw new AssistantError('Invalid request.'); }
    if (!is_array($body)) throw new AssistantError('Invalid request.');
    if (!is_string($body['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $body['csrf'])) throw new AssistantError('Your session expired. Please reopen the chat.', 403);
    $action = $body['action'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $runtime = __DIR__ . '/runtime';
    if ($action === 'reset') {
        $_SESSION['history'] = [];
        unset($_SESSION['draft']);
        respond(['ok' => true]);
    }
    if ($action === 'prepare') {
        consumeLimit($runtime, 'prepare-minute:' . $ip, 12, 60);
        if (!empty($body['website'])) throw new AssistantError('Invalid enquiry.');
        $_SESSION['draft'] = draftEnquiry($body);
        respond(['draft' => $_SESSION['draft']]);
    }
    if ($action === 'send') {
        $draft = $_SESSION['draft'] ?? null;
        if (!$draft || !is_string($body['draftId'] ?? null) || !hash_equals($draft['id'], $body['draftId'])) throw new AssistantError('Please prepare and review your enquiry first.');
        if (($body['consent'] ?? false) !== true) throw new AssistantError('Please approve sending this enquiry first.');
        if ($draft['status'] === 'sent') respond(['sent' => true]); // Idempotent duplicate click/retry.
        if (time() - $draft['created'] > 900) throw new AssistantError('This draft expired. Please review a new draft.');
        if ($draft['status'] !== 'draft') throw new AssistantError('Delivery could not be confirmed. Please email Reasad directly.', 409);
        if (!emailReady($config)) throw new AssistantError('Email delivery is temporarily unavailable. Please email Reasad directly.', 503);
        consumeLimit($runtime, 'email-day:' . $ip, (int)$config['daily_email_limit_per_ip'], 86400);
        consumeLimit($runtime, 'email-global', 100, 86400);
        $_SESSION['draft']['status'] = 'sending';
        try { deliverEnquiry($draft, $config); }
        catch (Throwable $error) {
            $_SESSION['draft']['status'] = 'unconfirmed';
            error_log('Portfolio assistant: SMTP delivery could not be confirmed.');
            throw new AssistantError('Delivery could not be confirmed. Please email contact@reasadazim.com directly.', 503);
        }
        $_SESSION['draft']['status'] = 'sent';
        respond(['sent' => true]);
    }
    if ($action !== 'chat') throw new AssistantError('Unknown action.');
    $message = $body['message'] ?? '';
    if (!is_string($message) || mb_strlen(trim($message)) < 1 || mb_strlen($message) > 2000) throw new AssistantError('Please enter a question of up to 2000 characters.');
    validateChatMessage($message);
    if (empty($config['gemini_api_key'])) throw new AssistantError('AI chat is currently offline. Please send an enquiry or email contact@reasadazim.com.', 503);
    consumeLimit($runtime, 'chat-minute:' . $ip, 12, 60);
    consumeLimit($runtime, 'chat-day:' . $ip, (int)$config['daily_chat_limit_per_ip'], 86400);
    consumeLimit($runtime, 'chat-global', (int)$config['daily_chat_limit_global'], 86400);
    $knowledge = json_decode(file_get_contents(__DIR__ . '/knowledge.json'), true, 64, JSON_THROW_ON_ERROR);
    $result = runAgent(trim($message), $_SESSION['history'], $config, $knowledge, fn(array $payload) => requestGemini($payload, $config));
    $_SESSION['history'] = $result['history'];
    respond(['reply' => $result['reply'], 'enquiryRequested' => $result['enquiryRequested']]);
} catch (AssistantError $error) {
    respond(['error' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log('Portfolio assistant: backend request failed.');
    respond(['error' => 'The assistant is temporarily unavailable. Please email contact@reasadazim.com.'], 503);
}
