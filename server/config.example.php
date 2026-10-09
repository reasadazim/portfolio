<?php
// Optional PHP backend only. The Node.js backend uses server/.env instead.
// Copy to server/config.local.php for a fresh setup and fill in your settings.
// This file is also the PHP backend's default config: keep credentials blank here.
// Never put real secrets in this template, public/, dist/, or source control.
return [
    // Your Gemini API key and a model available to your project.
    'gemini_api_key' => '',
    'gemini_model' => 'gemini-3.8-flash',
    // Exact frontend origins (no trailing slash); add your own HTTPS domain.
    'allowed_origins' => ['https://reasadazim.com', 'https://www.reasadazim.com', 'http://127.0.0.1:8091', 'http://127.0.0.1:8092'],
    // SMTP host, for example mail.example.com.
    'smtp_host' => '',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls', // tls (STARTTLS, 587) or ssl (implicit TLS, 465)
    'smtp_username' => '', // Usually a mailbox such as contact@example.com.
    'smtp_password' => '',
    'smtp_from' => '', // Authorized sender, e.g. contact@example.com; not a recipient.
    // Positive integers controlling daily usage.
    'daily_chat_limit_per_ip' => 80,
    'daily_chat_limit_global' => 1000,
    'daily_email_limit_per_ip' => 3,
];
