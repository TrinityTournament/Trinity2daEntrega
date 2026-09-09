<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Login (acepta email o número de teléfono)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\AuthService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');

    $body = Request::body();
    $service = new AuthService();

    return $service->login(
        trim((string) ($body['identifier'] ?? '')),
        (string) ($body['password'] ?? '')
    );
});
