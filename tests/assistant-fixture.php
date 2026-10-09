<?php
declare(strict_types=1);
require dirname(__DIR__) . '/server/lib.php';
$input = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
$config = require dirname(__DIR__) . '/server/config.example.php';
try {
    switch ($input['operation']) {
        case 'validate':
            $result = validateEnquiry($input['details']);
            break;
        case 'agent':
            $requests = [];
            $responses = $input['responses'];
            $result = runAgent($input['message'], $input['history'] ?? [], $config, ['name' => 'Reasad Azim'], function (array $payload) use (&$requests, &$responses): array {
                $requests[] = $payload;
                return array_shift($responses);
            });
            $result['requests'] = $requests;
            break;
        case 'mailer':
            $config = array_replace($config, ['smtp_host' => 'smtp.example.test', 'smtp_username' => 'test', 'smtp_password' => 'dummy-for-unit-test', 'smtp_from' => 'sender@example.test']);
            $mail = createEnquiryMailer(draftEnquiry($input['details']), $config);
            $mail->preSend(); // Build the message without connecting to SMTP.
            $result = ['to' => $mail->getToAddresses(), 'replyTo' => $mail->getReplyToAddresses(), 'from' => $mail->From, 'html' => $mail->ContentType, 'body' => $mail->Body];
            break;
        case 'limit':
            $directory = __DIR__ . '/runtime-' . bin2hex(random_bytes(6));
            try {
                consumeLimit($directory, 'visitor', 1, 60);
                consumeLimit($directory, 'visitor', 1, 60);
            } finally {
                if (is_dir($directory)) {
                    foreach (glob($directory . '/*.json') as $file) unlink($file);
                    rmdir($directory);
                }
            }
            $result = [];
            break;
        default:
            throw new RuntimeException('Unknown test operation.');
    }
    echo json_encode($result, JSON_THROW_ON_ERROR);
} catch (AssistantError $error) {
    echo json_encode(['error' => $error->getMessage(), 'status' => $error->status], JSON_THROW_ON_ERROR);
}
