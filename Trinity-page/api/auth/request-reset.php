<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Solicitar reset de contraseña
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\AuthService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    $body = Request::body();
    return (new AuthService())->requestPasswordReset(trim((string) ($body['email'] ?? '')));
});
