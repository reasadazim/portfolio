<?php
// Copy to config.local.php in this private directory. Never put secrets in public/ or dist/.
return [
    'gemini_api_key' => '',
    'gemini_model' => 'gemini-3.8-flash',
    'allowed_origins' => ['https://reasadazim.com', 'https://www.reasadazim.com', 'http://127.0.0.1:8091', 'http://127.0.0.1:8092'],
    'smtp_host' => '',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls', // tls (STARTTLS, 587) or ssl (implicit TLS, 465)
    'smtp_username' => '',
    'smtp_password' => '',
    'smtp_from' => '', // A verified sender belonging to your SMTP account.
    'daily_chat_limit_per_ip' => 80,
    'daily_chat_limit_global' => 1000,
    'daily_email_limit_per_ip' => 3,
];
